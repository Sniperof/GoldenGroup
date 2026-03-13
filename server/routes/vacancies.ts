import { Router } from 'express';
import pool from '../db.js';
import { insertAuditLog } from '../utils/auditLog.js';

const router = Router();

const VACANCY_COLS = `
  id, title, branch,
  governorate, city_or_area AS "cityOrArea", sub_area AS "subArea",
  neighborhood, detailed_address AS "detailedAddress",
  work_type AS "workType", required_gender AS "requiredGender",
  required_age_min AS "requiredAgeMin", required_age_max AS "requiredAgeMax",
  email,
  required_qualification AS "requiredQualification",
  required_specialization AS "requiredSpecialization",
  required_experience_years AS "requiredExperienceYears",
  required_skills AS "requiredSkills", responsibilities,
  driving_license_required AS "drivingLicenseRequired",
  vacancy_count AS "vacancyCount", max_retraining_count AS "maxRetrainingCount",
  start_date AS "startDate", end_date AS "endDate",
  status, created_at AS "createdAt", updated_at AS "updatedAt"
`;

// GET /api/admin/vacancies
router.get('/', async (req, res) => {
  try {
    const { status, branch, search } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (status) { conditions.push(`status = $${idx++}`); params.push(status); }
    if (branch) { conditions.push(`branch = $${idx++}`); params.push(branch); }
    if (search) {
      conditions.push(`(CAST(id AS TEXT) LIKE $${idx} OR title ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT ${VACANCY_COLS} FROM job_vacancies ${where} ORDER BY created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err: any) {
    console.error('Error fetching vacancies:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/vacancies
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const v = req.body;

    if (!v.title?.trim()) return res.status(400).json({ error: 'عنوان الوظيفة مطلوب' });
    if (!v.branch?.trim()) return res.status(400).json({ error: 'الفرع مطلوب' });
    if (!v.vacancyCount || v.vacancyCount <= 0) return res.status(400).json({ error: 'عدد الشواغر يجب أن يكون أكبر من 0' });
    if (!v.startDate) return res.status(400).json({ error: 'تاريخ البداية مطلوب' });
    if (!v.endDate) return res.status(400).json({ error: 'تاريخ النهاية مطلوب' });
    if (new Date(v.startDate) > new Date(v.endDate)) return res.status(400).json({ error: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية' });

    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO job_vacancies (
        title, branch, governorate, city_or_area, sub_area, neighborhood, detailed_address,
        work_type, required_gender, required_age_min, required_age_max, email,
        required_qualification, required_specialization, required_experience_years,
        required_skills, responsibilities, driving_license_required,
        vacancy_count, max_retraining_count, start_date, end_date, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,'Open')
      RETURNING ${VACANCY_COLS}`,
      [
        v.title, v.branch,
        v.governorate || null, v.cityOrArea || null, v.subArea || null,
        v.neighborhood || null, v.detailedAddress || null,
        v.workType || null, v.requiredGender || null,
        v.requiredAgeMin || null, v.requiredAgeMax || null, v.email || null,
        v.requiredQualification || null, v.requiredSpecialization || null,
        v.requiredExperienceYears || null,
        v.requiredSkills || null, v.responsibilities || null,
        v.drivingLicenseRequired || false,
        v.vacancyCount, v.maxRetrainingCount || 1,
        v.startDate, v.endDate,
      ]
    );

    await insertAuditLog(client, {
      entityType: 'job_vacancy',
      entityId: rows[0].id,
      actionType: 'Job Vacancy Created',
      performedByRole: v.performedByRole || 'HR_MANAGER',
      performedByUserId: v.performedByUserId || null,
      newValue: JSON.stringify({ title: v.title, branch: v.branch }),
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

// PUT /api/admin/vacancies/:id — 3-tier edit
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const v = req.body;
    const vacancyId = req.params.id;

    // Determine edit tier
    const { rows: appCountRows } = await client.query(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN current_stage != 'Submitted' THEN 1 ELSE 0 END) AS past_submitted
       FROM job_applications WHERE job_vacancy_id = $1`,
      [vacancyId]
    );
    const total = parseInt(appCountRows[0].total);
    const pastSubmitted = parseInt(appCountRows[0].past_submitted || '0');

    let rows: any[];
    let editTier: 1 | 2 | 3;

    if (total === 0) {
      // Tier 1: full edit
      editTier = 1;
      if (!v.title?.trim()) return res.status(400).json({ error: 'عنوان الوظيفة مطلوب' });
      if (!v.branch?.trim()) return res.status(400).json({ error: 'الفرع مطلوب' });
      if (!v.vacancyCount || v.vacancyCount <= 0) return res.status(400).json({ error: 'عدد الشواغر يجب أن يكون أكبر من 0' });
      if (!v.startDate || !v.endDate) return res.status(400).json({ error: 'تواريخ البداية والنهاية مطلوبة' });
      if (new Date(v.startDate) > new Date(v.endDate)) return res.status(400).json({ error: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية' });

      await client.query('BEGIN');
      const result = await client.query(
        `UPDATE job_vacancies SET
          title=$1, branch=$2, governorate=$3, city_or_area=$4, sub_area=$5,
          neighborhood=$6, detailed_address=$7, work_type=$8, required_gender=$9,
          required_age_min=$10, required_age_max=$11, email=$12,
          required_qualification=$13, required_specialization=$14,
          required_experience_years=$15, required_skills=$16, responsibilities=$17,
          driving_license_required=$18, vacancy_count=$19, max_retraining_count=$20,
          start_date=$21, end_date=$22, updated_at=NOW()
        WHERE id=$23
        RETURNING ${VACANCY_COLS}`,
        [
          v.title, v.branch,
          v.governorate || null, v.cityOrArea || null, v.subArea || null,
          v.neighborhood || null, v.detailedAddress || null,
          v.workType || null, v.requiredGender || null,
          v.requiredAgeMin || null, v.requiredAgeMax || null, v.email || null,
          v.requiredQualification || null, v.requiredSpecialization || null,
          v.requiredExperienceYears || null,
          v.requiredSkills || null, v.responsibilities || null,
          v.drivingLicenseRequired || false,
          v.vacancyCount, v.maxRetrainingCount || 1,
          v.startDate, v.endDate, vacancyId,
        ]
      );
      rows = result.rows;
    } else if (pastSubmitted === 0) {
      // Tier 2: restricted — end_date, responsibilities, required_skills, email, max_retraining_count
      editTier = 2;
      await client.query('BEGIN');
      const result = await client.query(
        `UPDATE job_vacancies SET
          end_date=$1, responsibilities=$2, required_skills=$3,
          email=$4, max_retraining_count=$5, updated_at=NOW()
        WHERE id=$6
        RETURNING ${VACANCY_COLS}`,
        [
          v.endDate || null, v.responsibilities || null, v.requiredSkills || null,
          v.email || null, v.maxRetrainingCount || 1, vacancyId,
        ]
      );
      rows = result.rows;
    } else {
      // Tier 3: minimal — only end_date
      editTier = 3;
      await client.query('BEGIN');
      const result = await client.query(
        `UPDATE job_vacancies SET end_date=$1, updated_at=NOW()
        WHERE id=$2
        RETURNING ${VACANCY_COLS}`,
        [v.endDate || null, vacancyId]
      );
      rows = result.rows;
    }

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'الشاغر غير موجود' });
    }

    await insertAuditLog(client, {
      entityType: 'job_vacancy',
      entityId: parseInt(vacancyId),
      actionType: 'Job Vacancy Updated',
      performedByRole: v.performedByRole || 'HR_MANAGER',
      performedByUserId: v.performedByUserId || null,
      newValue: JSON.stringify({ editTier }),
    });

    await client.query('COMMIT');
    res.json({ ...rows[0], editTier });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error updating vacancy:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/admin/vacancies/:id/status
router.patch('/:id/status', async (req, res) => {
  const client = await pool.connect();
  try {
    const { status, performedByRole, performedByUserId } = req.body;
    if (!['Open', 'Closed', 'Archived'].includes(status)) {
      return res.status(400).json({ error: 'الحالة يجب أن تكون Open أو Closed أو Archived' });
    }

    await client.query('BEGIN');

    // Get current status for validation
    const { rows: current } = await client.query(
      'SELECT status FROM job_vacancies WHERE id = $1',
      [req.params.id]
    );
    if (current.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'الشاغر غير موجود' });
    }

    // Validate transitions: Open↔Closed, Closed→Archived (cannot unarchive)
    const from = current[0].status;
    if (from === 'Archived') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'لا يمكن تغيير حالة شاغر مؤرشف' });
    }
    if (status === 'Archived' && from !== 'Closed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'يجب إغلاق الشاغر قبل أرشفته' });
    }

    const { rows } = await client.query(
      `UPDATE job_vacancies SET status=$1, updated_at=NOW() WHERE id=$2
       RETURNING id, title, status`,
      [status, req.params.id]
    );

    await insertAuditLog(client, {
      entityType: 'job_vacancy',
      entityId: parseInt(req.params.id),
      actionType: 'Vacancy Status Changed',
      performedByRole: performedByRole || 'HR_MANAGER',
      performedByUserId: performedByUserId || null,
      oldValue: from,
      newValue: status,
    });

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error updating vacancy status:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
