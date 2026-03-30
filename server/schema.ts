import pool from './db.js';

export async function createSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS geo_units (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      level INTEGER NOT NULL,
      parent_id INTEGER REFERENCES geo_units(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS employees (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL CHECK (role IN ('supervisor', 'technician', 'telemarketer')),
      mobile VARCHAR(50) NOT NULL,
      branch VARCHAR(255),
      residence VARCHAR(255),
      status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'leave', 'inactive')),
      job_title VARCHAR(255),
      avatar TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      mobile VARCHAR(50) NOT NULL,
      contacts JSONB DEFAULT '[]',
      governorate VARCHAR(255) DEFAULT '',
      district VARCHAR(255) DEFAULT '',
      neighborhood VARCHAR(255) DEFAULT '',
      detailed_address TEXT,
      gps_coordinates JSONB,
      source_channel VARCHAR(255),
      referrer_type VARCHAR(255),
      referrer_id INTEGER,
      referrer_name VARCHAR(255),
      referral_entity_id INTEGER,
      referral_date VARCHAR(50),
      referral_reason TEXT,
      referral_sheet_id INTEGER,
      referral_address_text TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      is_candidate BOOLEAN DEFAULT FALSE,
      target_client VARCHAR(255),
      candidate_status VARCHAR(50)
    );

    CREATE TABLE IF NOT EXISTS referral_sheets (
      id SERIAL PRIMARY KEY,
      referral_type VARCHAR(100) NOT NULL,
      referral_entity_id INTEGER,
      referral_name_snapshot VARCHAR(255),
      referral_address_text TEXT,
      referral_origin_channel VARCHAR(100),
      referral_notes TEXT,
      referral_date VARCHAR(50),
      owner_user_id INTEGER NOT NULL,
      status VARCHAR(50) DEFAULT 'New' CHECK (status IN ('New', 'In-Progress', 'Completed', 'Archived')),
      total_candidates INTEGER DEFAULT 0,
      quality_percentage REAL DEFAULT 0,
      conversion_percentage REAL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      created_by INTEGER
    );

    CREATE TABLE IF NOT EXISTS candidates (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      nickname VARCHAR(255),
      mobile VARCHAR(50) NOT NULL,
      contacts JSONB DEFAULT '[]',
      address_text TEXT,
      geo_unit_id INTEGER,
      owner_user_id INTEGER,
      status VARCHAR(50) DEFAULT 'Suggested' CHECK (status IN ('New', 'Suggested', 'FollowUp', 'Contacted', 'Qualified', 'Junk')),
      referral_sheet_id INTEGER REFERENCES referral_sheets(id) ON DELETE SET NULL,
      referral_date VARCHAR(50),
      referral_reason TEXT,
      referral_type VARCHAR(100),
      referral_origin_channel VARCHAR(100),
      referral_name_snapshot VARCHAR(255),
      referral_entity_id INTEGER,
      referral_confirmation_status VARCHAR(50) DEFAULT 'Pending',
      occupation VARCHAR(255),
      candidate_notes TEXT,
      duplicate_flag BOOLEAN DEFAULT FALSE,
      duplicate_type VARCHAR(50),
      duplicate_reference_id INTEGER,
      converted_to_lead_id INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      created_by INTEGER
    );

    CREATE TABLE IF NOT EXISTS routes (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS route_points (
      id SERIAL PRIMARY KEY,
      route_id INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
      geo_unit_id INTEGER NOT NULL,
      level INTEGER NOT NULL,
      point_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      type VARCHAR(50) NOT NULL CHECK (type IN ('emergency', 'dues', 'periodic', 'returns', 'followup')),
      customer_name VARCHAR(255) NOT NULL,
      context TEXT,
      location VARCHAR(255),
      due_date DATE,
      status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
      priority VARCHAR(50) CHECK (priority IN ('high', 'medium', 'low'))
    );

    CREATE TABLE IF NOT EXISTS device_models (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      brand VARCHAR(255),
      category VARCHAR(50) CHECK (category IN ('Residential', 'Industrial', 'Commercial')),
      maintenance_interval VARCHAR(50),
      base_price NUMERIC DEFAULT 0,
      supported_visit_types JSONB DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS spare_parts (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(100),
      base_price NUMERIC DEFAULT 0,
      maintenance_type VARCHAR(50) CHECK (maintenance_type IN ('Periodic', 'Emergency', 'Accessory')),
      compatible_device_ids JSONB DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id SERIAL PRIMARY KEY,
      contract_number VARCHAR(100) UNIQUE,
      customer_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      customer_name VARCHAR(255),
      contract_date VARCHAR(50),
      source_visit VARCHAR(255),
      device_model_id INTEGER REFERENCES device_models(id) ON DELETE SET NULL,
      device_model_name VARCHAR(255),
      serial_number VARCHAR(255),
      maintenance_plan VARCHAR(10),
      base_price NUMERIC DEFAULT 0,
      final_price NUMERIC DEFAULT 0,
      payment_type VARCHAR(50) DEFAULT 'cash',
      down_payment NUMERIC DEFAULT 0,
      installments_count INTEGER DEFAULT 0,
      delivery_date VARCHAR(50),
      installation_date VARCHAR(50),
      status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS dues (
      id SERIAL PRIMARY KEY,
      contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      scheduled_date VARCHAR(50),
      adjusted_date VARCHAR(50),
      original_amount NUMERIC DEFAULT 0,
      remaining_balance NUMERIC DEFAULT 0,
      assigned_telemarketer_id INTEGER,
      status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Partial', 'Paid', 'Overdue')),
      escalated BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS maintenance_requests (
      id SERIAL PRIMARY KEY,
      request_date TIMESTAMPTZ,
      customer_id INTEGER,
      customer_name VARCHAR(255),
      contract_id INTEGER,
      device_model_name VARCHAR(255),
      priority VARCHAR(50) DEFAULT 'Normal',
      problem_description TEXT,
      technician_id INTEGER,
      telemarketer_id INTEGER,
      last_follow_up_date TIMESTAMPTZ,
      resolution_status VARCHAR(50) DEFAULT 'Pending',
      visit_type VARCHAR(50),
      location VARCHAR(255),
      notes TEXT,
      technical_report JSONB
    );

    CREATE TABLE IF NOT EXISTS visits (
      id VARCHAR(100) PRIMARY KEY,
      date VARCHAR(50),
      customer_id INTEGER,
      employee_id INTEGER,
      employee_name VARCHAR(255),
      outcome VARCHAR(50) DEFAULT 'Pending' CHECK (outcome IN ('Pending', 'Completed', 'Cancelled')),
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS day_schedules (
      date VARCHAR(50) PRIMARY KEY,
      teams JSONB DEFAULT '[]',
      solos JSONB DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS route_assignments (
      key VARCHAR(255) PRIMARY KEY,
      routes JSONB DEFAULT '[]',
      extra_zones JSONB DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS emergency_tickets (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL,
      client_name VARCHAR(255) NOT NULL,
      client_address TEXT,
      client_rating VARCHAR(50) DEFAULT 'Undefined',
      contract_id INTEGER,
      device_model_name VARCHAR(255),
      problem_description TEXT NOT NULL,
      call_notes TEXT,
      attachments JSONB DEFAULT '[]',
      call_receiver VARCHAR(255) NOT NULL,
      priority VARCHAR(50) DEFAULT 'Normal' CHECK (priority IN ('Critical', 'High', 'Normal')),
      status VARCHAR(50) DEFAULT 'New' CHECK (status IN ('New', 'Assigned', 'In Progress', 'Completed', 'Cancelled')),
      assigned_technician_id INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS telemarketing_task_lists (
      id VARCHAR(100) PRIMARY KEY,
      team_key VARCHAR(100) NOT NULL,
      date VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(team_key, date)
    );

    CREATE TABLE IF NOT EXISTS telemarketing_task_list_items (
      id VARCHAR(100) PRIMARY KEY,
      task_list_id VARCHAR(100) NOT NULL REFERENCES telemarketing_task_lists(id) ON DELETE CASCADE,
      entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('candidate', 'client')),
      entity_id INTEGER NOT NULL,
      name VARCHAR(255) NOT NULL,
      mobile VARCHAR(50) NOT NULL,
      contact_number VARCHAR(50),
      contact_label VARCHAR(255),
      address_text TEXT,
      geo_unit_id INTEGER,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'called', 'booked')),
      call_outcome VARCHAR(20)
    );

    CREATE TABLE IF NOT EXISTS telemarketing_call_logs (
      id VARCHAR(100) PRIMARY KEY,
      entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('candidate', 'client')),
      entity_id INTEGER NOT NULL,
      task_list_id VARCHAR(100),
      team_key VARCHAR(100) NOT NULL,
      outcome VARCHAR(20) NOT NULL CHECK (outcome IN ('no_answer', 'busy', 'rejected', 'booked')),
      contact_label VARCHAR(255),
      contact_number VARCHAR(50),
      notes TEXT,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      called_by INTEGER,
      communication_method VARCHAR(30)
    );

    CREATE TABLE IF NOT EXISTS telemarketing_appointments (
      id VARCHAR(100) PRIMARY KEY,
      entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('candidate', 'client')),
      entity_id INTEGER NOT NULL,
      customer_name VARCHAR(255) NOT NULL,
      customer_address TEXT,
      customer_mobile VARCHAR(50),
      team_key VARCHAR(100) NOT NULL,
      date VARCHAR(50) NOT NULL,
      time_slot VARCHAR(50) NOT NULL,
      occupation VARCHAR(255),
      water_source VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      created_by INTEGER
    );

    CREATE TABLE IF NOT EXISTS branches (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      location_geo_id INTEGER REFERENCES geo_units(id),
      covered_geo_ids JSONB DEFAULT '[]',
      status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS system_lists (
      id SERIAL PRIMARY KEY,
      category VARCHAR(100) NOT NULL,
      value VARCHAR(255) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_system_lists_category ON system_lists(category);
  `);

  await migrateJobTables();
  await fixSchemaConstraints();
  await createHrUsers();
  await createPermissionsTables();
}

async function migrateJobTables() {
  // Check if new job schema is already in place by looking for the application_source column
  const { rows } = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'job_applications' AND column_name = 'application_source'
  `);
  if (rows.length > 0) return; // Already migrated

  console.log('Running job tables migration...');

  // Drop old job tables in dependency order
  await pool.query(`
    DROP TABLE IF EXISTS training_attendance CASCADE;
    DROP TABLE IF EXISTS audit_logs CASCADE;
    DROP TABLE IF EXISTS interviews CASCADE;
    DROP TABLE IF EXISTS job_applications CASCADE;
    DROP TABLE IF EXISTS applicants CASCADE;
    DROP TABLE IF EXISTS referrers CASCADE;
    DROP TABLE IF EXISTS training_courses CASCADE;
    DROP TABLE IF EXISTS job_vacancies CASCADE;
  `);

  // Create job_vacancies
  await pool.query(`
    CREATE TABLE job_vacancies (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      branch VARCHAR(255) NOT NULL,
      governorate VARCHAR(255),
      city_or_area VARCHAR(255),
      sub_area VARCHAR(255),
      neighborhood VARCHAR(255),
      detailed_address TEXT,
      work_type VARCHAR(100),
      required_gender VARCHAR(20),
      required_age_min INTEGER,
      required_age_max INTEGER,
      email VARCHAR(255),
      required_qualification VARCHAR(255),
      required_specialization VARCHAR(255),
      required_experience_years INTEGER,
      required_skills TEXT,
      responsibilities TEXT,
      driving_license_required BOOLEAN DEFAULT FALSE,
      vacancy_count INTEGER NOT NULL CHECK (vacancy_count >= 0),
      max_retraining_count INTEGER DEFAULT 1,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      status VARCHAR(20) DEFAULT 'Open' CHECK (status IN ('Open', 'Closed', 'Archived')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT chk_vacancy_dates CHECK (start_date <= end_date)
    );
  `);

  // Create applicants
  await pool.query(`
    CREATE TABLE applicants (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      dob DATE NOT NULL,
      gender VARCHAR(20) NOT NULL,
      marital_status VARCHAR(50) NOT NULL,
      email VARCHAR(255),
      mobile_number VARCHAR(20) NOT NULL,
      secondary_mobile VARCHAR(20),
      governorate VARCHAR(255) NOT NULL,
      city_or_area VARCHAR(255),
      sub_area VARCHAR(255),
      neighborhood VARCHAR(255),
      detailed_address TEXT,
      academic_qualification VARCHAR(255),
      previous_employment VARCHAR(255),
      driving_license VARCHAR(10) DEFAULT NULL,
      expected_salary INTEGER,
      computer_skills TEXT,
      foreign_languages TEXT,
      years_of_experience INTEGER,
      cv_url TEXT,
      photo_url TEXT,
      applicant_segment VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Create referrers
  await pool.query(`
    CREATE TABLE referrers (
      id SERIAL PRIMARY KEY,
      type VARCHAR(20) NOT NULL CHECK (type IN ('Employee', 'Customer')),
      employee_id INTEGER REFERENCES employees(id),
      full_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255),
      mobile_number VARCHAR(20) NOT NULL,
      governorate VARCHAR(255),
      city_or_area VARCHAR(255),
      sub_area VARCHAR(255),
      neighborhood VARCHAR(255),
      detailed_address TEXT,
      referrer_work VARCHAR(255),
      referrer_notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Create training_courses
  await pool.query(`
    CREATE TABLE training_courses (
      id SERIAL PRIMARY KEY,
      training_name VARCHAR(255) NOT NULL,
      branch VARCHAR(255),
      device_name VARCHAR(255),
      trainer VARCHAR(255) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      training_status VARCHAR(30) DEFAULT 'Training Scheduled' CHECK (training_status IN ('Training Scheduled', 'Training Started', 'Training Completed')),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Create job_applications
  await pool.query(`
    CREATE TABLE job_applications (
      id SERIAL PRIMARY KEY,
      job_vacancy_id INTEGER NOT NULL REFERENCES job_vacancies(id),
      applicant_id INTEGER NOT NULL REFERENCES applicants(id),
      referrer_id INTEGER REFERENCES referrers(id),
      submission_type VARCHAR(30) NOT NULL CHECK (submission_type IN ('Apply', 'Refer a Candidate')),
      application_source VARCHAR(30) NOT NULL CHECK (application_source IN ('Mobile App', 'Website', 'External Platforms', 'Internal')),
      entered_by_user_id INTEGER REFERENCES employees(id),
      entered_by_name VARCHAR(255),
      current_stage VARCHAR(30) NOT NULL DEFAULT 'Submitted' CHECK (current_stage IN ('Submitted', 'Shortlisted', 'Interview', 'Training', 'Final Decision')),
      application_status VARCHAR(30) NOT NULL DEFAULT 'New' CHECK (application_status IN (
        'New', 'In Review', 'Qualified', 'Rejected',
        'Interview Scheduled', 'Interview Completed', 'Interview Failed',
        'Approved',
        'Training Scheduled', 'Training Started', 'Training Completed', 'Retraining',
        'Passed',
        'Final Hired', 'Final Rejected', 'Retreated'
      )),
      duplicate_flag BOOLEAN DEFAULT FALSE,
      hired_employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
      is_escalated BOOLEAN DEFAULT FALSE,
      escalated_at TIMESTAMPTZ,
      internal_notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Create audit_logs
  await pool.query(`
    CREATE TABLE audit_logs (
      id SERIAL PRIMARY KEY,
      entity_type VARCHAR(50) NOT NULL,
      entity_id INTEGER NOT NULL,
      application_id INTEGER,
      action_type VARCHAR(100) NOT NULL,
      performed_by_role VARCHAR(50),
      performed_by_user_id INTEGER REFERENCES employees(id),
      old_value TEXT,
      new_value TEXT,
      internal_reason TEXT,
      timestamp TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Create interviews
  await pool.query(`
    CREATE TABLE interviews (
      id SERIAL PRIMARY KEY,
      application_id INTEGER NOT NULL REFERENCES job_applications(id),
      interview_type VARCHAR(30) NOT NULL CHECK (interview_type IN ('HR Interview', 'Technical Interview')),
      interview_number VARCHAR(30) NOT NULL CHECK (interview_number IN ('First Interview', 'Second Interview')),
      interviewer_name VARCHAR(255) NOT NULL,
      interview_date DATE NOT NULL,
      interview_time TIME NOT NULL,
      interview_status VARCHAR(30) DEFAULT 'Interview Scheduled' CHECK (interview_status IN ('Interview Scheduled', 'Interview Completed', 'Interview Failed')),
      internal_notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Create training_attendance
  await pool.query(`
    CREATE TABLE training_attendance (
      id SERIAL PRIMARY KEY,
      training_course_id INTEGER NOT NULL REFERENCES training_courses(id),
      application_id INTEGER NOT NULL REFERENCES job_applications(id),
      attendance_date DATE NOT NULL,
      status VARCHAR(20) NOT NULL CHECK (status IN ('Present', 'Absent')),
      UNIQUE(training_course_id, application_id, attendance_date)
    );
  `);

  console.log('Job tables migration completed.');
}

async function fixSchemaConstraints() {
  // Drop FK on audit_logs.application_id (should be a soft reference, not a FK)
  try {
    await pool.query(`
      ALTER TABLE audit_logs
        DROP CONSTRAINT IF EXISTS audit_logs_application_id_fkey
    `);
  } catch { /* table may not exist on first run */ }

  // Relax NOT NULL / CHECK constraints on applicants that are optional in the form
  try {
    await pool.query(`
      ALTER TABLE applicants
        ALTER COLUMN city_or_area DROP NOT NULL,
        ALTER COLUMN sub_area DROP NOT NULL,
        ALTER COLUMN neighborhood DROP NOT NULL,
        ALTER COLUMN detailed_address DROP NOT NULL,
        ALTER COLUMN academic_qualification DROP NOT NULL,
        ALTER COLUMN previous_employment DROP NOT NULL,
        ALTER COLUMN years_of_experience DROP NOT NULL
    `);
  } catch { /* columns may not exist or already nullable */ }

  // Migrate driving_license from BOOLEAN to VARCHAR(10) if needed
  try {
    const { rows: dlType } = await pool.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'applicants' AND column_name = 'driving_license'
    `);
    if (dlType.length > 0 && dlType[0].data_type === 'boolean') {
      await pool.query(`
        ALTER TABLE applicants
          ALTER COLUMN driving_license TYPE VARCHAR(10) USING NULL
      `);
    }
  } catch { /* ignore */ }

  // Remove restrictive CHECK on applicant_segment if it exists
  try {
    await pool.query(`
      ALTER TABLE applicants
        DROP CONSTRAINT IF EXISTS applicants_applicant_segment_check
    `);
    await pool.query(`
      ALTER TABLE applicants
        ALTER COLUMN applicant_segment TYPE VARCHAR(100)
    `);
  } catch { /* ignore */ }

  // Add new columns to training_courses (added for training module v2)
  try {
    await pool.query(`ALTER TABLE training_courses ADD COLUMN IF NOT EXISTS job_vacancy_id INTEGER REFERENCES job_vacancies(id)`);
    await pool.query(`ALTER TABLE training_courses ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES employees(id)`);
    await pool.query(`ALTER TABLE training_courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`);
  } catch { /* ignore */ }

  // Extend employees and applications for hiring conversion
  try {
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS job_title VARCHAR(255)`);
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS branch VARCHAR(255)`);
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS residence VARCHAR(255)`);
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`);
    await pool.query(`
      ALTER TABLE job_applications
        ADD COLUMN IF NOT EXISTS hired_employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL
    `);
  } catch { /* ignore */ }

  // Add recorded_by_user_id to training_attendance
  try {
    await pool.query(`ALTER TABLE training_attendance ADD COLUMN IF NOT EXISTS recorded_by_user_id INTEGER REFERENCES employees(id)`);
  } catch { /* ignore */ }

  // Add is_archived / archived_at to job_applications
  try {
    await pool.query(`
      ALTER TABLE job_applications
        ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ
    `);
  } catch { /* ignore */ }

  // New modifications for manual applications
  try {
    // Drop constraint on application_source
    await pool.query(`ALTER TABLE job_applications DROP CONSTRAINT IF EXISTS job_applications_application_source_check`);
    
    // Drop NOT NULL from job_vacancy_id
    await pool.query(`ALTER TABLE job_applications ALTER COLUMN job_vacancy_id DROP NOT NULL`);
    
    // Add whatsapp flags and specialization to applicants
    await pool.query(`ALTER TABLE applicants ADD COLUMN IF NOT EXISTS has_whatsapp_primary BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE applicants ADD COLUMN IF NOT EXISTS has_whatsapp_secondary BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE applicants ADD COLUMN IF NOT EXISTS specialization VARCHAR(255)`);
  } catch (err) {
    console.error('Migration adjustments failed:', err);
  }

  // Create training_course_trainees junction table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS training_course_trainees (
        id SERIAL PRIMARY KEY,
        training_course_id INTEGER NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
        application_id INTEGER NOT NULL REFERENCES job_applications(id),
        result VARCHAR(30) CHECK (result IN ('Passed', 'Retraining', 'Rejected', 'Retreated')),
        result_recorded_at TIMESTAMPTZ,
        result_recorded_by INTEGER REFERENCES employees(id),
        added_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(training_course_id, application_id)
      )
    `);
  } catch { /* ignore */ }

  // Fix vacancy_count constraint: allow 0 (last slot hired)
  try {
    await pool.query(`
      ALTER TABLE job_vacancies
        DROP CONSTRAINT IF EXISTS job_vacancies_vacancy_count_check,
        ADD CONSTRAINT job_vacancies_vacancy_count_check CHECK (vacancy_count >= 0)
    `);
  } catch { /* ignore — constraint may already be correct */ }

  // ── Add stage_status + decision columns (status/decision separation) ──
  try {
    await pool.query(`
      ALTER TABLE job_applications
        ADD COLUMN IF NOT EXISTS stage_status VARCHAR(30),
        ADD COLUMN IF NOT EXISTS decision VARCHAR(30)
    `);
    // Migrate existing data: derive stage_status and decision from application_status
    await pool.query(`
      UPDATE job_applications SET
        stage_status = CASE
          WHEN current_stage = 'Submitted' AND application_status = 'New' THEN 'Pending'
          WHEN current_stage = 'Submitted' AND application_status IN ('In Review', 'Rejected') THEN 'Under Review'
          WHEN current_stage = 'Shortlisted' THEN 'Ready'
          WHEN current_stage = 'Interview' AND application_status = 'Interview Scheduled' THEN 'Scheduled'
          WHEN current_stage = 'Interview' AND application_status IN ('Interview Completed','Interview Failed') THEN 'Completed'
          WHEN current_stage = 'Training' AND application_status IN ('Approved','Retraining') THEN 'Ready'
          WHEN current_stage = 'Training' AND application_status = 'Training Scheduled' THEN 'Scheduled'
          WHEN current_stage = 'Training' AND application_status = 'Training Started' THEN 'In Progress'
          WHEN current_stage = 'Training' AND application_status = 'Training Completed' THEN 'Completed'
          WHEN current_stage = 'Final Decision' THEN 'Awaiting Decision'
          ELSE 'Pending'
        END,
        decision = CASE application_status
          WHEN 'Qualified' THEN 'Qualified'
          WHEN 'Rejected' THEN 'Rejected'
          WHEN 'Interview Failed' THEN 'Failed'
          WHEN 'Approved' THEN 'Approved'
          WHEN 'Retraining' THEN 'Retraining'
          WHEN 'Passed' THEN 'Passed'
          WHEN 'Final Hired' THEN 'Hired'
          WHEN 'Final Rejected' THEN 'Rejected'
          WHEN 'Retreated' THEN 'Retreated'
          ELSE NULL
        END
      WHERE stage_status IS NULL
    `);
  } catch (err) {
    console.error('stage_status/decision migration failed:', err);
  }
}

async function createHrUsers() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hr_users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(100) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  try {
    await pool.query(`ALTER TABLE hr_users DROP CONSTRAINT IF EXISTS hr_users_role_check`);
  } catch { /* ignore */ }

  // Drop FK from audit_logs.performed_by_user_id (was referencing employees)
  try {
    await pool.query(`ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_performed_by_user_id_fkey`);
  } catch { /* ignore */ }
  // Drop FK from job_applications.entered_by_user_id
  try {
    await pool.query(`ALTER TABLE job_applications DROP CONSTRAINT IF EXISTS job_applications_entered_by_user_id_fkey`);
  } catch { /* ignore */ }
  // Drop FK from training_courses.created_by_user_id
  try {
    await pool.query(`ALTER TABLE training_courses DROP CONSTRAINT IF EXISTS training_courses_created_by_user_id_fkey`);
  } catch { /* ignore */ }
  // Drop FK from training_course_trainees.result_recorded_by
  try {
    await pool.query(`ALTER TABLE training_course_trainees DROP CONSTRAINT IF EXISTS training_course_trainees_result_recorded_by_fkey`);
  } catch { /* ignore */ }
  // Drop FK from training_attendance.recorded_by_user_id
  try {
    await pool.query(`ALTER TABLE training_attendance DROP CONSTRAINT IF EXISTS training_attendance_recorded_by_user_id_fkey`);
  } catch { /* ignore */ }

  // Add required_certificate & required_major columns to job_vacancies
  try {
    await pool.query(`ALTER TABLE job_vacancies ADD COLUMN IF NOT EXISTS required_certificate VARCHAR(255)`);
    await pool.query(`ALTER TABLE job_vacancies ADD COLUMN IF NOT EXISTS required_major VARCHAR(255)`);
  } catch { /* ignore */ }

  // Add contact_info JSONB column to branches
  try {
    await pool.query(`ALTER TABLE branches ADD COLUMN IF NOT EXISTS contact_info JSONB DEFAULT '[]'::jsonb`);
  } catch { /* ignore */ }

  // Add contact_methods JSONB column to job_vacancies (replaces email)
  try {
    await pool.query(`ALTER TABLE job_vacancies ADD COLUMN IF NOT EXISTS contact_methods JSONB DEFAULT '[]'::jsonb`);
  } catch { /* ignore */ }

  // Add unique constraint on system_lists(category, value) so we can do ON CONFLICT DO NOTHING
  try {
    await pool.query(`ALTER TABLE system_lists ADD CONSTRAINT system_lists_category_value_unique UNIQUE (category, value)`);
  } catch { /* ignore — constraint may already exist */ }

  // Seed new system list categories (idempotent — skips duplicates)
  try {
    await pool.query(`
      INSERT INTO system_lists (category, value, display_order) VALUES
        ('job_title', 'مشرفة', 1),
        ('job_title', 'فني', 2),
        ('job_title', 'تيلماركتر', 3),
        ('job_title', 'فني صيانة أجهزة', 4),
        ('job_title', 'مندوب مبيعات', 5),
        ('job_title', 'فني تركيب', 6),
        ('job_title', 'مسؤول خدمة العملاء', 7),
        ('job_title', 'محاسب', 8),
        ('certificate', 'ابتدائية', 1),
        ('certificate', 'متوسطة', 2),
        ('certificate', 'إعدادية', 3),
        ('certificate', 'دبلوم', 4),
        ('certificate', 'بكالوريوس', 5),
        ('certificate', 'ماجستير', 6),
        ('certificate', 'دكتوراه', 7),
        ('major:دبلوم', 'تقنيات حاسبات', 1),
        ('major:دبلوم', 'إدارة أعمال', 2),
        ('major:دبلوم', 'محاسبة', 3),
        ('major:بكالوريوس', 'هندسة حاسبات', 1),
        ('major:بكالوريوس', 'هندسة كهرباء', 2),
        ('major:بكالوريوس', 'إدارة أعمال', 3),
        ('major:بكالوريوس', 'محاسبة', 4),
        ('major:ماجستير', 'هندسة حاسبات', 1),
        ('major:ماجستير', 'إدارة أعمال', 2),
        ('major:دكتوراه', 'هندسة حاسبات', 1),
        ('application_source', 'إنترنت (Website)', 1),
        ('application_source', 'تسجيل داخلي', 2),
        ('application_source', 'نماذج ورقية', 3),
        ('application_source', 'صفحة فيسبوك', 4),
        ('foreign_language', 'الإنجليزية', 1),
        ('foreign_language', 'الفرنسية', 2),
        ('foreign_language', 'الكردية', 3),
        ('foreign_language', 'التركية', 4),
        ('foreign_language', 'الألمانية', 5)
      ON CONFLICT (category, value) DO NOTHING
    `);
    console.log('New system list categories seeded (job_title, certificate, major, app_source, languages).');
  } catch (err) {
    console.warn('System list seeding warning:', err);
  }
}

async function createPermissionsTables() {
  // Create roles table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      display_name VARCHAR(255) NOT NULL,
      description TEXT,
      is_system BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Create permissions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS permissions (
      id SERIAL PRIMARY KEY,
      key VARCHAR(150) NOT NULL UNIQUE,
      module VARCHAR(50) NOT NULL,
      sub_module VARCHAR(50) NOT NULL,
      action VARCHAR(50) NOT NULL,
      display_name VARCHAR(255) NOT NULL,
      display_order INTEGER DEFAULT 0
    )
  `);

  // Create role_permissions junction table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id SERIAL PRIMARY KEY,
      role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      UNIQUE(role_id, permission_id)
    )
  `);

  // Migrate hr_users: add role_id column
  try {
    await pool.query(`ALTER TABLE hr_users ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id)`);
  } catch { /* ignore */ }

  try {
    await pool.query(`ALTER TABLE hr_users ADD COLUMN IF NOT EXISTS employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL`);
  } catch { /* ignore */ }

  try {
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS first_name VARCHAR(255)`);
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS father_name VARCHAR(255)`);
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_name VARCHAR(255)`);
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS nickname VARCHAR(255)`);
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS occupation VARCHAR(255)`);
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS water_source VARCHAR(255)`);
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT`);
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS rating VARCHAR(50)`);
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS referrers JSONB DEFAULT '[]'::jsonb`);
  } catch { /* ignore */ }

  try {
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_hr_users_employee_id ON hr_users(employee_id) WHERE employee_id IS NOT NULL`);
  } catch { /* ignore */ }

  console.log('Permissions tables created.');
}

