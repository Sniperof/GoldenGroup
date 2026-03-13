import { Router } from 'express';
import pool from '../db.js';
import { insertAuditLog } from '../utils/auditLog.js';
import { validateStageTransition, isTerminalStatus, isTrainingManagedStage } from '../utils/stageEngine.js';

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
  ja.updated_at AS "updatedAt"
`;

// GET /api/admin/applications
router.get('/', async (req, res) => {
  try {
    const { vacancyId, branch, gender, stage, status, search } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (vacancyId) { conditions.push(`ja.job_vacancy_id = $${idx++}`); params.push(vacancyId); }
    if (branch) { conditions.push(`jv.branch = $${idx++}`); params.push(branch); }
    if (gender) { conditions.push(`a.gender = $${idx++}`); params.push(gender); }
    if (stage) { conditions.push(`ja.current_stage = $${idx++}`); params.push(stage); }
    if (status) { conditions.push(`ja.application_status = $${idx++}`); params.push(status); }
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

// GET /api/admin/applications/:id
router.get('/:id', async (req, res) => {
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
router.patch('/:id/stage', async (req, res) => {
  const client = await pool.connect();
  try {
    const { stage, status, internalNotes, performedByRole, performedByUserId } = req.body;
    const appId = req.params.id;

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
      performedByRole: performedByRole || 'HR_MANAGER',
      performedByUserId: performedByUserId || null,
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
router.patch('/:id/hire', async (req, res) => {
  const client = await pool.connect();
  try {
    const appId = req.params.id;
    const { performedByRole, performedByUserId } = req.body;

    await client.query('BEGIN');

    const { rows: appRows } = await client.query(
      `SELECT ja.id, ja.job_vacancy_id, ja.current_stage, ja.application_status,
        jv.vacancy_count, jv.id AS vacancy_id
      FROM job_applications ja
      JOIN job_vacancies jv ON jv.id = ja.job_vacancy_id
      WHERE ja.id = $1
      FOR UPDATE`,
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

    // Capacity check — no override allowed
    if (app.vacancy_count <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'لا توجد شواغر متبقية. لا يمكن التوظيف.',
        vacancyCount: app.vacancy_count,
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
      performedByRole: performedByRole || 'HR_MANAGER',
      performedByUserId: performedByUserId || null,
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
router.patch('/:id/escalate', async (req, res) => {
  const client = await pool.connect();
  try {
    const appId = req.params.id;
    const { performedByRole, performedByUserId } = req.body;

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
      performedByRole: performedByRole || 'HR_MANAGER',
      performedByUserId: performedByUserId || null,
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
router.patch('/:id/notes', async (req, res) => {
  try {
    const { notes } = req.body;
    const { rows } = await pool.query(
      `UPDATE job_applications SET internal_notes = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, internal_notes AS "internalNotes"`,
      [notes || null, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'الطلب غير موجود' });
    res.json(rows[0]);
  } catch (err: any) {
    console.error('Error updating notes:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/applications/:id/audit-logs
router.get('/:id/audit-logs', async (req, res) => {
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
