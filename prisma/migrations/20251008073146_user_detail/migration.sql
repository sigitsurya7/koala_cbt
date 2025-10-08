-- CreateTable
CREATE TABLE "UserDetail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "gender" TEXT,
    "birthPlace" TEXT,
    "birthDate" TIMESTAMP(3),
    "phone" TEXT,
    "address" TEXT,
    "religion" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentDetail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nis" TEXT,
    "nisn" TEXT,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT,
    "departmentId" TEXT,
    "entryYear" INTEGER,
    "status" TEXT,
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "guardianJob" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherDetail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "nip" TEXT,
    "nuptk" TEXT,
    "subjectId" TEXT,
    "position" TEXT,
    "education" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffDetail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "nip" TEXT,
    "position" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserDetail_userId_key" ON "UserDetail"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentDetail_userId_key" ON "StudentDetail"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherDetail_userId_key" ON "TeacherDetail"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffDetail_userId_key" ON "StaffDetail"("userId");

-- AddForeignKey
ALTER TABLE "UserDetail" ADD CONSTRAINT "UserDetail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDetail" ADD CONSTRAINT "StudentDetail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDetail" ADD CONSTRAINT "StudentDetail_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDetail" ADD CONSTRAINT "StudentDetail_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDetail" ADD CONSTRAINT "StudentDetail_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherDetail" ADD CONSTRAINT "TeacherDetail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherDetail" ADD CONSTRAINT "TeacherDetail_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherDetail" ADD CONSTRAINT "TeacherDetail_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffDetail" ADD CONSTRAINT "StaffDetail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffDetail" ADD CONSTRAINT "StaffDetail_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
