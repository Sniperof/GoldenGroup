import { Router } from 'express';
import pool from '../db.js';
import { insertAuditLog } from '../utils/auditLog.js';
import { sanitizeText } from '../utils/sanitize.js';
import { requirePermission } from '../middleware/permission.js';

const router = Router();

function mapCourse(row: any) {
  return {
    id: row.id,
    trainingName: row.training_name,
    jobVacancyId: row.job_vacancy_id,
    branch: row.branch,
    deviceName: row.device_name,
    trainer: row.trainer,
    startDate: row.start_date,
    endDate: row.end_date,
    trainingStatus: row.training_status,
    notes: row.notes,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── GET /eligible/:jobVacancyId — eligible trainee picker (must be before /:id) ──
router.get('/eligible/:jobVacancyId', requirePermission('jobs.training.view_eligible'), async (req, res) => {
  try {
    const { jobVacancyId } = req.params;
    const { rows } = await pool.query(
      `SELECT ja.id AS "applicationId",
         a.first_name AS "firstName", a.last_name AS "lastName",
         a.mobile_number AS "mobileNumber",
         ja.application_status AS "applicationStatus"
       FROM job_applications ja
       JOIN applicants a ON a.id = ja.applicant_id
       WHERE ja.job_vacancy_id = $1
         AND ja.current_stage = 'Training'
         AND ja.application_status IN ('Approved', 'Retraining')
         AND ja.id NOT IN (
           SELECT tct.application_id FROM training_course_trainees tct
           JOIN training_courses tc ON tc.id = tct.training_course_id
           WHERE tc.training_status = 'Training Started'
         )
       ORDER BY a.last_name, a.first_name`,
      [jobVacancyId]
    );
    res.json(rows);
  } catch (err: any) {
    console.error('Error fetching eligible trainees:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST / — Create Training Course ─────────────────────────────────────────
router.post('/', requirePermission('jobs.training.create'), async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      training_name, job_vacancy_id, branch, device_name, trainer,
      start_date, end_date, notes, trainee_application_ids,
    } = req.body;

    if (!training_name?.trim()) return res.status(400).json({ error: 'اسم الدورة مطلوب' });
    if (!job_vacancy_id) return res.status(400).json({ error: 'معرّف الشاغر الوظيفي مطلوب' });
    if (!branch?.trim()) return res.status(400).json({ error: 'الفرع مطلوب' });
    if (!trainer?.trim()) return res.status(400).json({ error: 'اسم المدرب مطلوب' });
    if (!start_date || !end_date) return res.status(400).json({ error: 'تواريخ الدورة مطلوبة' });
    if (new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({ error: 'تاريخ البدء يجب أن يكون قبل أو يساوي تاريخ الانتهاء' });
    }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (new Date(start_date) < today) {
      return res.status(400).json({ error: 'لا يمكن جدولة دورة بتاريخ بدء في الماضي' });
    }
    if (!Array.isArray(trainee_application_ids) || trainee_application_ids.length === 0) {
      return res.status(400).json({ error: 'يجب إضافة متدرب واحد على الأقل' });
    }
    const uniqueIds = new Set(trainee_application_ids);
    if (uniqueIds.size !== trainee_application_ids.length) {
      return res.status(400).json({ error: 'يوجد تكرار في قائمة المتدربين' });
    }

    const { rows: vacRows } = await pool.query(`SELECT id FROM job_vacancies WHERE id = $1`, [job_vacancy_id]);
    if (vacRows.length === 0) return res.status(404).json({ error: 'الشاغر الوظيفي غير موجود' });

    for (const appId of trainee_application_ids) {
      const { rows: appRows } = await pool.query(
        `SELECT id, current_stage, application_status, job_vacancy_id FROM job_applications WHERE id = $1`,
        [appId]
      );
      if (appRows.length === 0) return res.status(400).json({ error: `الطلب رقم ${appId} غير موجود` });
      const app = appRows[0];
      if (app.current_stage !== 'Training')
        return res.status(400).json({ error: `الطلب رقم ${appId} ليس في مرحلة التدريب` });
      if (!['Approved', 'Retraining'].includes(app.application_status))
        return res.status(400).json({ error: `الطلب رقم ${appId} ليس في حالة مؤهلة للتدريب` });
      if (Number(app.job_vacancy_id) !== Number(job_vacancy_id))
        return res.status(400).json({ error: `الطلب رقم ${appId} لا ينتمي لنفس الشاغر الوظيفي` });
      const { rows: activeRows } = await pool.query(
        `SELECT tc.id FROM training_course_trainees tct
         JOIN training_courses tc ON tc.id = tct.training_course_id
         WHERE tct.application_id = $1 AND tc.training_status = 'Training Started'`,
        [appId]
      );
      if (activeRows.length > 0)
        return res.status(400).json({ error: `الطلب رقم ${appId} مسجل بالفعل في دورة نشطة` });
    }

    await client.query('BEGIN');

    const { rows: courseRows } = await client.query(
      `INSERT INTO training_courses
        (training_name, job_vacancy_id, branch, device_name, trainer, start_date, end_date, notes, created_by_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [sanitizeText(training_name.trim()), job_vacancy_id, sanitizeText(branch.trim()),
       device_name ? sanitizeText(device_name) : null,
       sanitizeText(trainer.trim()), start_date, end_date,
       notes ? sanitizeText(notes) : null, req.user!.id]
    );
    const course = courseRows[0];

    for (const appId of trainee_application_ids) {
      const { rows: oldRows } = await client.query(
        `SELECT application_status FROM job_applications WHERE id = $1`, [appId]
      );
      await client.query(
        `INSERT INTO training_course_trainees (training_course_id, application_id) VALUES ($1, $2)`,
        [course.id, appId]
      );
      await client.query(
        `UPDATE job_applications SET application_status = 'Training Scheduled', stage_status = 'Scheduled', updated_at = NOW() WHERE id = $1`,
        [appId]
      );
      await insertAuditLog(client, {
        entityType: 'TrainingCourse', entityId: course.id, applicationId: appId,
        actionType: 'Training Scheduled',
        performedByRole: req.user!.role,
        performedByUserId: req.user!.id,
        oldValue: oldRows[0]?.application_status, newValue: 'Training Scheduled',
      });
    }

    await client.query('COMMIT');

    const { rows: traineesRows } = await pool.query(
      `SELECT tct.application_id AS "applicationId",
         a.first_name AS "firstName", a.last_name AS "lastName"
       FROM training_course_trainees tct
       JOIN job_applications ja ON ja.id = tct.application_id
       JOIN applicants a ON a.id = ja.applicant_id
       WHERE tct.training_course_id = $1`,
      [course.id]
    );
    res.status(201).json({ ...mapCourse(course), trainees: traineesRows });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error creating training course:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ── GET / — List Training Courses ────────────────────────────────────────────
router.get('/', requirePermission('jobs.training.view_list'), async (req, res) => {
  try {
    const {
      branch, start_date, end_date, trainer, device_name,
      training_status, job_vacancy_id, search,
      page = '1', per_page = '25',
    } = req.query as Record<string, string>;

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (branch) { conditions.push(`tc.branch ILIKE $${idx++}`); params.push(`%${branch}%`); }
    if (start_date) { conditions.push(`tc.start_date >= $${idx++}`); params.push(start_date); }
    if (end_date) { conditions.push(`tc.end_date <= $${idx++}`); params.push(end_date); }
    if (trainer) { conditions.push(`tc.trainer ILIKE $${idx++}`); params.push(`%${trainer}%`); }
    if (device_name) { conditions.push(`tc.device_name ILIKE $${idx++}`); params.push(`%${device_name}%`); }
    if (training_status) { conditions.push(`tc.training_status = $${idx++}`); params.push(training_status); }
    if (job_vacancy_id) { conditions.push(`tc.job_vacancy_id = $${idx++}`); params.push(job_vacancy_id); }
    if (search) {
      conditions.push(`(tc.training_name ILIKE $${idx} OR CAST(tc.id AS TEXT) = $${idx})`);
      params.push(`%${search}%`); idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const perPageN = Math.min(parseInt(per_page) || 25, 100);
    const pageN = Math.max(parseInt(page) || 1, 1);
    const offset = (pageN - 1) * perPageN;

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM training_courses tc ${where}`, params
    );
    const totalCount = parseInt(countRows[0].count);

    const listParams = [...params, perPageN, offset];
    const { rows } = await pool.query(
      `SELECT tc.*,
        (SELECT COUNT(*) FROM training_course_trainees WHERE training_course_id = tc.id) AS registered_trainees_count,
        (SELECT COUNT(*) FROM training_course_trainees WHERE training_course_id = tc.id AND result = 'Passed') AS graduated_trainees_count
       FROM training_courses tc
       ${where}
       ORDER BY tc.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      listParams
    );

    res.json({
      courses: rows.map(r => ({
        ...mapCourse(r),
        registeredTraineesCount: parseInt(r.registered_trainees_count),
        graduatedTraineesCount: parseInt(r.graduated_trainees_count),
      })),
      totalCount,
      page: pageN,
      perPage: perPageN,
    });
  } catch (err: any) {
    console.error('Error fetching training courses:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /:id — Course Detail ──────────────────────────────────────────────────
router.get('/:id', requirePermission('jobs.training.view_detail'), async (req, res) => {
  try {
    const { rows: courseRows } = await pool.query(`SELECT * FROM training_courses WHERE id = $1`, [req.params.id]);
    if (courseRows.length === 0) return res.status(404).json({ error: 'الدورة التدريبية غير موجودة' });
    const course = courseRows[0];

    let vacancy = null;
    if (course.job_vacancy_id) {
      const { rows: vacRows } = await pool.query(
        `SELECT id, title, branch FROM job_vacancies WHERE id = $1`, [course.job_vacancy_id]
      );
      if (vacRows.length > 0) vacancy = vacRows[0];
    }

    const { rows: traineesRows } = await pool.query(
      `SELECT tct.id, tct.training_course_id AS "trainingCourseId",
         tct.application_id AS "applicationId",
         a.first_name AS "firstName", a.last_name AS "lastName",
         ja.application_status AS "applicationStatus",
         tct.result, tct.result_recorded_at AS "resultRecordedAt", tct.added_at AS "addedAt"
       FROM training_course_trainees tct
       JOIN job_applications ja ON ja.id = tct.application_id
       JOIN applicants a ON a.id = ja.applicant_id
       WHERE tct.training_course_id = $1
       ORDER BY tct.added_at ASC`,
      [req.params.id]
    );

    const { rows: attendanceRows } = await pool.query(
      `SELECT application_id AS "applicationId",
         attendance_date AS "attendanceDate", status
       FROM training_attendance
       WHERE training_course_id = $1
       ORDER BY attendance_date ASC, application_id ASC`,
      [req.params.id]
    );

    res.json({ ...mapCourse(course), vacancy, trainees: traineesRows, attendance: attendanceRows });
  } catch (err: any) {
    console.error('Error fetching training course detail:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /:id/start ──────────────────────────────────────────────────────────
router.patch('/:id/start', requirePermission('jobs.training.start'), async (req, res) => {
  const client = await pool.connect();
  try {
    const courseId = req.params.id as string;

    const { rows: courseRows } = await client.query(`SELECT * FROM training_courses WHERE id = $1`, [courseId]);
    if (courseRows.length === 0) return res.status(404).json({ error: 'الدورة التدريبية غير موجودة' });
    const course = courseRows[0];

    if (course.training_status !== 'Training Scheduled')
      return res.status(400).json({ error: 'يمكن بدء الدورة فقط إذا كانت في حالة "مجدولة"' });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const startDate = new Date(course.start_date); startDate.setHours(0, 0, 0, 0);
    if (startDate > today)
      return res.status(400).json({ error: 'لا يمكن بدء الدورة قبل تاريخ البدء المحدد' });

    const { rows: traineeRows } = await client.query(
      `SELECT application_id FROM training_course_trainees WHERE training_course_id = $1`, [courseId]
    );
    if (traineeRows.length === 0)
      return res.status(400).json({ error: 'لا يمكن بدء دورة بدون متدربين' });

    await client.query('BEGIN');
    await client.query(
      `UPDATE training_courses SET training_status = 'Training Started', updated_at = NOW() WHERE id = $1`, [courseId]
    );

    for (const { application_id } of traineeRows) {
      await client.query(
        `UPDATE job_applications SET application_status = 'Training Started', stage_status = 'In Progress', updated_at = NOW() WHERE id = $1`,
        [application_id]
      );
      await insertAuditLog(client, {
        entityType: 'TrainingCourse', entityId: parseInt(courseId), applicationId: application_id,
        actionType: 'Training Started',
        performedByRole: req.user!.role, performedByUserId: req.user!.id,
        oldValue: 'Training Scheduled', newValue: 'Training Started',
      });
    }

    await client.query('COMMIT');
    const { rows: updated } = await pool.query(`SELECT * FROM training_courses WHERE id = $1`, [courseId]);
    res.json(mapCourse(updated[0]));
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error starting training course:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ── POST /:id/attendance ──────────────────────────────────────────────────────
router.post('/:id/attendance', requirePermission('jobs.training.record_attendance'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { attendance, attendance_date } = req.body;
    const courseId = req.params.id as string;

    const { rows: courseRows } = await client.query(`SELECT * FROM training_courses WHERE id = $1`, [courseId]);
    if (courseRows.length === 0) return res.status(404).json({ error: 'الدورة التدريبية غير موجودة' });
    const course = courseRows[0];

    if (course.training_status !== 'Training Started')
      return res.status(400).json({ error: 'يمكن تسجيل الحضور فقط للدورات النشطة' });
    if (!attendance_date) return res.status(400).json({ error: 'تاريخ الحضور مطلوب' });

    const attDate = new Date(attendance_date); attDate.setHours(0, 0, 0, 0);
    const sDate = new Date(course.start_date); sDate.setHours(0, 0, 0, 0);
    const eDate = new Date(course.end_date); eDate.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);

    if (attDate < sDate || attDate > eDate)
      return res.status(400).json({ error: 'تاريخ الحضور يجب أن يكون ضمن نطاق الدورة' });
    if (attDate > today)
      return res.status(400).json({ error: 'لا يمكن تسجيل حضور لتاريخ مستقبلي' });
    if (!Array.isArray(attendance) || attendance.length === 0)
      return res.status(400).json({ error: 'بيانات الحضور مطلوبة' });

    const { rows: traineeRows } = await client.query(
      `SELECT application_id FROM training_course_trainees WHERE training_course_id = $1`, [courseId]
    );
    const traineeSet = new Set(traineeRows.map((r: any) => Number(r.application_id)));

    for (const entry of attendance) {
      if (!traineeSet.has(Number(entry.application_id)))
        return res.status(400).json({ error: `الطلب رقم ${entry.application_id} ليس متدرباً في هذه الدورة` });
      const { rows: tctRows } = await client.query(
        `SELECT result FROM training_course_trainees WHERE training_course_id = $1 AND application_id = $2`,
        [courseId, entry.application_id]
      );
      if (tctRows[0]?.result != null)
        return res.status(400).json({ error: `لا يمكن تعديل حضور المتدرب ${entry.application_id} بعد تسجيل النتيجة` });
    }

    await client.query('BEGIN');
    const results = [];
    for (const entry of attendance) {
      const { rows } = await client.query(
        `INSERT INTO training_attendance
          (training_course_id, application_id, attendance_date, status, recorded_by_user_id)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (training_course_id, application_id, attendance_date)
         DO UPDATE SET status = EXCLUDED.status, recorded_by_user_id = EXCLUDED.recorded_by_user_id
         RETURNING *`,
        [courseId, entry.application_id, attendance_date, entry.status, req.user!.id]
      );
      results.push(rows[0]);
      await insertAuditLog(client, {
        entityType: 'TrainingAttendance', entityId: parseInt(courseId), applicationId: entry.application_id,
        actionType: 'Attendance Recorded',
        performedByRole: req.user!.role, performedByUserId: req.user!.id,
        newValue: JSON.stringify({ date: attendance_date, status: entry.status }),
      });
    }
    await client.query('COMMIT');
    res.json(results);
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error recording attendance:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ── PATCH /:id/complete ───────────────────────────────────────────────────────
router.patch('/:id/complete', requirePermission('jobs.training.complete'), async (req, res) => {
  const client = await pool.connect();
  try {
    const courseId = req.params.id as string;

    const { rows: courseRows } = await client.query(`SELECT * FROM training_courses WHERE id = $1`, [courseId]);
    if (courseRows.length === 0) return res.status(404).json({ error: 'الدورة التدريبية غير موجودة' });
    const course = courseRows[0];

    if (course.training_status !== 'Training Started')
      return res.status(400).json({ error: 'يمكن إكمال الدورة فقط إذا كانت في حالة "جارية"' });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const endDate = new Date(course.end_date); endDate.setHours(0, 0, 0, 0);
    if (today < endDate)
      return res.status(400).json({ error: 'لا يمكن إكمال الدورة قبل تاريخ الانتهاء المحدد' });

    const { rows: traineeRows } = await client.query(
      `SELECT application_id FROM training_course_trainees WHERE training_course_id = $1`, [courseId]
    );

    // Count course days
    let courseDays = 0;
    const cur = new Date(course.start_date); cur.setHours(0, 0, 0, 0);
    const eDate2 = new Date(course.end_date); eDate2.setHours(0, 0, 0, 0);
    while (cur <= eDate2) { courseDays++; cur.setDate(cur.getDate() + 1); }

    for (const { application_id } of traineeRows) {
      const { rows: attRows } = await client.query(
        `SELECT COUNT(*) FROM training_attendance WHERE training_course_id = $1 AND application_id = $2`,
        [courseId, application_id]
      );
      if (parseInt(attRows[0].count) < courseDays) {
        return res.status(400).json({
          error: `لم يتم تسجيل الحضور لجميع أيام الدورة للمتدرب رقم ${application_id}`,
        });
      }
    }

    await client.query('BEGIN');
    await client.query(
      `UPDATE training_courses SET training_status = 'Training Completed', updated_at = NOW() WHERE id = $1`, [courseId]
    );

    for (const { application_id } of traineeRows) {
      const { rows: tctRows } = await client.query(
        `SELECT result FROM training_course_trainees WHERE training_course_id = $1 AND application_id = $2`,
        [courseId, application_id]
      );
      if (tctRows[0]?.result == null) {
        await client.query(
          `UPDATE job_applications SET application_status = 'Training Completed', stage_status = 'Completed', updated_at = NOW() WHERE id = $1`,
          [application_id]
        );
        await insertAuditLog(client, {
          entityType: 'TrainingCourse', entityId: parseInt(courseId), applicationId: application_id,
          actionType: 'Training Completed',
          performedByRole: req.user!.role, performedByUserId: req.user!.id,
          oldValue: 'Training Started', newValue: 'Training Completed',
        });
      }
    }

    await client.query('COMMIT');
    const { rows: updated } = await pool.query(`SELECT * FROM training_courses WHERE id = $1`, [courseId]);
    res.json(mapCourse(updated[0]));
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error completing training course:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ── PATCH /:id/trainees/:applicationId/result ─────────────────────────────────
router.patch('/:id/trainees/:applicationId/result', requirePermission('jobs.training.record_result'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { result } = req.body;
    const courseId = req.params.id as string;
    const appId = parseInt(req.params.applicationId as string);

    if (!['Passed', 'Retraining', 'Rejected', 'Retreated'].includes(result))
      return res.status(400).json({ error: 'نتيجة غير صالحة' });

    const { rows: courseRows } = await client.query(`SELECT * FROM training_courses WHERE id = $1`, [courseId]);
    if (courseRows.length === 0) return res.status(404).json({ error: 'الدورة التدريبية غير موجودة' });
    if (courseRows[0].training_status !== 'Training Completed')
      return res.status(400).json({ error: 'يمكن تسجيل النتيجة فقط بعد إكمال الدورة' });

    const { rows: tctRows } = await client.query(
      `SELECT tct.*, ja.job_vacancy_id FROM training_course_trainees tct
       JOIN job_applications ja ON ja.id = tct.application_id
       WHERE tct.training_course_id = $1 AND tct.application_id = $2`,
      [courseId, appId]
    );
    if (tctRows.length === 0) return res.status(404).json({ error: 'المتدرب غير موجود في هذه الدورة' });
    const tct = tctRows[0];
    if (tct.result != null) return res.status(400).json({ error: 'تم تسجيل النتيجة بالفعل ولا يمكن تعديلها' });

    if (result === 'Retraining') {
      const { rows: rtRows } = await client.query(
        `SELECT COUNT(*) FROM training_course_trainees WHERE application_id = $1 AND result = 'Retraining'`,
        [appId]
      );
      const retrainingCount = parseInt(rtRows[0].count);
      const { rows: vacRows } = await client.query(
        `SELECT max_retraining_count FROM job_vacancies WHERE id = $1`, [tct.job_vacancy_id]
      );
      const maxRetraining = vacRows[0]?.max_retraining_count ?? 1;
      if (retrainingCount >= maxRetraining) {
        return res.status(400).json({
          error: `تم استنفاد الحد الأقصى لإعادة التدريب (${maxRetraining}). يُسمح فقط بـ: ناجح، مرفوض، أو منسحب.`,
        });
      }
    }

    let newStage: string, newStatus: string, newDecision: string | null, newStageStatus: string;
    if (result === 'Passed')           { newStage = 'Final Decision'; newStatus = 'Passed'; newDecision = 'Passed'; newStageStatus = 'Awaiting Decision'; }
    else if (result === 'Retraining')  { newStage = 'Training'; newStatus = 'Retraining'; newDecision = 'Retraining'; newStageStatus = 'Ready'; }
    else if (result === 'Rejected')    { newStage = 'Final Decision'; newStatus = 'Passed'; newDecision = null; newStageStatus = 'Awaiting Decision'; }
    else                               { newStage = 'Training'; newStatus = 'Retreated'; newDecision = 'Retreated'; newStageStatus = 'Completed'; }

    await client.query('BEGIN');
    await client.query(
      `UPDATE training_course_trainees
       SET result = $1, result_recorded_at = NOW(), result_recorded_by = $2
       WHERE training_course_id = $3 AND application_id = $4`,
      [result, req.user!.id, courseId, appId]
    );
    await client.query(
      `UPDATE job_applications SET current_stage = $1, application_status = $2,
        stage_status = $3, decision = $4, updated_at = NOW() WHERE id = $5`,
      [newStage, newStatus, newStageStatus, newDecision, appId]
    );
    await insertAuditLog(client, {
      entityType: 'TrainingCourse', entityId: parseInt(courseId), applicationId: appId,
      actionType: 'Training Result Recorded',
      performedByRole: req.user!.role, performedByUserId: req.user!.id,
      oldValue: 'Training Completed', newValue: result,
    });
    await client.query('COMMIT');
    res.json({ applicationId: appId, result, newStage, newStatus });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error recording trainee result:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ── POST /:id/trainees — Add more trainees ────────────────────────────────────
router.post('/:id/trainees', requirePermission('jobs.training.add_trainees'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { application_ids } = req.body;
    const courseId = req.params.id as string;

    const { rows: courseRows } = await client.query(`SELECT * FROM training_courses WHERE id = $1`, [courseId]);
    if (courseRows.length === 0) return res.status(404).json({ error: 'الدورة التدريبية غير موجودة' });
    const course = courseRows[0];

    if (course.training_status !== 'Training Scheduled')
      return res.status(400).json({ error: 'يمكن إضافة متدربين فقط للدورات المجدولة' });
    if (!Array.isArray(application_ids) || application_ids.length === 0)
      return res.status(400).json({ error: 'يجب تحديد متدرب واحد على الأقل' });
    const uniqueIds = new Set(application_ids);
    if (uniqueIds.size !== application_ids.length)
      return res.status(400).json({ error: 'يوجد تكرار في قائمة المتدربين' });

    for (const appId of application_ids) {
      const { rows: appRows } = await pool.query(
        `SELECT id, current_stage, application_status, job_vacancy_id FROM job_applications WHERE id = $1`, [appId]
      );
      if (appRows.length === 0) return res.status(400).json({ error: `الطلب رقم ${appId} غير موجود` });
      const app = appRows[0];
      if (app.current_stage !== 'Training')
        return res.status(400).json({ error: `الطلب رقم ${appId} ليس في مرحلة التدريب` });
      if (!['Approved', 'Retraining'].includes(app.application_status))
        return res.status(400).json({ error: `الطلب رقم ${appId} ليس في حالة مؤهلة للتدريب` });
      if (Number(app.job_vacancy_id) !== Number(course.job_vacancy_id))
        return res.status(400).json({ error: `الطلب رقم ${appId} لا ينتمي لنفس الشاغر الوظيفي` });
      const { rows: activeRows } = await pool.query(
        `SELECT tc.id FROM training_course_trainees tct
         JOIN training_courses tc ON tc.id = tct.training_course_id
         WHERE tct.application_id = $1 AND tc.training_status = 'Training Started'`, [appId]
      );
      if (activeRows.length > 0)
        return res.status(400).json({ error: `الطلب رقم ${appId} مسجل بالفعل في دورة نشطة` });
      const { rows: existRows } = await pool.query(
        `SELECT id FROM training_course_trainees WHERE training_course_id = $1 AND application_id = $2`,
        [courseId, appId]
      );
      if (existRows.length > 0)
        return res.status(400).json({ error: `الطلب رقم ${appId} مسجل بالفعل في هذه الدورة` });
    }

    await client.query('BEGIN');
    const added = [];
    for (const appId of application_ids) {
      const { rows: oldRows } = await client.query(
        `SELECT application_status FROM job_applications WHERE id = $1`, [appId]
      );
      await client.query(
        `INSERT INTO training_course_trainees (training_course_id, application_id) VALUES ($1, $2)`,
        [courseId, appId]
      );
      await client.query(
        `UPDATE job_applications SET application_status = 'Training Scheduled', stage_status = 'Scheduled', updated_at = NOW() WHERE id = $1`, [appId]
      );
      await insertAuditLog(client, {
        entityType: 'TrainingCourse', entityId: parseInt(courseId), applicationId: appId,
        actionType: 'Training Scheduled',
        performedByRole: req.user!.role, performedByUserId: req.user!.id,
        oldValue: oldRows[0]?.application_status, newValue: 'Training Scheduled',
      });
      added.push(appId);
    }
    await client.query('COMMIT');
    res.json({ added });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error adding trainees:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
