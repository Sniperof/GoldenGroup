import { Router } from 'express';
import pool from '../db.js';
import { insertAuditLog } from '../utils/auditLog.js';

const router = Router();

// GET /api/admin/applications — list with dynamic filters & joins
router.get('/', async (req, res) => {
  try {
    const { vacancyId, branch, gender, stage, status, search } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (vacancyId) {
      conditions.push(`ja.job_vacancy_id = $${idx++}`);
      params.push(vacancyId);
    }
    if (branch) {
      conditions.push(`jv.branch = $${idx++}`);
      params.push(branch);
    }
    if (gender) {
      conditions.push(`a.gender = $${idx++}`);
      params.push(gender);
    }
    if (stage) {
      conditions.push(`ja.current_stage = $${idx++}`);
      params.push(stage);
    }
    if (status) {
      conditions.push(`ja.application_status = $${idx++}`);
      params.push(status);
    }
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
      `SELECT ja.id, ja.job_vacancy_id AS "jobVacancyId",
        ja.applicant_id AS "applicantId",
        ja.referrer_id AS "referrerId",
        ja.submission_type AS "submissionType",
        ja.source,
        ja.current_stage AS "currentStage",
        ja.application_status AS "applicationStatus",
        ja.duplicate_flag AS "duplicateFlag",
        ja.internal_notes AS "internalNotes",
        ja.created_at AS "createdAt",
        ja.updated_at AS "updatedAt",
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

// GET /api/admin/applications/:id — full detail
router.get('/:id', async (req, res) => {
  try {
    // Fetch application
    const { rows: appRows } = await pool.query(
      `SELECT ja.id, ja.job_vacancy_id AS "jobVacancyId",
        ja.applicant_id AS "applicantId",
        ja.referrer_id AS "referrerId",
        ja.submission_type AS "submissionType",
        ja.source,
        ja.current_stage AS "currentStage",
        ja.application_status AS "applicationStatus",
        ja.duplicate_flag AS "duplicateFlag",
        ja.internal_notes AS "internalNotes",
        ja.created_at AS "createdAt",
        ja.updated_at AS "updatedAt"
      FROM job_applications ja WHERE ja.id = $1`,
      [req.params.id]
    );
    if (appRows.length === 0) return res.status(404).json({ error: 'Application not found' });
    const app = appRows[0];

    // Fetch applicant
    const { rows: applicantRows } = await pool.query(
      `SELECT id, first_name AS "firstName", last_name AS "lastName",
        dob, gender, marital_status AS "maritalStatus", email,
        mobile_number AS "mobileNumber", governorate, city,
        sub_area AS "subArea", neighborhood,
        detailed_address AS "detailedAddress",
        cv_url AS "cvUrl", photo_url AS "photoUrl",
        created_at AS "createdAt"
      FROM applicants WHERE id = $1`,
      [app.applicantId]
    );

    // Fetch vacancy
    const { rows: vacancyRows } = await pool.query(
      `SELECT id, title, branch, work_type AS "workType",
        required_gender AS "requiredGender",
        required_age_min AS "requiredAgeMin",
        required_age_max AS "requiredAgeMax",
        required_qualification AS "requiredQualification",
        required_experience_years AS "requiredExperienceYears",
        required_skills AS "requiredSkills",
        responsibilities,
        driving_license_required AS "drivingLicenseRequired",
        vacancy_count AS "vacancyCount",
        start_date AS "startDate",
        end_date AS "endDate",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM job_vacancies WHERE id = $1`,
      [app.jobVacancyId]
    );

    // Fetch referrer if exists
    let referrer = null;
    if (app.referrerId) {
      const { rows: refRows } = await pool.query(
        `SELECT id, type, employee_id AS "employeeId", full_name AS "fullName",
          mobile_number AS "mobileNumber", governorate, city, profession, notes
        FROM referrers WHERE id = $1`,
        [app.referrerId]
      );
      if (refRows.length > 0) referrer = refRows[0];
    }

    res.json({
      ...app,
      applicant: applicantRows[0] || null,
      vacancy: vacancyRows[0] || null,
      referrer,
    });
  } catch (err: any) {
    console.error('Error fetching application detail:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/applications/:id/stage — advance stage with gate validation
router.patch('/:id/stage', async (req, res) => {
  const client = await pool.connect();
  try {
    const { stage, status, internalNotes } = req.body;
    const appId = req.params.id;

    // Fetch current state
    const { rows: currentRows } = await client.query(
      'SELECT current_stage, application_status FROM job_applications WHERE id = $1',
      [appId]
    );
    if (currentRows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    const current = currentRows[0];

    // Stage Gate Validation
    const validationError = validateStageTransition(
      current.current_stage, current.application_status,
      stage, status
    );
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

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
      applicationId: parseInt(appId),
      actionType: 'Stage Transition',
      performedByRole: req.body.performedByRole || 'HR_MANAGER',
      performedByUserId: req.body.performedByUserId || null,
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

// PATCH /api/admin/applications/:id/hire — hire with capacity check
router.patch('/:id/hire', async (req, res) => {
  const client = await pool.connect();
  try {
    const appId = req.params.id;
    const { performedByRole, performedByUserId, overrideCapacity } = req.body;

    await client.query('BEGIN');

    // Get application and linked vacancy
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
      return res.status(404).json({ error: 'Application not found' });
    }
    const app = appRows[0];

    // Capacity check
    if (app.vacancy_count <= 0) {
      if (performedByRole !== 'HR_MANAGER' || !overrideCapacity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'No remaining vacancy slots. Only HR Manager can override.',
          vacancyCount: app.vacancy_count,
        });
      }
    }

    // Update application
    await client.query(
      `UPDATE job_applications SET
        current_stage = 'Final Decision',
        application_status = 'Hired',
        updated_at = NOW()
      WHERE id = $1`,
      [appId]
    );

    // Decrement vacancy count
    const { rows: vacRows } = await client.query(
      `UPDATE job_vacancies SET
        vacancy_count = vacancy_count - 1,
        status = CASE WHEN vacancy_count - 1 <= 0 THEN 'Closed' ELSE status END,
        updated_at = NOW()
      WHERE id = $1
      RETURNING vacancy_count AS "vacancyCount", status`,
      [app.vacancy_id]
    );

    // Audit log
    await insertAuditLog(client, {
      applicationId: parseInt(appId),
      actionType: 'Hired',
      performedByRole: performedByRole || 'HR_MANAGER',
      performedByUserId: performedByUserId || null,
      oldValue: JSON.stringify({ stage: app.current_stage, status: app.application_status }),
      newValue: JSON.stringify({ stage: 'Final Decision', status: 'Hired', remainingSlots: vacRows[0]?.vacancyCount }),
    });

    await client.query('COMMIT');
    res.json({
      applicationId: parseInt(appId),
      applicationStatus: 'Hired',
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

// GET /api/admin/applications/:id/audit-logs
router.get('/:id/audit-logs', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, application_id AS "applicationId",
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

// --- Stage Gate Validation Logic ---
function validateStageTransition(
  currentStage: string, currentStatus: string,
  newStage: string, newStatus: string
): string | null {
  // Define valid transitions
  const stageOrder = ['Submitted', 'Shortlisted', 'HR Interview', 'Training', 'Final Decision'];
  const currentIdx = stageOrder.indexOf(currentStage);
  const newIdx = stageOrder.indexOf(newStage);

  // Rejection and Withdrawal can happen from any stage
  if (newStatus === 'Rejected' || newStatus === 'Withdrawn') {
    return null; // Always allowed
  }

  // Cannot skip stages (must advance one at a time or stay in same stage)
  if (newIdx > currentIdx + 1) {
    return `Cannot skip stages. Current: ${currentStage}, Requested: ${newStage}`;
  }
  if (newIdx < currentIdx) {
    return `Cannot go back to a previous stage. Current: ${currentStage}, Requested: ${newStage}`;
  }

  // Stage-specific gate rules
  switch (newStage) {
    case 'Shortlisted':
      // Moving to Shortlisted: must be from Submitted stage
      if (currentStage !== 'Submitted') {
        return 'Can only shortlist from Submitted stage';
      }
      break;

    case 'HR Interview':
      // Must be Qualified from Shortlisted stage to proceed
      if (currentStage === 'Shortlisted' && currentStatus !== 'Qualified') {
        return 'Must be Qualified before scheduling an interview';
      }
      break;

    case 'Training':
      // Must have completed interview (Approved) to enter Training
      if (currentStage === 'HR Interview' && currentStatus !== 'Approved') {
        return 'Must be Approved from HR Interview before entering Training';
      }
      break;

    case 'Final Decision':
      // Must have completed Training
      if (currentStage === 'Training' && !['Training Completed', 'Passed'].includes(currentStatus)) {
        return 'Must complete Training before Final Decision';
      }
      break;
  }

  return null; // Valid transition
}

export default router;
