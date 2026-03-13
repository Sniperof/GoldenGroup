import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/public/vacancies — only open vacancies with all fields
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
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
        start_date AS "startDate", end_date AS "endDate", status
      FROM job_vacancies
      WHERE status = 'Open'
      ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err: any) {
    console.error('Error fetching public vacancies:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
