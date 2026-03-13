import { Router } from 'express';
import pool from '../db.js';
import { insertAuditLog } from '../utils/auditLog.js';

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

// GET /api/admin/interviews?applicationId=&interviewerName=&date=&vacancyId=
router.get('/', async (req, res) => {
  try {
    const { applicationId, interviewerName, date, vacancyId } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (applicationId) { conditions.push(`i.application_id = $${idx++}`); params.push(applicationId); }
    if (interviewerName) { conditions.push(`i.interviewer_name ILIKE $${idx++}`); params.push(`%${interviewerName}%`); }
    if (date) { conditions.push(`i.interview_date = $${idx++}`); params.push(date); }
    if (vacancyId) { conditions.push(`ja.job_vacancy_id = $${idx++}`); params.push(vacancyId); }

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
router.post('/', async (req, res) => {
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

    const { rows } = await client.query(
      `INSERT INTO interviews (
        application_id, interview_type, interview_number,
        interviewer_name, interview_date, interview_time,
        interview_status, internal_notes
      ) VALUES ($1,$2,$3,$4,$5,$6,'Interview Scheduled',$7)
      RETURNING ${INTERVIEW_COLS}`,
      [
        b.applicationId, b.interviewType, b.interviewNumber,
        b.interviewerName, b.interviewDate, b.interviewTime,
        b.internalNotes || null,
      ]
    );

    await insertAuditLog(client, {
      entityType: 'interview',
      entityId: rows[0].id,
      applicationId: b.applicationId,
      actionType: 'Interview Scheduled',
      performedByRole: b.performedByRole || 'HR_MANAGER',
      performedByUserId: b.performedByUserId || null,
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

// PATCH /api/admin/interviews/:id — update interview result
router.patch('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { interviewStatus, internalNotes, performedByRole, performedByUserId } = req.body;

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
      [interviewStatus, internalNotes || null, req.params.id]
    );

    await insertAuditLog(client, {
      entityType: 'interview',
      entityId: parseInt(req.params.id),
      applicationId: current[0].application_id,
      actionType: 'Interview Result Recorded',
      performedByRole: performedByRole || 'HR_MANAGER',
      performedByUserId: performedByUserId || null,
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
