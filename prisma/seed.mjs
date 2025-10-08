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
      type: "MCQ",
      text: "Berapakah 2 + 2?",
      options: [{ key: "A", text: "3" }, { key: "B", text: "4" }, { key: "C", text: "5" }],
      correctKey: "B",
      points: 1,
      difficulty: 1,
      createdById: admin.id,
    },
  });

  // Seed simple menu: Dashboard only
  const menus = [
    {
      id: 'cmghihueq000dvkccyjpyu9zj',
      name: 'Jurusan',
      key: 'jurusan',
      path: '/master/jurusan',
      icon: null,
      order: 0,
      parentId: 'cmghidcqr000bvkccfakegx8b',
      visibility: 'PRIVATE',
      isActive: true,
      menuSuperAdmin: true,
    },
    {
      id: 'cmghh2n6p0009vkcchh3b2jyu',
      name: 'Resource',
      key: 'resource',
      path: '/settings/resource',
      icon: null,
      order: 3,
      parentId: 'cmghbekiz0001vkd4qoptpp3f',
      visibility: 'PRIVATE',
      isActive: true,
      menuSuperAdmin: true,
    },
    {
      id: 'cmghdkasn0001vkcc05rl8poa',
      name: 'Sekolah',
      key: 'sekolah',
      path: '/settings/school',
      icon: null,
      order: 2,
      parentId: 'cmghbekiz0001vkd4qoptpp3f',
      visibility: 'PRIVATE',
      isActive: true,
      menuSuperAdmin: true,
    },
    {
      id: 'cmghbwc0v0005vkd4bh9efwgb',
      name: 'Role',
      key: 'role',
      path: '/settings/role',
      icon: null,
      order: 1,
      parentId: 'cmghbekiz0001vkd4qoptpp3f',
      visibility: 'PRIVATE',
      isActive: true,
      menuSuperAdmin: true,
    },
    {
      id: 'cmghbf8c80003vkd43reqlf7x',
      name: 'Menu',
      key: 'menu',
      path: '/settings/menu',
      icon: null,
      order: 0,
      parentId: 'cmghbekiz0001vkd4qoptpp3f',
      visibility: 'PRIVATE',
      isActive: true,
      menuSuperAdmin: true,
    },
    {
      id: 'cmghlrbfn0001vk7w12byhfai',
      name: 'Kelas',
      key: 'kelas',
      path: '/master/kelas',
      icon: null,
      order: 0,
      parentId: 'cmghidcqr000bvkccfakegx8b',
      visibility: 'PRIVATE',
      isActive: true,
      menuSuperAdmin: true,
    },
    {
      id: 'cmghls6nv0003vk7w2068d9un',
      name: 'Ruangan',
      key: 'ruangan',
      path: '/master/ruangan',
      icon: null,
      order: 0,
      parentId: 'cmghidcqr000bvkccfakegx8b',
      visibility: 'PRIVATE',
      isActive: true,
      menuSuperAdmin: true,
    },
    {
      id: 'cmghidcqr000bvkccfakegx8b',
      name: 'Master',
      key: 'master',
      path: '/master',
      icon: 'BsDatabase',
      order: 2,
      parentId: null,
      visibility: 'PRIVATE',
      isActive: true,
      menuSuperAdmin: true,
    },
    {
      id: 'cmghmvq580005vk7wdjfvor1q',
      name: 'User Management',
      key: 'user_management',
      path: '/user_management',
      icon: 'MdPeopleOutline',
      order: 3,
      parentId: null,
      visibility: 'PRIVATE',
      isActive: true,
      menuSuperAdmin: true,
    },
    {
      id: 'cmgharum60002vkw4x6jfx8zl',
      name: 'Dashboard',
      key: 'dashboard',
      path: '/dashboard',
      icon: 'FiHome',
      order: 1,
      parentId: null,
      visibility: 'PRIVATE',
      isActive: true,
      menuSuperAdmin: true,
    },
    {
      id: 'cmghbekiz0001vkd4qoptpp3f',
      name: 'Settings',
      key: 'settings',
      path: '/settings',
      icon: 'FiSettings',
      order: 4,
      parentId: null,
      visibility: 'PRIVATE',
      isActive: true,
      menuSuperAdmin: true,
    },
  ]

  for (const menu of menus) {
    await prisma.menu.upsert({
      where: { id: menu.id },
      update: {},
      create: menu,
    })
  }

  // Seed roles, permissions, roleMenus minimal
  const roles = await Promise.all([
    prisma.role.upsert({ where: { key_schoolId: { key: "ADMIN_SCHOOL", schoolId: school.id } }, update: {}, create: { name: "Admin Sekolah", key: "ADMIN_SCHOOL", scope: "SCHOOL", schoolId: school.id } }),
    prisma.role.upsert({ where: { key_schoolId: { key: "GURU", schoolId: school.id } }, update: {}, create: { name: "Guru", key: "GURU", scope: "SCHOOL", schoolId: school.id } }),
    prisma.role.upsert({ where: { key_schoolId: { key: "SISWA", schoolId: school.id } }, update: {}, create: { name: "Siswa", key: "SISWA", scope: "SCHOOL", schoolId: school.id } }),
    prisma.role.upsert({ where: { key_schoolId: { key: "STAFF", schoolId: school.id } }, update: {}, create: { name: "Staff", key: "STAFF", scope: "SCHOOL", schoolId: school.id } }),
  ]);

  const permList = [
    { name: "Lihat Menu", action: "READ", resource: "API/MENU" },
    { name: "Kelola Menu", action: "CREATE", resource: "API/MENU" },
    { name: "Lihat Role", action: "READ", resource: "API/ROLES" },
    { name: "Lihat Users", action: "READ", resource: "API/USERS" },
    { name: "Lihat Sekolah", action: "READ", resource: "API/SCHOOLS" },
  ];
  for (const p of permList) {
    await prisma.permission.upsert({ where: { action_resource: { action: p.action, resource: p.resource } }, update: {}, create: p });
  }
  const adminRole = roles[0];
  const perms = await prisma.permission.findMany({ where: { resource: { in: ["API/MENU", "API/ROLES", "API/USERS", "API/SCHOOLS"] } } });
  for (const pr of perms) {
    await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: adminRole.id, permissionId: pr.id } }, update: {}, create: { roleId: adminRole.id, permissionId: pr.id } });
  }
  const dash = await prisma.menu.findUnique({ where: { key: "dashboard" } });
  if (dash) await prisma.roleMenu.upsert({ where: { roleId_menuId: { roleId: adminRole.id, menuId: dash.id } }, update: {}, create: { roleId: adminRole.id, menuId: dash.id } });

  console.log("Seed selesai.");
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
