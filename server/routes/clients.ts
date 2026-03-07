import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT id, name, mobile, contacts,
      governorate, district, neighborhood,
      detailed_address AS "detailedAddress",
      gps_coordinates AS "gpsCoordinates",
      source_channel AS "sourceChannel",
      referrer_type AS "referrerType",
      referrer_id AS "referrerId",
      referrer_name AS "referrerName",
      referral_entity_id AS "referralEntityId",
      referral_date AS "referralDate",
      referral_reason AS "referralReason",
      referral_sheet_id AS "referralSheetId",
      referral_address_text AS "referralAddressText",
      created_at AS "createdAt",
      is_candidate AS "isCandidate",
      target_client AS "targetClient",
      candidate_status AS "candidateStatus"
    FROM clients ORDER BY id
  `);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const c = req.body;
  const { rows } = await pool.query(
    `INSERT INTO clients (name, mobile, contacts, governorate, district, neighborhood,
      detailed_address, gps_coordinates, source_channel, referrer_type, referrer_id,
      referrer_name, referral_entity_id, referral_date, referral_reason, referral_sheet_id,
      referral_address_text, is_candidate, target_client, candidate_status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
    RETURNING *, detailed_address AS "detailedAddress", gps_coordinates AS "gpsCoordinates",
      source_channel AS "sourceChannel", referrer_type AS "referrerType", referrer_id AS "referrerId",
      referrer_name AS "referrerName", referral_entity_id AS "referralEntityId",
      referral_date AS "referralDate", referral_reason AS "referralReason",
      referral_sheet_id AS "referralSheetId", referral_address_text AS "referralAddressText",
      created_at AS "createdAt", is_candidate AS "isCandidate",
      target_client AS "targetClient", candidate_status AS "candidateStatus"`,
    [c.name, c.mobile, JSON.stringify(c.contacts || []),
     c.governorate || '', c.district || '', c.neighborhood || '',
     c.detailedAddress || null, c.gpsCoordinates ? JSON.stringify(c.gpsCoordinates) : null,
     c.sourceChannel || null, c.referrerType || null, c.referrerId || null,
     c.referrerName || null, c.referralEntityId || null, c.referralDate || null,
     c.referralReason || null, c.referralSheetId || null, c.referralAddressText || null,
     c.isCandidate || false, c.targetClient || null, c.candidateStatus || null]
  );
  res.json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const c = req.body;
  const { rows } = await pool.query(
    `UPDATE clients SET name=$1, mobile=$2, contacts=$3, governorate=$4, district=$5,
      neighborhood=$6, detailed_address=$7, gps_coordinates=$8, source_channel=$9,
      referrer_type=$10, referrer_id=$11, referrer_name=$12, referral_entity_id=$13,
      referral_date=$14, referral_reason=$15, referral_sheet_id=$16, referral_address_text=$17,
      is_candidate=$18, target_client=$19, candidate_status=$20
    WHERE id=$21
    RETURNING *, detailed_address AS "detailedAddress", gps_coordinates AS "gpsCoordinates",
      source_channel AS "sourceChannel", referrer_type AS "referrerType", referrer_id AS "referrerId",
      referrer_name AS "referrerName", referral_entity_id AS "referralEntityId",
      referral_date AS "referralDate", referral_reason AS "referralReason",
      referral_sheet_id AS "referralSheetId", referral_address_text AS "referralAddressText",
      created_at AS "createdAt", is_candidate AS "isCandidate",
      target_client AS "targetClient", candidate_status AS "candidateStatus"`,
    [c.name, c.mobile, JSON.stringify(c.contacts || []),
     c.governorate || '', c.district || '', c.neighborhood || '',
     c.detailedAddress || null, c.gpsCoordinates ? JSON.stringify(c.gpsCoordinates) : null,
     c.sourceChannel || null, c.referrerType || null, c.referrerId || null,
     c.referrerName || null, c.referralEntityId || null, c.referralDate || null,
     c.referralReason || null, c.referralSheetId || null, c.referralAddressText || null,
     c.isCandidate || false, c.targetClient || null, c.candidateStatus || null,
     req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

router.post('/bulk-delete', async (req, res) => {
  const { ids } = req.body;
  if (ids && ids.length > 0) {
    await pool.query('DELETE FROM clients WHERE id = ANY($1)', [ids]);
  }
  res.json({ success: true });
});

export default router;
