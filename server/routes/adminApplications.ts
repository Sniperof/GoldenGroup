import { Router } from 'express';
import pool from '../db.js';
import { insertAuditLog } from '../utils/auditLog.js';
import { validateStageTransition, isTerminalStatus, isTrainingManagedStage } from '../utils/stageEngine.js';
import { checkVacancyCapacity, checkDuplicate } from '../utils/applicationHelpers.js';
import { sanitizeText } from '../utils/sanitize.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const APP_COLS = `
  ja.id, ja.job_vacancy_id AS "jobVacancyId",
  ja.applicant_id AS "applicantId",
  ja.referrer_id AS "referrerId",
  ja.submission_type AS "submissionType",
  ja.application_source AS "applicationSource",
  ja.entered_by_user_id AS "enteredByUserId",
  ja.entered_by_name AS "enteredByName",
  ja.current_stage AS "currentStage",
  ja.application_status AS "applicationStatus",
  ja.duplicate_flag AS "duplicateFlag",
  ja.is_escalated AS "isEscalated",
  ja.escalated_at AS "escalatedAt",
  ja.internal_notes AS "internalNotes",
  ja.created_at AS "createdAt",
  ja.updated_at AS "updatedAt",
  ja.is_archived AS "isArchived",
  ja.archived_at AS "archivedAt"
`;

// GET /api/admin/applications
router.get('/', requireAuth, async (req, res) => {
  try {
    const { vacancyId, branch, gender, stage, status, search, applicationSource, isArchived } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (vacancyId) { conditions.push(`ja.job_vacancy_id = $${idx++}`); params.push(vacancyId); }
    if (branch) { conditions.push(`jv.branch = $${idx++}`); params.push(branch); }
    if (gender) { conditions.push(`a.gender = $${idx++}`); params.push(gender); }
    if (stage) { conditions.push(`ja.current_stage = $${idx++}`); params.push(stage); }
    if (status) { conditions.push(`ja.application_status = $${idx++}`); params.push(status); }
    if (applicationSource) { conditions.push(`ja.application_source = $${idx++}`); params.push(applicationSource); }
    if (search) {
      conditions.push(`(
        CAST(ja.id AS TEXT) LIKE $${idx}
        OR a.mobile_number LIKE $${idx}
        OR a.first_name ILIKE $${idx}
        OR a.last_name ILIKE $${idx}
      )`);
      params.push(`%${search}%`);
      idx++;
    }
    // M4.2: archived filter — default to non-archived
    if (isArchived === 'true') {
      conditions.push(`ja.is_archived = TRUE`);
    } else {
      conditions.push(`(ja.is_archived = FALSE OR ja.is_archived IS NULL)`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT ${APP_COLS},
        a.first_name AS "applicantFirstName",
        a.last_name AS "applicantLastName",
        a.mobile_number AS "applicantMobile",
        a.gender AS "applicantGender",
        jv.title AS "vacancyTitle",
        jv.branch AS "vacancyBranch"
      FROM job_applications ja
      JOIN applicants a ON a.id = ja.applicant_id
      JOIN job_vacancies jv ON jv.id = ja.job_vacancy_id
      ${where}
      ORDER BY ja.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err: any) {
    console.error('Error fetching applications:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/applications — manual admin entry (Internal / External Platforms)
router.post('/', requireRole('HR_ASSISTANT', 'HR_MANAGER'), async (req, res) => {
  const client = await pool.connect();
  try {
    const body = req.body;
    const a = body.applicant || {};

    if (!a.firstName?.trim()) return res.status(400).json({ error: 'الاسم الأول مطلوب' });
    if (!a.lastName?.trim()) return res.status(400).json({ error: 'اسم العائلة مطلوب' });
    if (!a.mobileNumber?.trim()) return res.status(400).json({ error: 'رقم الهاتف مطلوب' });
    if (!/^\d{10,11}$/.test(a.mobileNumber)) return res.status(400).json({ error: 'رقم الهاتف يجب أن يكون 10-11 رقم' });
    if (a.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)) return res.status(400).json({ error: 'صيغة البريد الإلكتروني غير صحيحة' });
    if (!a.dob) return res.status(400).json({ error: 'تاريخ الميلاد مطلوب' });
    if (!a.gender) return res.status(400).json({ error: 'الجنس مطلوب' });
    if (!a.maritalStatus) return res.status(400).json({ error: 'الحالة الاجتماعية مطلوبة' });
    if (!a.governorate?.trim()) return res.status(400).json({ error: 'المحافظة مطلوبة' });
    if (!body.jobVacancyId) return res.status(400).json({ error: 'معرّف الشاغر الوظيفي مطلوب' });

    const submissionType = body.submissionType;
    if (!['Apply', 'Refer a Candidate'].includes(submissionType)) {
      return res.status(400).json({ error: 'نوع التقديم غير صالح' });
    }
    const applicationSource = body.applicationSource;
    if (!['Internal', 'External Platforms'].includes(applicationSource)) {
      return res.status(400).json({ error: 'مصدر الطلب يجب أن يكون Internal أو External Platforms' });
    }
    // enteredByUserId now comes from auth context
    if (submissionType === 'Refer a Candidate' && !body.referrer?.fullName?.trim()) {
      return res.status(400).json({ error: 'اسم المُعرّف مطلوب عند التقديم نيابة عن مرشح' });
    }

    await client.query('BEGIN');

    // Vacancy: must be Open and within date range
    const { rows: vacRows } = await client.query(
      `SELECT id, status FROM job_vacancies
       WHERE id = $1 AND status = 'Open' AND CURRENT_DATE BETWEEN start_date AND end_date`,
      [body.jobVacancyId]
    );
    if (vacRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'الشاغر غير موجود أو غير مفتوح للتقديم أو خارج الفترة المحددة' });
    }

    // Duplicate check
    const dupResult = await checkDuplicate(client, a.mobileNumber, body.jobVacancyId);
    if (dupResult.blocked) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'يوجد طلب نشط بالفعل لهذا الرقم والشاغر الوظيفي',
        duplicateApplicationId: dupResult.duplicateApplicationId,
      });
    }
    const duplicateFlag = 'duplicateFlag' in dupResult ? dupResult.duplicateFlag : undefined;

    // Insert applicant
    const { rows: applicantRows } = await client.query(
      `INSERT INTO applicants (
        first_name, last_name, dob, gender, marital_status, email,
        mobile_number, secondary_mobile, governorate, city_or_area,
        sub_area, neighborhood, detailed_address,
        academic_qualification, previous_employment, driving_license,
        expected_salary, computer_skills, foreign_languages,
        years_of_experience, cv_url, photo_url, applicant_segment
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
      RETURNING id`,
      [
        a.firstName, a.lastName, a.dob, a.gender, a.maritalStatus, a.email || null,
        a.mobileNumber, a.secondaryMobile || null,
        a.governorate, a.cityOrArea || null, a.subArea || null, a.neighborhood || null, a.detailedAddress || null,
        a.academicQualification || null, a.previousEmployment || null,
        a.drivingLicense || null, a.expectedSalary ? parseInt(a.expectedSalary) : null,
        a.computerSkills || null, a.foreignLanguages || null,
        a.yearsOfExperience ? parseInt(a.yearsOfExperience) : null,
        a.cvUrl || null, a.photoUrl || null, a.applicantSegment || null,
      ]
    );
    const applicantId = applicantRows[0].id;
    const enteredByUserId = req.user!.id;

    // Insert referrer if 'Refer a Candidate'
    let referrerId: number | null = null;
    if (submissionType === 'Refer a Candidate' && body.referrer) {
      const r = body.referrer;
      const { rows: refRows } = await client.query(
        `INSERT INTO referrers (
          type, employee_id, full_name, last_name, mobile_number,
          governorate, city_or_area, sub_area, neighborhood,
          detailed_address, referrer_work, referrer_notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING id`,
        [
          r.type || 'Customer', r.employeeId || null,
          sanitizeText(r.fullName), r.lastName ? sanitizeText(r.lastName) : null, r.mobileNumber || null,
          r.governorate ? sanitizeText(r.governorate) : null, r.cityOrArea ? sanitizeText(r.cityOrArea) : null,
          r.subArea ? sanitizeText(r.subArea) : null, r.neighborhood ? sanitizeText(r.neighborhood) : null,
          r.detailedAddress ? sanitizeText(r.detailedAddress) : null,
          r.referrerWork ? sanitizeText(r.referrerWork) : null,
          r.referrerNotes ? sanitizeText(r.referrerNotes) : null,
        ]
      );
      referrerId = refRows[0].id;
    }

    // Insert application
    const { rows: appRows } = await client.query(
      `INSERT INTO job_applications (
        job_vacancy_id, applicant_id, referrer_id, submission_type,
        application_source, entered_by_user_id, entered_by_name,
        current_stage, application_status, duplicate_flag
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,'Submitted','New',$8)
      RETURNING id, job_vacancy_id AS "jobVacancyId", applicant_id AS "applicantId",
        referrer_id AS "referrerId", submission_type AS "submissionType",
        application_source AS "applicationSource",
        entered_by_user_id AS "enteredByUserId", entered_by_name AS "enteredByName",
        current_stage AS "currentStage", application_status AS "applicationStatus",
        duplicate_flag AS "duplicateFlag", created_at AS "createdAt"`,
      [
        body.jobVacancyId, applicantId, referrerId,
        submissionType, applicationSource,
        enteredByUserId, body.enteredByName || null,
        duplicateFlag,
      ]
    );

    await insertAuditLog(client, {
      entityType: 'job_application',
      entityId: appRows[0].id,
      applicationId: appRows[0].id,
      actionType: 'Application Submitted (Admin)',
      performedByRole: req.user!.role,
      performedByUserId: req.user!.id,
      newValue: JSON.stringify({
        applicantId, referrerId,
        jobVacancyId: body.jobVacancyId,
        submissionType, applicationSource, duplicateFlag,
      }),
    });

    await client.query('COMMIT');
    res.status(201).json(appRows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error creating admin application:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/admin/applications/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows: appRows } = await pool.query(
      `SELECT ${APP_COLS} FROM job_applications ja WHERE ja.id = $1`,
      [req.params.id]
    );
    if (appRows.length === 0) return res.status(404).json({ error: 'الطلب غير موجود' });
    const app = appRows[0];

    // Fetch applicant
    const { rows: applicantRows } = await pool.query(
      `SELECT id, first_name AS "firstName", last_name AS "lastName",
        dob, gender, marital_status AS "maritalStatus", email,
        mobile_number AS "mobileNumber", secondary_mobile AS "secondaryMobile",
        governorate, city_or_area AS "cityOrArea",
        sub_area AS "subArea", neighborhood, detailed_address AS "detailedAddress",
        academic_qualification AS "academicQualification",
        previous_employment AS "previousEmployment",
        driving_license AS "drivingLicense",
        expected_salary AS "expectedSalary",
        computer_skills AS "computerSkills",
        foreign_languages AS "foreignLanguages",
        years_of_experience AS "yearsOfExperience",
        cv_url AS "cvUrl", photo_url AS "photoUrl",
        applicant_segment AS "applicantSegment",
        created_at AS "createdAt"
      FROM applicants WHERE id = $1`,
      [app.applicantId]
    );

    // Fetch vacancy
    const { rows: vacancyRows } = await pool.query(
      `SELECT id, title, branch,
        governorate, city_or_area AS "cityOrArea", sub_area AS "subArea",
        neighborhood, detailed_address AS "detailedAddress",
        work_type AS "workType", required_gender AS "requiredGender",
        required_age_min AS "requiredAgeMin", required_age_max AS "requiredAgeMax",
        email, required_qualification AS "requiredQualification",
        required_specialization AS "requiredSpecialization",
        required_experience_years AS "requiredExperienceYears",
        required_skills AS "requiredSkills", responsibilities,
        driving_license_required AS "drivingLicenseRequired",
        vacancy_count AS "vacancyCount", max_retraining_count AS "maxRetrainingCount",
        start_date AS "startDate", end_date AS "endDate",
        status, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM job_vacancies WHERE id = $1`,
      [app.jobVacancyId]
    );

    // Fetch referrer
    let referrer = null;
    if (app.referrerId) {
      const { rows: refRows } = await pool.query(
        `SELECT id, type, employee_id AS "employeeId",
          full_name AS "fullName", last_name AS "lastName",
          mobile_number AS "mobileNumber", governorate,
          city_or_area AS "cityOrArea", sub_area AS "subArea",
          neighborhood, detailed_address AS "detailedAddress",
          referrer_work AS "referrerWork", referrer_notes AS "referrerNotes"
        FROM referrers WHERE id = $1`,
        [app.referrerId]
      );
      if (refRows.length > 0) referrer = refRows[0];
    }

    // Fetch interviews
    const { rows: interviewRows } = await pool.query(
      `SELECT id, application_id AS "applicationId",
        interview_type AS "interviewType",
        interview_number AS "interviewNumber",
        interviewer_name AS "interviewerName",
        interview_date AS "interviewDate",
        interview_time AS "interviewTime",
        interview_status AS "interviewStatus",
        internal_notes AS "internalNotes",
        created_at AS "createdAt"
      FROM interviews WHERE application_id = $1
      ORDER BY created_at ASC`,
      [req.params.id]
    );

    res.json({
      ...app,
      applicant: applicantRows[0] || null,
      vacancy: vacancyRows[0] || null,
      referrer,
      interviews: interviewRows,
    });
  } catch (err: any) {
    console.error('Error fetching application detail:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/applications/:id/stage
router.patch('/:id/stage', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { stage, status, internalNotes } = req.body;
    const appId = req.params.id as string;

    const { rows: currentRows } = await client.query(
      `SELECT ja.current_stage, ja.application_status,
        jv.max_retraining_count
       FROM job_applications ja
       JOIN job_vacancies jv ON jv.id = ja.job_vacancy_id
       WHERE ja.id = $1`,
      [appId]
    );
    if (currentRows.length === 0) return res.status(404).json({ error: 'الطلب غير موجود' });
    const current = currentRows[0];

    // Block: Training stage transitions go exclusively through the training module
    if (isTrainingManagedStage(current.current_stage)) {
      return res.status(400).json({
        error: 'لا يمكن تغيير حالة الطلب في مرحلة التدريب إلا من خلال وحدة إدارة الدورات التدريبية',
      });
    }

    // Count existing retraining transitions for this application
    let retrainingCount = 0;
    if (status === 'Retraining') {
      const { rows: rtRows } = await client.query(
        `SELECT COUNT(*) FROM audit_logs
         WHERE application_id = $1 AND action_type = 'Stage Transition'
           AND new_value LIKE '%"Retraining"%'`,
        [appId]
      );
      retrainingCount = parseInt(rtRows[0].count);
    }

    const validationError = validateStageTransition(
      current.current_stage, current.application_status,
      stage, status,
      { retrainingCount, maxRetrainingCount: current.max_retraining_count }
    );
    if (validationError) return res.status(400).json({ error: validationError });

    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE job_applications SET
        current_stage = $1,
        application_status = $2,
        internal_notes = COALESCE($3, internal_notes),
        updated_at = NOW()
      WHERE id = $4
      RETURNING id, current_stage AS "currentStage", application_status AS "applicationStatus", updated_at AS "updatedAt"`,
      [stage, status, internalNotes || null, appId]
    );

    await insertAuditLog(client, {
      entityType: 'job_application',
      entityId: parseInt(appId),
      applicationId: parseInt(appId),
      actionType: 'Stage Transition',
      performedByRole: req.user!.role,
      performedByUserId: req.user!.id,
      oldValue: JSON.stringify({ stage: current.current_stage, status: current.application_status }),
      newValue: JSON.stringify({ stage, status }),
      internalReason: internalNotes || null,
    });

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error updating application stage:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/admin/applications/:id/hire — Final Hired (no override allowed)
router.patch('/:id/hire', requireRole('HR_MANAGER'), async (req, res) => {
  const client = await pool.connect();
  try {
    const appId = req.params.id as string;

    await client.query('BEGIN');

    const { rows: appRows } = await client.query(
      `SELECT ja.id, ja.job_vacancy_id, ja.current_stage, ja.application_status,
        jv.id AS vacancy_id
      FROM job_applications ja
      JOIN job_vacancies jv ON jv.id = ja.job_vacancy_id
      WHERE ja.id = $1`,
      [appId]
    );
    if (appRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }
    const app = appRows[0];

    // Must be at Final Decision with Passed status
    if (app.current_stage !== 'Final Decision' || app.application_status !== 'Passed') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'يجب أن يكون الطلب في مرحلة "القرار النهائي" وحالة "ناجح" لإتمام التوظيف',
      });
    }

    // Capacity check — no override allowed (FOR UPDATE lock is inside checkVacancyCapacity)
    const capacity = await checkVacancyCapacity(client, app.vacancy_id);
    if (!capacity.sufficient) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'لا توجد شواغر متبقية. لا يمكن التوظيف.',
        vacancyCount: capacity.vacancyCount,
      });
    }

    await client.query(
      `UPDATE job_applications SET
        application_status = 'Final Hired',
        updated_at = NOW()
      WHERE id = $1`,
      [appId]
    );

    const { rows: vacRows } = await client.query(
      `UPDATE job_vacancies SET
        vacancy_count = vacancy_count - 1,
        status = CASE WHEN vacancy_count - 1 <= 0 THEN 'Closed' ELSE status END,
        updated_at = NOW()
      WHERE id = $1
      RETURNING vacancy_count AS "vacancyCount", status`,
      [app.vacancy_id]
    );

    await insertAuditLog(client, {
      entityType: 'job_application',
      entityId: parseInt(appId),
      applicationId: parseInt(appId),
      actionType: 'Final Hired',
      performedByRole: req.user!.role,
      performedByUserId: req.user!.id,
      oldValue: JSON.stringify({ stage: app.current_stage, status: app.application_status }),
      newValue: JSON.stringify({
        stage: 'Final Decision', status: 'Final Hired',
        remainingSlots: vacRows[0]?.vacancyCount,
      }),
    });

    await client.query('COMMIT');
    res.json({
      applicationId: parseInt(appId),
      applicationStatus: 'Final Hired',
      currentStage: 'Final Decision',
      vacancyCount: vacRows[0]?.vacancyCount,
      vacancyStatus: vacRows[0]?.status,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error hiring applicant:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/admin/applications/:id/escalate
router.patch('/:id/escalate', requireRole('HR_MANAGER'), async (req, res) => {
  const client = await pool.connect();
  try {
    const appId = req.params.id as string;

    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE job_applications SET
        is_escalated = TRUE,
        escalated_at = NOW(),
        updated_at = NOW()
      WHERE id = $1 AND is_escalated = FALSE
      RETURNING id, is_escalated AS "isEscalated", escalated_at AS "escalatedAt"`,
      [appId]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'الطلب غير موجود أو مُصعَّد بالفعل' });
    }

    await insertAuditLog(client, {
      entityType: 'job_application',
      entityId: parseInt(appId),
      applicationId: parseInt(appId),
      actionType: 'Escalated',
      performedByRole: req.user!.role,
      performedByUserId: req.user!.id,
    });

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error escalating application:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/admin/applications/:id/notes
router.patch('/:id/notes', requireAuth, async (req, res) => {
  try {
    const { notes } = req.body;
    const { rows } = await pool.query(
      `UPDATE job_applications SET internal_notes = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, internal_notes AS "internalNotes"`,
      [notes ? sanitizeText(notes) : null, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'الطلب غير موجود' });
    res.json(rows[0]);
  } catch (err: any) {
    console.error('Error updating notes:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/applications/:id/archive
router.patch('/:id/archive', requireRole('HR_MANAGER'), async (req, res) => {
  const client = await pool.connect();
  try {
    const appId = req.params.id as string;

    const ARCHIVABLE_STATUSES = ['Final Hired', 'Final Rejected', 'Retreated'];

    await client.query('BEGIN');

    const { rows: current } = await client.query(
      `SELECT id, application_status AS "applicationStatus", is_archived AS "isArchived"
       FROM job_applications WHERE id = $1`,
      [appId]
    );
    if (current.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }
    if (!ARCHIVABLE_STATUSES.includes(current[0].applicationStatus)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `لا يمكن أرشفة الطلب إلا في الحالات النهائية: ${ARCHIVABLE_STATUSES.join(', ')}`,
      });
    }
    if (current[0].isArchived) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'الطلب مؤرشف بالفعل' });
    }

    const { rows } = await client.query(
      `UPDATE job_applications SET
        is_archived = TRUE,
        archived_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, is_archived AS "isArchived", archived_at AS "archivedAt"`,
      [appId]
    );

    await insertAuditLog(client, {
      entityType: 'job_application',
      entityId: parseInt(appId),
      applicationId: parseInt(appId),
      actionType: 'Application Archived',
      performedByRole: req.user!.role,
      performedByUserId: req.user!.id,
      oldValue: JSON.stringify({ isArchived: false }),
      newValue: JSON.stringify({ isArchived: true }),
    });

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error archiving application:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/admin/applications/:id/audit-logs
router.get('/:id/audit-logs', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, entity_type AS "entityType", entity_id AS "entityId",
        application_id AS "applicationId",
        action_type AS "actionType",
        performed_by_role AS "performedByRole",
        performed_by_user_id AS "performedByUserId",
        old_value AS "oldValue",
        new_value AS "newValue",
        internal_reason AS "internalReason",
        timestamp
      FROM audit_logs
      WHERE application_id = $1
      ORDER BY timestamp DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err: any) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
