import { Router } from 'express';
import pool from '../db.js';
import { insertAuditLog } from '../utils/auditLog.js';
import { sanitizeText } from '../utils/sanitize.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const INTERVIEW_COLS = `
  id, application_id AS "applicationId",
  interview_type AS "interviewType",
  interview_number AS "interviewNumber",
  interviewer_name AS "interviewerName",
  interview_date AS "interviewDate",
  interview_time AS "interviewTime",
  interview_status AS "interviewStatus",
  internal_notes AS "internalNotes",
  created_at AS "createdAt"
`;

// GET /api/admin/interviews/eligible/:jobVacancyId
router.get('/eligible/:jobVacancyId', requireAuth, async (req, res) => {
  try {
    const { jobVacancyId } = req.params;
    const { rows } = await pool.query(
      `SELECT ja.id,
         a.first_name AS "applicantFirstName",
         a.last_name AS "applicantLastName",
         ja.current_stage AS "currentStage",
         ja.application_status AS "applicationStatus"
       FROM job_applications ja
       JOIN applicants a ON a.id = ja.applicant_id
       WHERE ja.job_vacancy_id = $1
         AND (
           (ja.current_stage = 'Shortlisted' AND ja.application_status = 'Qualified') OR
           (ja.current_stage = 'Interview' AND ja.application_status = 'Interview Completed')
         )
         AND ja.id NOT IN (
           SELECT application_id FROM interviews WHERE interview_status = 'Interview Scheduled'
         )
       ORDER BY a.last_name, a.first_name`,
      [jobVacancyId]
    );
    res.json(rows);
  } catch (err: any) {
    console.error('Error fetching eligible for interview:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/interviews?applicationId=&interviewerName=&date=&jobVacancyId=
router.get('/', requireAuth, async (req, res) => {
  try {
    const { applicationId, interviewerName, date, jobVacancyId } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (applicationId) { conditions.push(`i.application_id = $${idx++}`); params.push(applicationId); }
    if (interviewerName) { conditions.push(`i.interviewer_name ILIKE $${idx++}`); params.push(`%${interviewerName}%`); }
    if (date) { conditions.push(`i.interview_date = $${idx++}`); params.push(date); }
    if (jobVacancyId) { conditions.push(`ja.job_vacancy_id = $${idx++}`); params.push(jobVacancyId); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT ${INTERVIEW_COLS},
        a.first_name AS "applicantFirstName",
        a.last_name AS "applicantLastName",
        jv.title AS "vacancyTitle"
      FROM interviews i
      JOIN job_applications ja ON ja.id = i.application_id
      JOIN applicants a ON a.id = ja.applicant_id
      JOIN job_vacancies jv ON jv.id = ja.job_vacancy_id
      ${where}
      ORDER BY i.interview_date DESC, i.interview_time DESC`,
      params
    );
    res.json(rows);
  } catch (err: any) {
    console.error('Error fetching interviews:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/interviews — schedule an interview
router.post('/', requireRole('HR_ASSISTANT', 'HR_MANAGER'), async (req, res) => {
  const client = await pool.connect();
  try {
    const b = req.body;

    if (!b.applicationId) return res.status(400).json({ error: 'معرّف الطلب مطلوب' });
    if (!b.interviewType) return res.status(400).json({ error: 'نوع المقابلة مطلوب' });
    if (!b.interviewNumber) return res.status(400).json({ error: 'رقم المقابلة مطلوب' });
    if (!b.interviewerName?.trim()) return res.status(400).json({ error: 'اسم المقابِل مطلوب' });
    if (!b.interviewDate) return res.status(400).json({ error: 'تاريخ المقابلة مطلوب' });
    if (!b.interviewTime) return res.status(400).json({ error: 'وقت المقابلة مطلوب' });

    await client.query('BEGIN');

    // M3.3: Prevent duplicate scheduled interview for the same application
    const { rows: existingScheduled } = await client.query(
      `SELECT id FROM interviews WHERE application_id = $1 AND interview_status = 'Interview Scheduled'`,
      [b.applicationId]
    );
    if (existingScheduled.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'يوجد مقابلة مجدولة بالفعل لهذا الطلب' });
    }

    // M3.2: Interviewer conflict check — same interviewer + date + time already scheduled
    const { rows: conflictRows } = await client.query(
      `SELECT id FROM interviews
       WHERE interviewer_name = $1
         AND interview_date = $2
         AND interview_time = $3
         AND interview_status = 'Interview Scheduled'`,
      [b.interviewerName, b.interviewDate, b.interviewTime]
    );
    if (conflictRows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'المقابِل لديه مقابلة أخرى في نفس التاريخ والوقت' });
    }

    const { rows } = await client.query(
      `INSERT INTO interviews (
        application_id, interview_type, interview_number,
        interviewer_name, interview_date, interview_time,
        interview_status, internal_notes
      ) VALUES ($1,$2,$3,$4,$5,$6,'Interview Scheduled',$7)
      RETURNING ${INTERVIEW_COLS}`,
      [
        b.applicationId, b.interviewType, b.interviewNumber,
        sanitizeText(b.interviewerName), b.interviewDate, b.interviewTime,
        b.internalNotes ? sanitizeText(b.internalNotes) : null,
      ]
    );

    // Auto-update application status to Interview Scheduled
    await client.query(
      `UPDATE job_applications 
       SET current_stage = 'Interview', application_status = 'Interview Scheduled', updated_at = NOW() 
       WHERE id = $1`,
      [b.applicationId]
    );

    await insertAuditLog(client, {
      entityType: 'interview',
      entityId: rows[0].id,
      applicationId: b.applicationId,
      actionType: 'Interview Scheduled',
      performedByRole: req.user!.role,
      performedByUserId: req.user!.id,
      newValue: JSON.stringify({
        interviewType: b.interviewType,
        interviewNumber: b.interviewNumber,
        interviewerName: b.interviewerName,
        interviewDate: b.interviewDate,
      }),
    });

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error scheduling interview:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/admin/interviews/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${INTERVIEW_COLS},
        a.first_name AS "applicantFirstName",
        a.last_name AS "applicantLastName",
        a.dob AS "applicantDob",
        a.governorate AS "applicantGovernorate",
        a.city_or_area AS "applicantCityOrArea",
        a.academic_qualification AS "applicantAcademicQualification",
        a.previous_employment AS "applicantPreviousEmployment",
        a.driving_license AS "applicantDrivingLicense",
        a.expected_salary AS "applicantExpectedSalary",
        a.foreign_languages AS "applicantForeignLanguages",
        a.computer_skills AS "applicantComputerSkills",
        a.years_of_experience AS "applicantYearsOfExperience",
        jv.id AS "vacancyId",
        jv.title AS "vacancyTitle",
        jv.branch AS "vacancyBranch"
      FROM interviews i
      JOIN job_applications ja ON ja.id = i.application_id
      JOIN applicants a ON a.id = ja.applicant_id
      JOIN job_vacancies jv ON jv.id = ja.job_vacancy_id
      WHERE i.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'المقابلة غير موجودة' });

    const row = rows[0];
    res.json({
      id: row.id,
      applicationId: row.applicationId,
      interviewType: row.interviewType,
      interviewNumber: row.interviewNumber,
      interviewerName: row.interviewerName,
      interviewDate: row.interviewDate,
      interviewTime: row.interviewTime,
      interviewStatus: row.interviewStatus,
      internalNotes: row.internalNotes,
      createdAt: row.createdAt,
      applicant: {
        firstName: row.applicantFirstName,
        lastName: row.applicantLastName,
        dob: row.applicantDob,
        governorate: row.applicantGovernorate,
        cityOrArea: row.applicantCityOrArea,
        academicQualification: row.applicantAcademicQualification,
        previousEmployment: row.applicantPreviousEmployment,
        drivingLicense: row.applicantDrivingLicense,
        expectedSalary: row.applicantExpectedSalary,
        foreignLanguages: row.applicantForeignLanguages,
        computerSkills: row.applicantComputerSkills,
        yearsOfExperience: row.applicantYearsOfExperience,
      },
      vacancy: {
        id: row.vacancyId,
        title: row.vacancyTitle,
        branch: row.vacancyBranch,
      },
    });
  } catch (err: any) {
    console.error('Error fetching interview:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/interviews/:id — edit a scheduled interview
router.put('/:id', requireRole('HR_ASSISTANT', 'HR_MANAGER'), async (req, res) => {
  const client = await pool.connect();
  try {
    const b = req.body;
    const interviewId = req.params.id;

    await client.query('BEGIN');

    const { rows: current } = await client.query(
      'SELECT interview_status, application_id FROM interviews WHERE id = $1',
      [interviewId]
    );
    if (current.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'المقابلة غير موجودة' });
    }
    if (current[0].interview_status !== 'Interview Scheduled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'لا يمكن تعديل مقابلة مكتملة أو فاشلة' });
    }

    if (b.interviewDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(b.interviewDate) < today) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'لا يمكن تعيين تاريخ مقابلة في الماضي' });
      }
    }

    const { rows } = await client.query(
      `UPDATE interviews SET
        interview_date = COALESCE($1, interview_date),
        interview_time = COALESCE($2, interview_time),
        interviewer_name = COALESCE($3, interviewer_name),
        interview_type = COALESCE($4, interview_type),
        interview_number = COALESCE($5, interview_number),
        internal_notes = COALESCE($6, internal_notes)
      WHERE id = $7
      RETURNING ${INTERVIEW_COLS}`,
      [
        b.interviewDate || null,
        b.interviewTime || null,
        b.interviewerName ? sanitizeText(b.interviewerName) : null,
        b.interviewType || null,
        b.interviewNumber || null,
        b.internalNotes !== undefined ? (b.internalNotes ? sanitizeText(b.internalNotes) : null) : null,
        interviewId,
      ]
    );

    await insertAuditLog(client, {
      entityType: 'interview',
      entityId: parseInt(interviewId as string),
      applicationId: current[0].application_id,
      actionType: 'Interview Updated',
      performedByRole: req.user!.role,
      performedByUserId: req.user!.id,
      newValue: JSON.stringify({
        interviewDate: b.interviewDate,
        interviewTime: b.interviewTime,
        interviewerName: b.interviewerName,
        interviewType: b.interviewType,
        interviewNumber: b.interviewNumber,
      }),
    });

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error updating interview:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/admin/interviews/:id/result — update interview result
router.patch('/:id/result', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { interviewStatus, internalNotes } = req.body;

    if (!['Interview Completed', 'Interview Failed'].includes(interviewStatus)) {
      return res.status(400).json({ error: 'حالة المقابلة غير صالحة' });
    }

    await client.query('BEGIN');

    const { rows: current } = await client.query(
      'SELECT interview_status, application_id FROM interviews WHERE id = $1',
      [req.params.id]
    );
    if (current.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'المقابلة غير موجودة' });
    }
    if (current[0].interview_status !== 'Interview Scheduled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'يمكن تحديث نتيجة المقابلة المجدولة فقط' });
    }

    const { rows } = await client.query(
      `UPDATE interviews SET
        interview_status = $1,
        internal_notes = COALESCE($2, internal_notes)
      WHERE id = $3
      RETURNING ${INTERVIEW_COLS}`,
      [interviewStatus, internalNotes ? sanitizeText(internalNotes) : null, req.params.id]
    );

    // Auto-update application status to match interview outcome
    await client.query(
      `UPDATE job_applications 
       SET current_stage = 'Interview', application_status = $1, updated_at = NOW() 
       WHERE id = $2`,
      [interviewStatus, current[0].application_id]
    );

    await insertAuditLog(client, {
      entityType: 'interview',
      entityId: parseInt(req.params.id as string),
      applicationId: current[0].application_id,
      actionType: 'Interview Result Recorded',
      performedByRole: req.user!.role,
      performedByUserId: req.user!.id,
      oldValue: current[0].interview_status,
      newValue: interviewStatus,
      internalReason: internalNotes || null,
    });

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error updating interview:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
