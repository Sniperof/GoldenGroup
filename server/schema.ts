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
      status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'leave', 'inactive')),
      avatar TEXT
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
      address_text TEXT,
      owner_user_id INTEGER,
      status VARCHAR(50) DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Qualified', 'Junk')),
      referral_sheet_id INTEGER REFERENCES referral_sheets(id) ON DELETE SET NULL,
      referral_date VARCHAR(50),
      referral_reason TEXT,
      referral_type VARCHAR(100),
      referral_origin_channel VARCHAR(100),
      referral_name_snapshot VARCHAR(255),
      referral_entity_id INTEGER,
      referral_confirmation_status VARCHAR(50) DEFAULT 'Pending',
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
  `);
}

export async function seedData() {
  const { rows } = await pool.query('SELECT COUNT(*) FROM employees');
  if (parseInt(rows[0].count) > 0) return;

  await pool.query(`
    INSERT INTO geo_units (id, name, level, parent_id) VALUES
      (1, 'بغداد', 1, NULL),
      (2, 'البصرة', 1, NULL),
      (10, 'الكرخ', 2, 1),
      (11, 'الرصافة', 2, 1),
      (20, 'المنصور', 3, 10),
      (21, 'الكاظمية', 3, 10),
      (22, 'الكرادة', 3, 11),
      (30, 'حي المنصور', 4, 20),
      (31, 'الداوودي', 4, 20),
      (32, 'حي العدل', 4, 20),
      (33, 'حي الكاظمية', 4, 21),
      (34, 'العطيفية', 4, 21),
      (35, 'حي الكرادة', 4, 22),
      (36, 'زيونة', 4, 22)
    ON CONFLICT (id) DO NOTHING;

    SELECT setval('geo_units_id_seq', (SELECT MAX(id) FROM geo_units));
  `);

  await pool.query(`
    INSERT INTO employees (id, name, role, mobile, status, avatar) VALUES
      (1, 'ليلى أحمد', 'supervisor', '07701234567', 'active', 'https://ui-avatars.com/api/?name=ليلى+أحمد&background=6366f1&color=fff'),
      (2, 'عمر حسن', 'supervisor', '07709876543', 'active', 'https://ui-avatars.com/api/?name=عمر+حسن&background=6366f1&color=fff'),
      (3, 'سارة محمود', 'supervisor', '07705551234', 'leave', 'https://ui-avatars.com/api/?name=سارة+محمود&background=6366f1&color=fff'),
      (4, 'أحمد علي', 'technician', '07701112233', 'active', 'https://ui-avatars.com/api/?name=أحمد+علي&background=10b981&color=fff'),
      (5, 'محمد جاسم', 'technician', '07703334455', 'active', 'https://ui-avatars.com/api/?name=محمد+جاسم&background=10b981&color=fff'),
      (6, 'فاطمة نور', 'technician', '07706667788', 'active', 'https://ui-avatars.com/api/?name=فاطمة+نور&background=10b981&color=fff'),
      (7, 'حسين كريم', 'technician', '07708889900', 'inactive', 'https://ui-avatars.com/api/?name=حسين+كريم&background=10b981&color=fff'),
      (8, 'زينب عبد الله', 'technician', '07702223344', 'active', 'https://ui-avatars.com/api/?name=زينب+عبدالله&background=10b981&color=fff'),
      (9, 'سها جميل', 'telemarketer', '07704445566', 'active', 'https://ui-avatars.com/api/?name=سها+جميل&background=f43f5e&color=fff'),
      (10, 'نادية كمال', 'telemarketer', '07707778899', 'active', 'https://ui-avatars.com/api/?name=نادية+كمال&background=f43f5e&color=fff')
    ON CONFLICT (id) DO NOTHING;

    SELECT setval('employees_id_seq', (SELECT MAX(id) FROM employees));
  `);

  await pool.query(`
    INSERT INTO tasks (id, type, customer_name, context, location, due_date, status, priority) VALUES
      (1, 'emergency', 'خالد السامرائي', 'مكيف سبليت 2 طن', 'حي المنصور', '2026-02-18', 'pending', 'high'),
      (2, 'emergency', 'نور الدين', 'ثلاجة سامسونج', 'الكرادة', '2026-02-18', 'in-progress', 'high'),
      (3, 'emergency', 'سلمى حسين', 'غسالة LG', 'الكاظمية', '2026-02-19', 'pending', 'high'),
      (4, 'dues', 'عبد الرحمن الجبوري', 'عقد #2401', 'حي العدل', '2026-02-18', 'pending', NULL),
      (5, 'dues', 'ريم عباس', 'عقد #2398', 'زيونة', '2026-02-20', 'pending', NULL),
      (6, 'dues', 'طارق محمود', 'عقد #2387', 'الداوودي', '2026-02-22', 'pending', NULL),
      (7, 'dues', 'لينا الخطيب', 'عقد #2405', 'حي المنصور', '2026-02-18', 'completed', NULL),
      (8, 'periodic', 'فادي الموصلي', 'صيانة شهرية - مكيف مركزي', 'حي الكرادة', '2026-02-18', 'pending', NULL),
      (9, 'periodic', 'ياسمين كريم', 'فحص ربع سنوي', 'العطيفية', '2026-02-25', 'pending', NULL),
      (10, 'periodic', 'وليد البصري', 'صيانة دورية - نظام تبريد', 'حي الكاظمية', '2026-02-28', 'pending', NULL),
      (11, 'returns', 'هدى الأنباري', 'إرجاع قطعة غيار', 'حي المنصور', '2026-02-18', 'pending', NULL),
      (12, 'returns', 'بشار النجار', 'استبدال ضاغط', 'الداوودي', '2026-02-21', 'in-progress', NULL),
      (13, 'returns', 'دينا الشمري', 'إرجاع فلتر', 'زيونة', '2026-02-23', 'pending', NULL),
      (14, 'followup', 'أنس جابر', 'تأكيد موعد', 'حي العدل', '2026-02-18', 'pending', NULL),
      (15, 'followup', 'مروة عادل', 'استبيان رضا', 'الكرادة', '2026-02-24', 'pending', NULL),
      (16, 'followup', 'جمال الدليمي', 'فحص ما بعد الصيانة', 'حي الكاظمية', '2026-02-24', 'pending', NULL),
      (17, 'followup', 'سهى العبيدي', 'استفسار عن الخدمة', 'حي المنصور', '2026-02-18', 'completed', NULL)
    ON CONFLICT (id) DO NOTHING;

    SELECT setval('tasks_id_seq', (SELECT MAX(id) FROM tasks));
  `);

  await pool.query(`
    INSERT INTO device_models (id, name, brand, category, maintenance_interval, base_price, supported_visit_types) VALUES
      (1, 'Golden 7 Stages', 'Golden', 'Residential', '6 Months', 250000, '["Installation", "Maintenance", "Delivery"]'),
      (2, 'Industrial RO System 5000GPD', 'PureTech', 'Industrial', '3 Months', 4500000, '["Installation", "Maintenance"]'),
      (3, 'Office Dispenser Pro', 'AquaCool', 'Commercial', '6 Months', 650000, '["Installation", "Maintenance", "Delivery"]')
    ON CONFLICT (id) DO NOTHING;

    SELECT setval('device_models_id_seq', (SELECT MAX(id) FROM device_models));
  `);

  await pool.query(`
    INSERT INTO spare_parts (id, name, code, base_price, maintenance_type, compatible_device_ids) VALUES
      (1, 'فلتر PP 5 مايكرون', 'SP-PP5', 5000, 'Periodic', '[1, 3]'),
      (2, 'فلتر كربون CTO', 'SP-CTO', 7500, 'Periodic', '[1, 3]'),
      (3, 'غشاء RO 75GPD', 'SP-RO75', 35000, 'Periodic', '[1]'),
      (4, 'غشاء RO 5000GPD صناعي', 'SP-RO5K', 850000, 'Periodic', '[2]'),
      (5, 'مضخة ضغط عالي', 'SP-PUMP', 120000, 'Emergency', '[1, 2]'),
      (6, 'صمام كهربائي', 'SP-VALVE', 25000, 'Emergency', '[2, 3]'),
      (7, 'حنفية مياه نقية', 'SP-TAP', 15000, 'Accessory', '[1]'),
      (8, 'خزان ضغط 4 غالون', 'SP-TANK4', 45000, 'Accessory', '[1, 3]')
    ON CONFLICT (id) DO NOTHING;

    SELECT setval('spare_parts_id_seq', (SELECT MAX(id) FROM spare_parts));
  `);

  await pool.query(`
    INSERT INTO maintenance_requests (id, request_date, customer_id, customer_name, contract_id, device_model_name, priority, problem_description, telemarketer_id, technician_id, resolution_status, visit_type, location, notes, last_follow_up_date, technical_report) VALUES
      (101, '2026-02-18T09:30:00', 1, 'خالد السامرائي', 2401, 'مكيف سبليت 2 طن (Samsung)', 'Critical', 'الجهاز لا يعمل والجو حار جداً', 9, 4, 'Pending', 'Emergency', 'حي المنصور', NULL, NULL,
        '{"water":{"sourceType":"Shatt al-Arab","inputPressure":3.5,"tdsBefore":450,"tdsAfter":120},"components":{"pumpPressure":8.2,"membraneOutput":"Good","flowRestrictor":400,"tankPressure":0.5},"electrical":{"lowPressureSwitch":"Working","highPressureSwitch":"Working","solenoidValve":"Working","uvStatus":"Faulty"},"technicianNotes":"UV Lamp needs replacement immediately.","recommendations":"Suggest installing a voltage stabilizer."}'),
      (102, '2026-02-18T10:15:00', 2, 'نور الدين', 2398, 'ثلاجة 20 قدم (LG)', 'High', 'تسريب مياه من الخلف', 10, 5, 'Pending', 'Emergency', 'الكرادة', NULL, NULL, NULL),
      (103, '2026-02-17T14:00:00', 3, 'سلمى حسين', 2387, 'غسالة 7 كغم (Beko)', 'Normal', 'صوت غريب أثناء التشغيل', 9, NULL, 'Pending', 'Emergency', 'الكاظمية', NULL, NULL, NULL),
      (104, '2026-02-16T11:30:00', 5, 'ريم عباس', 2405, 'مكيف شباك (General)', 'Critical', 'توقف مفاجئ عن العمل', 10, 4, 'Completed', 'Emergency', 'زيونة', 'تم استبدال الكابستور', '2026-02-17T09:00:00',
        '{"water":{"sourceType":"City Water","inputPressure":4.0,"tdsBefore":200,"tdsAfter":30},"components":{"pumpPressure":7.5,"membraneOutput":"Weak","flowRestrictor":300,"tankPressure":0.6},"electrical":{"lowPressureSwitch":"Working","highPressureSwitch":"Faulty","solenoidValve":"Working","uvStatus":"NotInstalled"},"technicianNotes":"Membrane efficiency dropped to 60%.","recommendations":"Monitor TDS levels weekly."}')
    ON CONFLICT (id) DO NOTHING;

    SELECT setval('maintenance_requests_id_seq', (SELECT MAX(id) FROM maintenance_requests));
  `);
}
