import { Router } from 'express';
import pool from '../db.js';
import { insertAuditLog } from '../utils/auditLog.js';

const router = Router();

// POST /api/public/applications — submit application with transaction
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const body = req.body;

    // Validate required fields
    if (!body.applicant?.firstName) {
      return res.status(400).json({ error: 'First name is required' });
    }
    if (!body.applicant?.mobileNumber) {
      return res.status(400).json({ error: 'Mobile number is required' });
    }
    if (!body.jobVacancyId) {
      return res.status(400).json({ error: 'Job vacancy ID is required' });
    }
    // Validate 10-digit mobile
    if (!/^\d{10,11}$/.test(body.applicant.mobileNumber)) {
      return res.status(400).json({ error: 'Mobile number must be 10-11 digits' });
    }
    // Validate email if provided
    if (body.applicant.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.applicant.email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    await client.query('BEGIN');

    // Duplicate check: active application for same mobile + same vacancy
    const { rows: activeApps } = await client.query(
      `SELECT ja.id FROM job_applications ja
       JOIN applicants a ON a.id = ja.applicant_id
       WHERE a.mobile_number = $1 AND ja.job_vacancy_id = $2
         AND ja.application_status NOT IN ('Hired', 'Rejected', 'Withdrawn')`,
      [body.applicant.mobileNumber, body.jobVacancyId]
    );

    if (activeApps.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'An active application already exists for this mobile number and vacancy',
        duplicateApplicationId: activeApps[0].id
      });
    }

    // Check for historical duplicates (flagging only)
    const { rows: histApps } = await client.query(
      `SELECT ja.id FROM job_applications ja
       JOIN applicants a ON a.id = ja.applicant_id
       WHERE a.mobile_number = $1 AND ja.job_vacancy_id = $2
         AND ja.application_status IN ('Hired', 'Rejected', 'Withdrawn')`,
      [body.applicant.mobileNumber, body.jobVacancyId]
    );
    const duplicateFlag = histApps.length > 0;

    // Insert applicant
    const { rows: applicantRows } = await client.query(
      `INSERT INTO applicants (first_name, last_name, dob, gender, marital_status, email,
        mobile_number, governorate, city, sub_area, neighborhood, detailed_address, cv_url, photo_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING id`,
      [
        body.applicant.firstName,
        body.applicant.lastName || null,
        body.applicant.dob || null,
        body.applicant.gender || null,
        body.applicant.maritalStatus || null,
        body.applicant.email || null,
        body.applicant.mobileNumber,
        body.applicant.governorate || null,
        body.applicant.city || null,
        body.applicant.subArea || null,
        body.applicant.neighborhood || null,
        body.applicant.detailedAddress || null,
        body.applicant.cvUrl || null,
        body.applicant.photoUrl || null,
      ]
    );
    const applicantId = applicantRows[0].id;

    // Insert referrer if On-Behalf
    let referrerId: number | null = null;
    if (body.submissionType === 'On-Behalf' && body.referrer) {
      const { rows: refRows } = await client.query(
        `INSERT INTO referrers (type, employee_id, full_name, mobile_number, governorate, city, profession, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING id`,
        [
          body.referrer.type || 'Customer',
          body.referrer.employeeId || null,
          body.referrer.fullName || null,
          body.referrer.mobileNumber || null,
          body.referrer.governorate || null,
          body.referrer.city || null,
          body.referrer.profession || null,
          body.referrer.notes || null,
        ]
      );
      referrerId = refRows[0].id;
    }

    // Insert job application
    const { rows: appRows } = await client.query(
      `INSERT INTO job_applications (job_vacancy_id, applicant_id, referrer_id, submission_type,
        source, current_stage, application_status, duplicate_flag)
      VALUES ($1,$2,$3,$4,$5,'Submitted','New',$6)
      RETURNING id, job_vacancy_id AS "jobVacancyId", applicant_id AS "applicantId",
        referrer_id AS "referrerId", submission_type AS "submissionType", source,
        current_stage AS "currentStage", application_status AS "applicationStatus",
        duplicate_flag AS "duplicateFlag", created_at AS "createdAt"`,
      [
        body.jobVacancyId,
        applicantId,
        referrerId,
        body.submissionType || 'Self',
        body.source || 'Website',
        duplicateFlag,
      ]
    );

    // Audit log
    await insertAuditLog(client, {
      applicationId: appRows[0].id,
      actionType: 'Application Submitted',
      performedByRole: body.submissionType === 'On-Behalf' ? 'Referrer' : 'Applicant',
      newValue: JSON.stringify({
        applicantId,
        referrerId,
        jobVacancyId: body.jobVacancyId,
        submissionType: body.submissionType || 'Self',
        duplicateFlag,
      }),
    });

    await client.query('COMMIT');
    res.status(201).json(appRows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error submitting application:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
