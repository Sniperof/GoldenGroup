import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSchema, seedData } from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import geoUnitsRouter from './routes/geoUnits.js';
import employeesRouter from './routes/employees.js';
import clientsRouter from './routes/clients.js';
import candidatesRouter from './routes/candidates.js';
import referralSheetsRouter from './routes/referralSheets.js';
import routesRouter from './routes/routes.js';
import tasksRouter from './routes/tasks.js';
import contractsRouter from './routes/contracts.js';
import duesRouter from './routes/dues.js';
import deviceModelsRouter from './routes/deviceModels.js';
import sparePartsRouter from './routes/spareParts.js';
import maintenanceRequestsRouter from './routes/maintenanceRequests.js';
import visitsRouter from './routes/visits.js';
import schedulesRouter from './routes/schedules.js';
import routeAssignmentsRouter from './routes/routeAssignments.js';
import dashboardRouter from './routes/dashboard.js';
import vacanciesRouter from './routes/vacancies.js';
import publicVacanciesRouter from './routes/publicVacancies.js';
import publicApplicationsRouter from './routes/publicApplications.js';
import adminApplicationsRouter from './routes/adminApplications.js';
import interviewsRouter from './routes/interviews.js';
import trainingCoursesRouter from './routes/trainingCourses.js';
import publicAreasRouter from './routes/publicAreas.js';
import authRouter from './routes/auth.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRouter);
app.use('/api/geo-units', geoUnitsRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/candidates', candidatesRouter);
app.use('/api/referral-sheets', referralSheetsRouter);
app.use('/api/routes', routesRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/contracts', contractsRouter);
app.use('/api/dues', duesRouter);
app.use('/api/device-models', deviceModelsRouter);
app.use('/api/spare-parts', sparePartsRouter);
app.use('/api/maintenance-requests', maintenanceRequestsRouter);
app.use('/api/visits', visitsRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/route-assignments', routeAssignmentsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/admin/vacancies', vacanciesRouter);
app.use('/api/public/vacancies', publicVacanciesRouter);
app.use('/api/public/applications', publicApplicationsRouter);
app.use('/api/admin/applications', adminApplicationsRouter);
app.use('/api/admin/interviews', interviewsRouter);
app.use('/api/admin/training-courses', trainingCoursesRouter);
app.use('/api/public/areas', publicAreasRouter);

const distPath = path.resolve(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

export async function start() {
  try {
    await createSchema();
    await seedData();
    console.log('Database schema created and seeded.');
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }

  return new Promise<void>((resolve) => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend server running on http://localhost:${PORT}`);
      resolve();
    });
  });
}

const scriptName = process.argv[1] || '';
if (scriptName.includes('index')) {
  start();
}
