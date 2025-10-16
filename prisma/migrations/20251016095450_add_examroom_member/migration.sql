-- DropForeignKey
ALTER TABLE "public"."ExamRoom" DROP CONSTRAINT "ExamRoom_examId_fkey";

-- AlterTable
ALTER TABLE "ExamRoom" ADD COLUMN     "academicYearId" TEXT,
ADD COLUMN     "periodId" TEXT,
ALTER COLUMN "examId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ExamRoomClass" (
    "id" TEXT NOT NULL,
    "examRoomId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,

    CONSTRAINT "ExamRoomClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamRoomMember" (
    "id" TEXT NOT NULL,
    "examRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ExamRoomMember_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ExamRoom" ADD CONSTRAINT "ExamRoom_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamRoom" ADD CONSTRAINT "ExamRoom_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamRoom" ADD CONSTRAINT "ExamRoom_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamRoomClass" ADD CONSTRAINT "ExamRoomClass_examRoomId_fkey" FOREIGN KEY ("examRoomId") REFERENCES "ExamRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamRoomClass" ADD CONSTRAINT "ExamRoomClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamRoomMember" ADD CONSTRAINT "ExamRoomMember_examRoomId_fkey" FOREIGN KEY ("examRoomId") REFERENCES "ExamRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamRoomMember" ADD CONSTRAINT "ExamRoomMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
