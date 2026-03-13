import { Router } from 'express';
import pool from '../db.js';
import { insertAuditLog } from '../utils/auditLog.js';

const router = Router();

// POST /api/public/applications
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const body = req.body;
    const a = body.applicant || {};

    // Validate required fields
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
    const applicationSource = body.applicationSource || 'Website';
    if (!['Mobile App', 'Website', 'External Platforms', 'Internal'].includes(applicationSource)) {
      return res.status(400).json({ error: 'مصدر الطلب غير صالح' });
    }
    if (submissionType === 'Refer a Candidate' && !body.referrer?.fullName?.trim()) {
      return res.status(400).json({ error: 'اسم المُعرّف مطلوب عند التقديم نيابة عن مرشح' });
    }

    await client.query('BEGIN');

    // Vacancy existence check
    const { rows: vacRows } = await client.query(
      `SELECT id, status FROM job_vacancies WHERE id = $1`,
      [body.jobVacancyId]
    );
    if (vacRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'الشاغر الوظيفي غير موجود' });
    }
    if (vacRows[0].status !== 'Open') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'الشاغر الوظيفي غير مفتوح للتقديم' });
    }

    // Duplicate check: active application for same mobile + same vacancy
    const FINAL_STATUSES = ['Final Hired', 'Final Rejected', 'Retreated', 'Rejected', 'Interview Failed'];
    const { rows: activeApps } = await client.query(
      `SELECT ja.id FROM job_applications ja
       JOIN applicants ap ON ap.id = ja.applicant_id
       WHERE ap.mobile_number = $1 AND ja.job_vacancy_id = $2
         AND ja.application_status NOT IN (${FINAL_STATUSES.map((_, i) => `$${i + 3}`).join(',')})`,
      [a.mobileNumber, body.jobVacancyId, ...FINAL_STATUSES]
    );
    if (activeApps.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'يوجد طلب نشط بالفعل لهذا الرقم والشاغر الوظيفي',
        duplicateApplicationId: activeApps[0].id,
      });
    }

    // Check for historical duplicates (flag only)
    const { rows: histApps } = await client.query(
      `SELECT ja.id FROM job_applications ja
       JOIN applicants ap ON ap.id = ja.applicant_id
       WHERE ap.mobile_number = $1 AND ja.job_vacancy_id = $2
         AND ja.application_status IN (${FINAL_STATUSES.map((_, i) => `$${i + 3}`).join(',')})`,
      [a.mobileNumber, body.jobVacancyId, ...FINAL_STATUSES]
    );
    const duplicateFlag = histApps.length > 0;

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
          r.fullName, r.lastName || null, r.mobileNumber || null,
          r.governorate || null, r.cityOrArea || null,
          r.subArea || null, r.neighborhood || null,
          r.detailedAddress || null, r.referrerWork || null, r.referrerNotes || null,
        ]
      );
      referrerId = refRows[0].id;
    }

    // Insert job application
    const { rows: appRows } = await client.query(
      `INSERT INTO job_applications (
        job_vacancy_id, applicant_id, referrer_id, submission_type,
        application_source, entered_by_user_id, entered_by_name,
        current_stage, application_status, duplicate_flag
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,'Submitted','New',$8)
      RETURNING id, job_vacancy_id AS "jobVacancyId", applicant_id AS "applicantId",
        referrer_id AS "referrerId", submission_type AS "submissionType",
        application_source AS "applicationSource",
        current_stage AS "currentStage", application_status AS "applicationStatus",
        duplicate_flag AS "duplicateFlag", created_at AS "createdAt"`,
      [
        body.jobVacancyId, applicantId, referrerId,
        submissionType, applicationSource,
        body.enteredByUserId || null, body.enteredByName || null,
        duplicateFlag,
      ]
    );

    await insertAuditLog(client, {
      entityType: 'job_application',
      entityId: appRows[0].id,
      applicationId: appRows[0].id,
      actionType: 'Application Submitted',
      performedByRole: submissionType === 'Refer a Candidate' ? 'Referrer' : 'Applicant',
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
    console.error('Error submitting application:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
