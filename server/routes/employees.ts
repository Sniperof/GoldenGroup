import bcrypt from 'bcryptjs';
import { Router } from 'express';
import pool from '../db.js';
import { requirePermission, clearPermissionCache } from '../middleware/permission.js';
import { deriveEmployeeRoleFromVacancyTitle, getEmployeeAvatar } from '../utils/recruitmentPolicy.js';
import { sanitizeText } from '../utils/sanitize.js';

const router = Router();

const HIRED_APPLICATION_JOINS = `
  FROM employees e
  LEFT JOIN LATERAL (
    SELECT ja.id, ja.applicant_id, ja.job_vacancy_id
    FROM job_applications ja
    WHERE ja.hired_employee_id = e.id
    ORDER BY ja.updated_at DESC NULLS LAST, ja.id DESC
    LIMIT 1
  ) linked_app ON TRUE
  LEFT JOIN applicants a ON a.id = linked_app.applicant_id
  LEFT JOIN job_vacancies jv ON jv.id = linked_app.job_vacancy_id
`;

const APPLICANT_RESIDENCE_SQL = `
  NULLIF(
    CONCAT_WS(
      ' - ',
      NULLIF(a.governorate, ''),
      NULLIF(a.city_or_area, ''),
      NULLIF(a.sub_area, ''),
      NULLIF(a.neighborhood, ''),
      NULLIF(a.detailed_address, '')
    ),
    ''
  )
`;

const APPLICANT_RESIDENCE_SHORT_SQL = `
  NULLIF(
    CONCAT_WS(
      ' - ',
      NULLIF(a.sub_area, ''),
      NULLIF(a.neighborhood, '')
    ),
    ''
  )
`;

const EMPLOYEE_SELECT_COLS = `
  e.id,
  e.name,
  e.role,
  e.mobile,
  COALESCE(NULLIF(jv.branch, ''), e.branch) AS branch,
  COALESCE(${APPLICANT_RESIDENCE_SQL}, e.residence) AS residence,
  ${APPLICANT_RESIDENCE_SHORT_SQL} AS "residenceShort",
  e.status,
  e.avatar,
  COALESCE(NULLIF(jv.title, ''), e.job_title) AS "jobTitle",
  e.created_at AS "createdAt"
`;

const EMPLOYEE_DETAIL_COLS = `
  ${EMPLOYEE_SELECT_COLS},
  u.id AS "systemUserId",
  u.username AS "systemUsername",
  u.is_active AS "systemIsActive",
  u.role_id AS "systemRoleId",
  r.display_name AS "systemRoleDisplayName"
`;

const APP_COLS = `
  ja.id,
  ja.job_vacancy_id AS "jobVacancyId",
  ja.applicant_id AS "applicantId",
  ja.referrer_id AS "referrerId",
  ja.submission_type AS "submissionType",
  ja.application_source AS "applicationSource",
  ja.entered_by_user_id AS "enteredByUserId",
  ja.entered_by_name AS "enteredByName",
  ja.current_stage AS "currentStage",
  ja.application_status AS "applicationStatus",
  ja.duplicate_flag AS "duplicateFlag",
  ja.hired_employee_id AS "hiredEmployeeId",
  ja.is_escalated AS "isEscalated",
  ja.escalated_at AS "escalatedAt",
  ja.internal_notes AS "internalNotes",
  ja.created_at AS "createdAt",
  ja.updated_at AS "updatedAt",
  ja.is_archived AS "isArchived",
  ja.archived_at AS "archivedAt",
  ja.stage_status AS "stageStatus",
  ja.decision
`;

function getEmployeeRoleOrError(jobTitle: string | null | undefined) {
  const role = deriveEmployeeRoleFromVacancyTitle(jobTitle);
  if (!role) {
    return {
      role: null,
      error: 'المسمى الوظيفي يجب أن يطابق أحد الأدوار المعتمدة: مشرفة، فني، تيلماركتر.',
    };
  }

  return { role, error: null };
}

async function fetchEmployeeListItem(employeeId: number | string) {
  const { rows } = await pool.query(
    `SELECT ${EMPLOYEE_SELECT_COLS}
     ${HIRED_APPLICATION_JOINS}
     WHERE e.id = $1`,
    [employeeId],
  );

  return rows[0] ?? null;
}

router.get('/', requirePermission('employees.view_list'), async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT ${EMPLOYEE_SELECT_COLS}
     ${HIRED_APPLICATION_JOINS}
     ORDER BY e.created_at DESC NULLS LAST, e.id DESC`,
  );
  res.json(rows);
});

router.get('/:id', requirePermission('employees.view_list'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${EMPLOYEE_DETAIL_COLS}
     ${HIRED_APPLICATION_JOINS}
     LEFT JOIN hr_users u ON u.employee_id = e.id
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE e.id = $1`,
    [req.params.id]
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'الموظف غير موجود' });
  }

  const row = rows[0];
  const { rows: appRows } = await pool.query(
    `SELECT ${APP_COLS}
     FROM job_applications ja
     WHERE ja.hired_employee_id = $1
     ORDER BY ja.updated_at DESC NULLS LAST, ja.id DESC
     LIMIT 1`,
    [req.params.id]
  );

  let hiringApplication = null;

  if (appRows.length > 0) {
    const app = appRows[0];

    const { rows: applicantRows } = await pool.query(
      `SELECT id, first_name AS "firstName", last_name AS "lastName",
        dob, gender, marital_status AS "maritalStatus", email,
        mobile_number AS "mobileNumber", secondary_mobile AS "secondaryMobile",
        governorate, city_or_area AS "cityOrArea",
        sub_area AS "subArea", neighborhood, detailed_address AS "detailedAddress",
        academic_qualification AS "academicQualification",
        specialization,
        previous_employment AS "previousEmployment",
        driving_license AS "drivingLicense",
        has_whatsapp_primary AS "hasWhatsappPrimary",
        has_whatsapp_secondary AS "hasWhatsappSecondary",
        expected_salary AS "expectedSalary",
        computer_skills AS "computerSkills",
        foreign_languages AS "foreignLanguages",
        years_of_experience AS "yearsOfExperience",
        cv_url AS "cvUrl", photo_url AS "photoUrl",
        applicant_segment AS "applicantSegment",
        created_at AS "createdAt"
      FROM applicants WHERE id = $1`,
      [app.applicantId]
    );

    const { rows: vacancyRows } = await pool.query(
      `SELECT id, title, branch,
        governorate, city_or_area AS "cityOrArea", sub_area AS "subArea",
        neighborhood, detailed_address AS "detailedAddress",
        work_type AS "workType", required_gender AS "requiredGender",
        required_age_min AS "requiredAgeMin", required_age_max AS "requiredAgeMax",
        email, required_certificate AS "requiredCertificate",
        required_major AS "requiredMajor",
        required_experience_years AS "requiredExperienceYears",
        required_skills AS "requiredSkills", responsibilities,
        driving_license_required AS "drivingLicenseRequired",
        vacancy_count AS "vacancyCount",
        start_date AS "startDate", end_date AS "endDate",
        status, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM job_vacancies WHERE id = $1`,
      [app.jobVacancyId]
    );

    let referrer = null;
    if (app.referrerId) {
      const { rows: refRows } = await pool.query(
        `SELECT id, type, employee_id AS "employeeId",
          full_name AS "fullName", last_name AS "lastName",
          mobile_number AS "mobileNumber", governorate,
          city_or_area AS "cityOrArea", sub_area AS "subArea",
          neighborhood, detailed_address AS "detailedAddress",
          referrer_work AS "referrerWork", referrer_notes AS "referrerNotes"
        FROM referrers WHERE id = $1`,
        [app.referrerId]
      );
      if (refRows.length > 0) referrer = refRows[0];
    }

    const { rows: interviewRows } = await pool.query(
      `SELECT id, application_id AS "applicationId",
        interview_type AS "interviewType",
        interview_number AS "interviewNumber",
        interviewer_name AS "interviewerName",
        interview_date AS "interviewDate",
        interview_time AS "interviewTime",
        interview_status AS "interviewStatus",
        internal_notes AS "internalNotes",
        created_at AS "createdAt"
      FROM interviews
      WHERE application_id = $1
      ORDER BY created_at ASC`,
      [app.id]
    );

    const { rows: trainingRows } = await pool.query(
      `SELECT
        tct.id,
        tct.training_course_id AS "trainingCourseId",
        tct.result,
        tct.result_recorded_at AS "resultRecordedAt",
        tct.added_at AS "addedAt",
        tc.training_name AS "trainingName",
        tc.trainer,
        tc.branch,
        tc.device_name AS "deviceName",
        tc.start_date AS "startDate",
        tc.end_date AS "endDate",
        tc.training_status AS "trainingStatus",
        tc.notes
      FROM training_course_trainees tct
      JOIN training_courses tc ON tc.id = tct.training_course_id
      WHERE tct.application_id = $1
      ORDER BY tct.added_at ASC`,
      [app.id]
    );

    hiringApplication = {
      ...app,
      applicant: applicantRows[0] || null,
      vacancy: vacancyRows[0] || null,
      referrer,
      interviews: interviewRows,
      trainings: trainingRows,
    };
  }

  res.json({
    id: row.id,
    name: row.name,
    role: row.role,
    mobile: row.mobile,
    branch: row.branch,
    residence: row.residence,
    residenceShort: row.residenceShort,
    status: row.status,
    avatar: row.avatar,
    jobTitle: row.jobTitle,
    createdAt: row.createdAt,
    systemAccount: row.systemUserId ? {
      id: row.systemUserId,
      username: row.systemUsername,
      isActive: row.systemIsActive,
      roleId: row.systemRoleId,
      roleDisplayName: row.systemRoleDisplayName,
    } : null,
    hiringApplication,
  });
});

router.post('/', requirePermission('employees.create'), async (req, res) => {
  const { name, mobile, branch, residence, status, avatar, jobTitle } = req.body;
  const cleanName = sanitizeText(name);
  const cleanJobTitle = jobTitle ? sanitizeText(jobTitle) : null;
  const { role, error } = getEmployeeRoleOrError(cleanJobTitle);
  if (error || !role) {
    return res.status(400).json({ error });
  }

  const avatarUrl = getEmployeeAvatar(cleanName, avatar || null);
  const { rows } = await pool.query(
    `INSERT INTO employees (name, role, mobile, branch, residence, status, avatar, job_title)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      cleanName,
      role,
      mobile,
      branch ? sanitizeText(branch) : null,
      residence ? sanitizeText(residence) : null,
      status || 'active',
      avatarUrl,
      cleanJobTitle,
    ]
  );
  const employee = await fetchEmployeeListItem(rows[0].id);
  res.json(employee);
});

router.put('/:id', requirePermission('employees.edit'), async (req, res) => {
  const { name, mobile, branch, residence, status, avatar, jobTitle } = req.body;
  const cleanName = sanitizeText(name);
  const cleanJobTitle = jobTitle ? sanitizeText(jobTitle) : null;
  const { role, error } = getEmployeeRoleOrError(cleanJobTitle);
  if (error || !role) {
    return res.status(400).json({ error });
  }

  const { rows: existingRows } = await pool.query(
    `SELECT id, avatar
     FROM employees
     WHERE id = $1`,
    [req.params.id]
  );

  if (existingRows.length === 0) {
    return res.status(404).json({ error: 'الموظف غير موجود' });
  }

  const nextAvatar = avatar === undefined
    ? existingRows[0].avatar
    : getEmployeeAvatar(cleanName, avatar || null);

  await pool.query(
    `UPDATE employees
     SET name = $1, role = $2, mobile = $3, branch = $4, residence = $5, status = $6, avatar = $7, job_title = $8
     WHERE id = $9
     RETURNING id`,
    [
      cleanName,
      role,
      mobile,
      branch ? sanitizeText(branch) : null,
      residence ? sanitizeText(residence) : null,
      status,
      nextAvatar,
      cleanJobTitle,
      req.params.id,
    ]
  );

  const employee = await fetchEmployeeListItem(req.params.id);

  await pool.query('UPDATE hr_users SET name = $1 WHERE employee_id = $2', [employee.name, req.params.id]);

  res.json(employee);
});

router.put('/:id/system-account', requirePermission('admin.roles.manage'), async (req, res) => {
  const employeeId = Number(req.params.id);
  const { username, password, roleId, isActive } = req.body;

  const { rows: employeeRows } = await pool.query('SELECT id, name FROM employees WHERE id = $1', [employeeId]);
  if (employeeRows.length === 0) {
    return res.status(404).json({ error: 'الموظف غير موجود' });
  }

  if (!roleId) {
    return res.status(400).json({ error: 'الدور مطلوب' });
  }

  const normalizedUsername = username?.trim?.();
  const { rows: roleRows } = await pool.query('SELECT id, name, display_name, is_active FROM roles WHERE id = $1', [roleId]);
  if (roleRows.length === 0) {
    return res.status(400).json({ error: 'الدور غير موجود' });
  }
  if (!roleRows[0].is_active) {
    return res.status(400).json({ error: 'لا يمكن إسناد دور معطل' });
  }

  const { rows: accountRows } = await pool.query(
    `SELECT id, username, is_active AS "isActive", role_id AS "roleId"
     FROM hr_users
     WHERE employee_id = $1`,
    [employeeId]
  );

  let savedRow;

  if (accountRows.length === 0) {
    if (!normalizedUsername) {
      return res.status(400).json({ error: 'اسم الدخول مطلوب لإنشاء حساب الموظف' });
    }
    if (!password?.trim?.()) {
      return res.status(400).json({ error: 'كلمة المرور مطلوبة لإنشاء حساب الموظف' });
    }

    const passwordHash = await bcrypt.hash(password.trim(), 10);
    const { rows } = await pool.query(
      `INSERT INTO hr_users (name, username, password_hash, role, role_id, employee_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, is_active AS "isActive", role_id AS "roleId"`,
      [
        employeeRows[0].name,
        normalizedUsername,
        passwordHash,
        roleRows[0].name,
        roleRows[0].id,
        employeeId,
        isActive ?? true,
      ]
    );
    savedRow = rows[0];
  } else {
    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (normalizedUsername) {
      updates.push(`username = $${idx++}`);
      params.push(normalizedUsername);
    }

    if (password?.trim?.()) {
      const passwordHash = await bcrypt.hash(password.trim(), 10);
      updates.push(`password_hash = $${idx++}`);
      params.push(passwordHash);
    }

    updates.push(`role_id = $${idx++}`);
    params.push(roleRows[0].id);
    updates.push(`role = $${idx++}`);
    params.push(roleRows[0].name);
    updates.push(`name = $${idx++}`);
    params.push(employeeRows[0].name);

    if (typeof isActive === 'boolean') {
      updates.push(`is_active = $${idx++}`);
      params.push(isActive);
    }

    params.push(accountRows[0].id);
    const { rows } = await pool.query(
      `UPDATE hr_users
       SET ${updates.join(', ')}
       WHERE id = $${idx}
       RETURNING id, username, is_active AS "isActive", role_id AS "roleId"`,
      params
    );
    savedRow = rows[0];
    clearPermissionCache(accountRows[0].id);
  }

  const { rows: roleInfoRows } = await pool.query('SELECT display_name FROM roles WHERE id = $1', [savedRow.roleId]);
  res.json({
    id: savedRow.id,
    username: savedRow.username,
    isActive: savedRow.isActive,
    roleId: savedRow.roleId,
    roleDisplayName: roleInfoRows[0]?.display_name ?? null,
  });
});

router.delete('/:id', requirePermission('employees.delete'), async (req, res) => {
  await pool.query('UPDATE hr_users SET employee_id = NULL WHERE employee_id = $1', [req.params.id]);
  await pool.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

export default router;
