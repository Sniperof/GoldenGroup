import { Router } from 'express';
import pool from '../db.js';
import { insertAuditLog } from '../utils/auditLog.js';

const router = Router();

// GET /api/admin/vacancies — list with filters
router.get('/', async (req, res) => {
  try {
    const { status, branch, search } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (status) {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }
    if (branch) {
      conditions.push(`branch = $${idx++}`);
      params.push(branch);
    }
    if (search) {
      conditions.push(`(CAST(id AS TEXT) LIKE $${idx} OR title ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
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
      FROM job_vacancies ${where}
      ORDER BY created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err: any) {
    console.error('Error fetching vacancies:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/vacancies — create vacancy
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const v = req.body;

    // Validations
    if (!v.title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!v.vacancyCount || v.vacancyCount <= 0) {
      return res.status(400).json({ error: 'Vacancy count must be greater than 0' });
    }
    if (v.startDate && v.endDate && new Date(v.startDate) > new Date(v.endDate)) {
      return res.status(400).json({ error: 'Start date must be before or equal to end date' });
    }

    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO job_vacancies (title, branch, work_type, required_gender, required_age_min,
        required_age_max, required_qualification, required_experience_years, required_skills,
        responsibilities, driving_license_required, vacancy_count, start_date, end_date, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'Open')
      RETURNING id, title, branch, work_type AS "workType",
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
        updated_at AS "updatedAt"`,
      [
        v.title, v.branch || null, v.workType || null, v.requiredGender || null,
        v.requiredAgeMin || null, v.requiredAgeMax || null,
        v.requiredQualification || null, v.requiredExperienceYears || null,
        v.requiredSkills || null, v.responsibilities || null,
        v.drivingLicenseRequired || false, v.vacancyCount,
        v.startDate || null, v.endDate || null
      ]
    );

    // Audit log — use a placeholder application_id (0) for vacancy-level actions
    // We'll use a negative of the vacancy id to distinguish vacancy-level logs
    await insertAuditLog(client, {
      applicationId: 0,
      actionType: 'Job Vacancy Created',
      performedByRole: v.performedByRole || 'HR_MANAGER',
      performedByUserId: v.performedByUserId || null,
      newValue: JSON.stringify({ vacancyId: rows[0].id, title: v.title }),
    });

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error creating vacancy:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/admin/vacancies/:id — update vacancy
router.put('/:id', async (req, res) => {
  try {
    const v = req.body;
    const vacancyId = req.params.id;

    // Check if applications exist for this vacancy
    const { rows: appRows } = await pool.query(
      'SELECT COUNT(*) FROM job_applications WHERE job_vacancy_id = $1',
      [vacancyId]
    );
    const hasApplications = parseInt(appRows[0].count) > 0;

    if (hasApplications) {
      // Restricted edit: only end_date, responsibilities, required_skills
      const { rows } = await pool.query(
        `UPDATE job_vacancies SET
          end_date = $1,
          responsibilities = $2,
          required_skills = $3,
          updated_at = NOW()
        WHERE id = $4
        RETURNING id, title, branch, work_type AS "workType",
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
          updated_at AS "updatedAt"`,
        [v.endDate || null, v.responsibilities || null, v.requiredSkills || null, vacancyId]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Vacancy not found' });
      res.json({ ...rows[0], restricted: true });
    } else {
      // Full edit
      if (v.startDate && v.endDate && new Date(v.startDate) > new Date(v.endDate)) {
        return res.status(400).json({ error: 'Start date must be before or equal to end date' });
      }
      if (v.vacancyCount !== undefined && v.vacancyCount <= 0) {
        return res.status(400).json({ error: 'Vacancy count must be greater than 0' });
      }

      const { rows } = await pool.query(
        `UPDATE job_vacancies SET
          title = $1, branch = $2, work_type = $3, required_gender = $4,
          required_age_min = $5, required_age_max = $6, required_qualification = $7,
          required_experience_years = $8, required_skills = $9, responsibilities = $10,
          driving_license_required = $11, vacancy_count = $12, start_date = $13,
          end_date = $14, updated_at = NOW()
        WHERE id = $15
        RETURNING id, title, branch, work_type AS "workType",
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
          updated_at AS "updatedAt"`,
        [
          v.title, v.branch || null, v.workType || null, v.requiredGender || null,
          v.requiredAgeMin || null, v.requiredAgeMax || null,
          v.requiredQualification || null, v.requiredExperienceYears || null,
          v.requiredSkills || null, v.responsibilities || null,
          v.drivingLicenseRequired || false, v.vacancyCount,
          v.startDate || null, v.endDate || null, vacancyId
        ]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Vacancy not found' });
      res.json({ ...rows[0], restricted: false });
    }
  } catch (err: any) {
    console.error('Error updating vacancy:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/vacancies/:id/status — update status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Closed', 'Archived'].includes(status)) {
      return res.status(400).json({ error: 'Status must be Closed or Archived' });
    }

    const { rows } = await pool.query(
      `UPDATE job_vacancies SET status = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, title, status`,
      [status, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Vacancy not found' });
    res.json(rows[0]);
  } catch (err: any) {
    console.error('Error updating vacancy status:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
