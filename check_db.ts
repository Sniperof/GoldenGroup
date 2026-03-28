import { createSchema, seedData } from './server/schema.js';
try {
    await createSchema();
    await seedData();
    console.log('Schema update successful');
} catch (e) {
    console.log('Error:', e.message);
} finally {
    process.exit();
}
