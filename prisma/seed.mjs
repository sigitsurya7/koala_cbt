import { PrismaClient, UserType, Visibility } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@koala.com";
const adminPassword = process.env.SEED_ADMIN_PASSWORD || "juni1996!";

try {
  console.log("Seeding database...");

  const school = await prisma.school.upsert({
    where: { code: "SCH001" },
    update: {},
    create: {
      code: "SCH001",
      name: "Koala High School",
      isActive: true,
    },
  });

  const ay = await prisma.academicYear.upsert({
    where: { id: `${school.id}-2025` },
    update: {},
    create: {
      id: `${school.id}-2025`,
      schoolId: school.id,
      label: "2025/2026",
      startDate: new Date("2025-07-01"),
      endDate: new Date("2026-06-30"),
      isActive: true,
    },
  });

  const period = await prisma.period.upsert({
    where: { id: `${ay.id}-SEM_1` },
    update: {},
    create: {
      id: `${ay.id}-SEM_1`,
      schoolId: school.id,
      academicYearId: ay.id,
      type: "SEMESTER_1",
      startDate: new Date("2025-07-01"),
      endDate: new Date("2025-12-31"),
      isActive: true,
    },
  });

  const dept = await prisma.department.upsert({
    where: { id: `${school.id}-SCI` },
    update: {},
    create: {
      id: `${school.id}-SCI`,
      schoolId: school.id,
      name: "Science",
      level: "SMA",
      isActive: true,
    },
  });

  const kelas = await prisma.class.upsert({
    where: { id: `${school.id}-XII-IPA-A` },
    update: {},
    create: {
      id: `${school.id}-XII-IPA-A`,
      schoolId: school.id,
      departmentId: dept.id,
      name: "XII IPA A",
      grade: 12,
      isActive: true,
    },
  });

  const subject = await prisma.subject.upsert({
    where: { id: `${school.id}-MAT` },
    update: {},
    create: {
      id: `${school.id}-MAT`,
      schoolId: school.id,
      departmentId: dept.id,
      grade: 12,
      name: "Matematika",
    },
  });

  const hash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Administrator",
      username: 'admin',
      email: adminEmail,
      passwordHash: hash,
      type: UserType.ADMIN,
      isSuperAdmin: true,
    },
  });

  await prisma.userSchool.upsert({
    where: { id: `${admin.id}-${school.id}` },
    update: {},
    create: {
      id: `${admin.id}-${school.id}`,
      userId: admin.id,
      schoolId: school.id,
      classId: null,
      isActive: true,
    },
  });

  // Sample question owned by admin
  await prisma.question.upsert({
    where: { id: `${subject.id}-Q1` },
    update: {},
    create: {
      id: `${subject.id}-Q1`,
      schoolId: school.id,
      subjectId: subject.id,
      periodId: period.id,
      academicYearId: ay.id,
      type: "MCQ",
      text: "Berapakah 2 + 2?",
      options: [{ key: "A", text: "3" }, { key: "B", text: "4" }, { key: "C", text: "5" }],
      correctKey: "B",
      points: 1,
      difficulty: 1,
      createdById: admin.id,
    },
  });

  // Seed Menu with stable keys and parent linkage by key
  const menus = [
    { name: 'Master', key: 'master', path: '/master', icon: 'BsDatabase', order: 2, parentKey: null, visibility: 'PRIVATE', isActive: true, menuSuperAdmin: true },
    { name: 'User Management', key: 'user_management', path: '/user_management', icon: 'MdPeopleOutline', order: 3, parentKey: null, visibility: 'PRIVATE', isActive: true, menuSuperAdmin: true },
    { name: 'Dashboard', key: 'dashboard', path: '/dashboard', icon: 'FiHome', order: 1, parentKey: null, visibility: 'PRIVATE', isActive: true, menuSuperAdmin: true },
    { name: 'Settings', key: 'settings', path: '/settings', icon: 'FiSettings', order: 4, parentKey: null, visibility: 'PRIVATE', isActive: true, menuSuperAdmin: true },
    { name: 'Ujian', key: 'exams', path: '/exams', icon: 'PiExam', order: 5, parentKey: null, visibility: 'PRIVATE', isActive: true, menuSuperAdmin: true },
    { name: 'Jurusan', key: 'jurusan', path: '/master/jurusan', icon: null, order: 0, parentKey: 'master', visibility: 'PRIVATE', isActive: true, menuSuperAdmin: true },
    { name: 'Kelas', key: 'kelas', path: '/master/kelas', icon: null, order: 0, parentKey: 'master', visibility: 'PRIVATE', isActive: true, menuSuperAdmin: true },
    { name: 'Ruangan', key: 'ruangan', path: '/master/ruangan', icon: null, order: 0, parentKey: 'master', visibility: 'PRIVATE', isActive: true, menuSuperAdmin: true },
    { name: 'Bank Soal', key: 'bank_soal', path: '/master/bank_soal', icon: null, order: 0, parentKey: 'master', visibility: 'PRIVATE', isActive: true, menuSuperAdmin: true },
    { name: 'Kartu Ujian', key: 'exams_cards', path: '/exams/cards', icon: null, order: 0, parentKey: 'exams', visibility: 'PRIVATE', isActive: true, menuSuperAdmin: true },
    { name: 'Jadwal Ujian', key: 'exams_schedule', path: '/exams/schedule', icon: null, order: 1, parentKey: 'exams', visibility: 'PRIVATE', isActive: true, menuSuperAdmin: true },
    { name: 'Resource', key: 'resource', path: '/settings/resource', icon: null, order: 3, parentKey: 'settings', visibility: 'PRIVATE', isActive: true, menuSuperAdmin: true },
    { name: 'Sekolah', key: 'sekolah', path: '/settings/school', icon: null, order: 2, parentKey: 'settings', visibility: 'PRIVATE', isActive: true, menuSuperAdmin: true },
    { name: 'Role', key: 'role', path: '/settings/role', icon: null, order: 1, parentKey: 'settings', visibility: 'PRIVATE', isActive: true, menuSuperAdmin: true },
    { name: 'Menu', key: 'menu', path: '/settings/menu', icon: null, order: 0, parentKey: 'settings', visibility: 'PRIVATE', isActive: true, menuSuperAdmin: true },
  ];

  // Upsert parents first (no parentKey)
  const parentIdByKey = new Map();
  for (const m of menus.filter((x) => !x.parentKey)) {
    const up = await prisma.menu.upsert({
      where: { key: m.key },
      update: {
        name: m.name,
        path: m.path,
        icon: m.icon,
        order: m.order,
        visibility: m.visibility,
        isActive: m.isActive,
        menuSuperAdmin: m.menuSuperAdmin,
        parentId: null,
      },
      create: {
        name: m.name,
        key: m.key,
        path: m.path,
        icon: m.icon,
        order: m.order,
        visibility: m.visibility,
        isActive: m.isActive,
        menuSuperAdmin: m.menuSuperAdmin,
      },
    });
    parentIdByKey.set(m.key, up.id);
  }

  // Upsert children with resolved parentId
  for (const m of menus.filter((x) => x.parentKey)) {
    let parentId = parentIdByKey.get(m.parentKey);
    if (!parentId) {
      const parent = await prisma.menu.findUnique({ where: { key: m.parentKey } });
      parentId = parent?.id ?? null;
      if (parentId) parentIdByKey.set(m.parentKey, parentId);
    }
    await prisma.menu.upsert({
      where: { key: m.key },
      update: {
        name: m.name,
        path: m.path,
        icon: m.icon,
        order: m.order,
        visibility: m.visibility,
        isActive: m.isActive,
        menuSuperAdmin: m.menuSuperAdmin,
        parentId,
      },
      create: {
        name: m.name,
        key: m.key,
        path: m.path,
        icon: m.icon,
        order: m.order,
        visibility: m.visibility,
        isActive: m.isActive,
        menuSuperAdmin: m.menuSuperAdmin,
        parentId,
      },
    });
  }

  // Seed roles, permissions, roleMenus minimal
  const roles = await Promise.all([
    prisma.role.upsert({ where: { key_schoolId: { key: "ADMIN_SCHOOL", schoolId: school.id } }, update: {}, create: { name: "Admin Sekolah", key: "ADMIN_SCHOOL", scope: "SCHOOL", schoolId: school.id } }),
    prisma.role.upsert({ where: { key_schoolId: { key: "GURU", schoolId: school.id } }, update: {}, create: { name: "Guru", key: "GURU", scope: "SCHOOL", schoolId: school.id } }),
    prisma.role.upsert({ where: { key_schoolId: { key: "SISWA", schoolId: school.id } }, update: {}, create: { name: "Siswa", key: "SISWA", scope: "SCHOOL", schoolId: school.id } }),
    prisma.role.upsert({ where: { key_schoolId: { key: "STAFF", schoolId: school.id } }, update: {}, create: { name: "Staff", key: "STAFF", scope: "SCHOOL", schoolId: school.id } }),
  ]);

  const permList = [
    // Menu
    { name: "Lihat Menu", action: "READ", resource: "API/MENU" },
    { name: "Kelola Menu", action: "CREATE", resource: "API/MENU" },
    // Roles/Users basic
    { name: "Lihat Role", action: "READ", resource: "API/ROLES" },
    { name: "Lihat Users", action: "READ", resource: "API/USERS" },
    { name: "Lihat Sekolah", action: "READ", resource: "API/SCHOOLS" },
    // Departments
    { name: "Lihat Jurusan", action: "READ", resource: "API/DEPARTMENTS" },
    { name: "Buat Jurusan", action: "CREATE", resource: "API/DEPARTMENTS" },
    { name: "Ubah Jurusan", action: "UPDATE", resource: "API/DEPARTMENTS" },
    { name: "Hapus Jurusan", action: "DELETE", resource: "API/DEPARTMENTS" },
    // Rooms
    { name: "Lihat Ruangan", action: "READ", resource: "API/ROOMS" },
    { name: "Buat Ruangan", action: "CREATE", resource: "API/ROOMS" },
    { name: "Ubah Ruangan", action: "UPDATE", resource: "API/ROOMS" },
    { name: "Hapus Ruangan", action: "DELETE", resource: "API/ROOMS" },
    // School Settings
    { name: "Lihat Setting Sekolah", action: "READ", resource: "API/SCHOOL_SETTINGS" },
    { name: "Buat Setting Sekolah", action: "CREATE", resource: "API/SCHOOL_SETTINGS" },
    { name: "Ubah Setting Sekolah", action: "UPDATE", resource: "API/SCHOOL_SETTINGS" },
    { name: "Hapus Setting Sekolah", action: "DELETE", resource: "API/SCHOOL_SETTINGS" },
    // Subjects
    { name: "Lihat Mapel", action: "READ", resource: "API/SUBJECTS" },
    { name: "Buat Mapel", action: "CREATE", resource: "API/SUBJECTS" },
    { name: "Ubah Mapel", action: "UPDATE", resource: "API/SUBJECTS" },
    { name: "Hapus Mapel", action: "DELETE", resource: "API/SUBJECTS" },
    // Classes
    { name: "Lihat Kelas", action: "READ", resource: "API/CLASSES" },
    { name: "Buat Kelas", action: "CREATE", resource: "API/CLASSES" },
    { name: "Ubah Kelas", action: "UPDATE", resource: "API/CLASSES" },
    { name: "Hapus Kelas", action: "DELETE", resource: "API/CLASSES" },
    // Academic Years & Periods
    { name: "Lihat Tahun Ajaran", action: "READ", resource: "API/ACADEMIC_YEARS" },
    { name: "Buat Tahun Ajaran", action: "CREATE", resource: "API/ACADEMIC_YEARS" },
    { name: "Ubah Tahun Ajaran", action: "UPDATE", resource: "API/ACADEMIC_YEARS" },
    { name: "Hapus Tahun Ajaran", action: "DELETE", resource: "API/ACADEMIC_YEARS" },
    { name: "Lihat Periode", action: "READ", resource: "API/PERIODS" },
    { name: "Buat Periode", action: "CREATE", resource: "API/PERIODS" },
    { name: "Ubah Periode", action: "UPDATE", resource: "API/PERIODS" },
    { name: "Hapus Periode", action: "DELETE", resource: "API/PERIODS" },
    // Role users assignment
    { name: "Lihat User per Role", action: "READ", resource: "API/ROLES_USERS" },
    { name: "Atur User per Role", action: "UPDATE", resource: "API/ROLES_USERS" },
    // Questions
    { name: "Lihat Soal", action: "READ", resource: "API/QUESTIONS" },
    { name: "Buat Soal", action: "CREATE", resource: "API/QUESTIONS" },
    { name: "Ubah Soal", action: "UPDATE", resource: "API/QUESTIONS" },
    { name: "Hapus Soal", action: "DELETE", resource: "API/QUESTIONS" },
    // Exams
    { name: "Lihat Ujian", action: "READ", resource: "API/EXAMS" },
    { name: "Buat Ujian", action: "CREATE", resource: "API/EXAMS" },
    // Attempts
    { name: "Lihat Attempt", action: "READ", resource: "API/ATTEMPTS" },
    { name: "Mulai Attempt", action: "CREATE", resource: "API/ATTEMPTS" },
  ];
  for (const p of permList) {
    await prisma.permission.upsert({ where: { action_resource: { action: p.action, resource: p.resource } }, update: {}, create: p });
  }
  const adminRole = roles[0];
  const adminResources = [
    "API/MENU",
    "API/ROLES",
    "API/USERS",
    "API/SCHOOLS",
    "API/DEPARTMENTS",
    "API/ROOMS",
    "API/SCHOOL_SETTINGS",
    "API/ROLES_USERS",
    "API/SUBJECTS",
    "API/CLASSES",
    "API/ACADEMIC_YEARS",
    "API/PERIODS",
    "API/QUESTIONS",
    "API/EXAMS",
    "API/ATTEMPTS",
  ];
  const perms = await prisma.permission.findMany({ where: { resource: { in: adminResources } } });
  for (const pr of perms) {
    await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: adminRole.id, permissionId: pr.id } }, update: {}, create: { roleId: adminRole.id, permissionId: pr.id } });
  }
  const dash = await prisma.menu.findUnique({ where: { key: "dashboard" } });
  if (dash) await prisma.roleMenu.upsert({ where: { roleId_menuId: { roleId: adminRole.id, menuId: dash.id } }, update: {}, create: { roleId: adminRole.id, menuId: dash.id } });

  // Link Bank Soal menu to ADMIN_SCHOOL, GURU, STAFF
  const bankSoal = await prisma.menu.findUnique({ where: { key: 'bank_soal' } });
  if (bankSoal) {
    // roles: [0]=ADMIN_SCHOOL, [1]=GURU, [2]=SISWA, [3]=STAFF
    const adminSchool = roles[0];
    const guru = roles[1];
    const staff = roles[3];
    for (const r of [adminSchool, guru, staff]) {
      await prisma.roleMenu.upsert({
        where: { roleId_menuId: { roleId: r.id, menuId: bankSoal.id } },
        update: {},
        create: { roleId: r.id, menuId: bankSoal.id },
      });
    }
  }

  // Link Exam Cards & Schedule menus to roles
  const examSchedule = await prisma.menu.findUnique({ where: { key: 'exams_schedule' } });
  const examCards = await prisma.menu.findUnique({ where: { key: 'exams_cards' } });
  if (examSchedule) {
    const adminSchool = roles[0];
    const guru = roles[1];
    for (const r of [adminSchool, guru]) {
      await prisma.roleMenu.upsert({
        where: { roleId_menuId: { roleId: r.id, menuId: examSchedule.id } },
        update: {},
        create: { roleId: r.id, menuId: examSchedule.id },
      });
    }
  }
  if (examCards) {
    const adminSchool = roles[0];
    const guru = roles[1];
    for (const r of [adminSchool, guru]) {
      await prisma.roleMenu.upsert({
        where: { roleId_menuId: { roleId: r.id, menuId: examCards.id } },
        update: {},
        create: { roleId: r.id, menuId: examCards.id },
      });
    }
  }

  console.log("Seed selesai.");
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
