import { PrismaClient, UserType, Visibility } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin123";

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
  await prisma.menu.upsert({
    where: { key: "dashboard" },
    update: {
      name: "Dashboard",
      path: "/dashboard",
      icon: "FiHome",
      order: 0,
      visibility: Visibility.PRIVATE,
      isActive: true,
    },
    create: {
      name: "Dashboard",
      key: "dashboard",
      path: "/dashboard",
      icon: "FiHome",
      order: 0,
      visibility: Visibility.PRIVATE,
      isActive: true,
    },
  });

  console.log("Seed selesai.");
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
