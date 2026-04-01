import pool from './server/db.js';
try {
    const name = 'Test Branch';
    const status = 'active';
    const locationGeoId = null;
    const coveredGeoIds = [];
    const { rows } = await pool.query(
      `INSERT INTO branches (name, location_geo_id, covered_geo_ids, status) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
      [name, locationGeoId, JSON.stringify(coveredGeoIds), status]
    );
    console.log('Inserted ID:', rows[0].id);
    await pool.query('DELETE FROM branches WHERE id = $1', [rows[0].id]);
    console.log('Cleanup successful');
} catch (e: any) {
    console.log('Error:', e.message);
} finally {
    process.exit();
}
