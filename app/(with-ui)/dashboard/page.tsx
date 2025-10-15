"use client";

import { Card, Button, Badge, Progress, Avatar, Chip } from "@heroui/react";
import { 
  FiUsers, 
  FiBook, 
  FiBell, 
  FiActivity,
  FiCalendar,
  FiAward,
  FiClock,
  FiSettings,
  FiSearch,
  FiBarChart
} from "react-icons/fi";

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Dashboard
          </h1>
          <p className="text-default-500 mt-1">Selamat datang kembali, Admin!</p>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* Announcement Card */}
        <Card isBlurred className="lg:col-span-2 bg-white/80 dark:bg-default-100/10 backdrop-blur-sm p-6 rounded-3xl border border-white/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-2xl">
              <FiBell className="text-primary text-xl" />
            </div>
            <h2 className="text-xl font-semibold">Pengumuman Terbaru</h2>
            <Badge color="danger" size="sm" variant="flat" className="ml-auto">
              Baru
            </Badge>
          </div>
          <p className="text-default-600 mb-4 leading-relaxed">
            Ujian Tengah Semester dimulai pada <b>Senin, 14 Oktober 2025</b>. 
            Pastikan seluruh siswa sudah login dan memverifikasi akun mereka.
          </p>
          <div className="flex gap-3">
            <Button color="primary" size="sm" className="font-medium rounded-2xl">
              Lihat Detail
            </Button>
            <Button variant="light" size="sm" className="font-medium rounded-2xl">
              Arsipkan
            </Button>
          </div>
        </Card>

        {/* Quick Stats */}
        <Card isBlurred className="bg-gradient-to-br from-koala-mint/40 to-emerald-200/30 dark:from-emerald-500/20 dark:to-emerald-600/10 backdrop-blur-sm p-6 rounded-3xl border border-white/50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-white/50 rounded-2xl">
              <FiBook className="text-emerald-600 text-xl" />
            </div>
            <Chip variant="flat">
              +12%
            </Chip>
          </div>
          <h3 className="text-3xl font-bold mb-1">24</h3>
          <p className="text-default-600 text-sm">Kelas Terdaftar</p>
          <Progress 
            value={75} 
            color="success" 
            className="mt-3" 
            size="sm"
          />
        </Card>

        <Card isBlurred className="bg-gradient-to-br from-koala-sky/40 to-blue-200/30 dark:from-blue-500/20 dark:to-blue-600/10 backdrop-blur-sm p-6 rounded-3xl border border-white/50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-white/50 rounded-2xl">
              <FiUsers className="text-blue-600 text-xl" />
            </div>
            <Chip variant="flat">
              +8%
            </Chip>
          </div>
          <h3 className="text-3xl font-bold mb-1">372</h3>
          <p className="text-default-600 text-sm">Siswa Aktif</p>
          <Progress 
            value={60} 
            color="primary" 
            className="mt-3" 
            size="sm"
          />
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* Exam Progress */}
        <Card isBlurred className="lg:col-span-2 bg-white/80 dark:bg-default-100/10 backdrop-blur-sm p-6 rounded-3xl border border-white/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-2xl">
              <FiBarChart className="text-primary text-xl" />
            </div>
            <h2 className="text-xl font-semibold">Progress Ujian</h2>
          </div>
          <div className="space-y-4">
            {[
              { name: "Matematika", progress: 75, color: "primary", students: 45 },
              { name: "Bahasa Inggris", progress: 60, color: "success", students: 38 },
              { name: "Fisika", progress: 45, color: "warning", students: 32 },
              { name: "Kimia", progress: 30, color: "danger", students: 28 }
            ].map((exam, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{exam.name}</span>
                    <span className="text-default-500">{exam.students} siswa</span>
                  </div>
                  <Progress 
                    value={exam.progress} 
                    color={exam.color as any} 
                    className="h-2"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming Exams */}
        <Card isBlurred className="bg-gradient-to-br from-amber-100/40 to-orange-200/30 dark:from-amber-500/20 dark:to-orange-600/10 backdrop-blur-sm p-6 rounded-3xl border border-white/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/50 rounded-2xl">
              <FiCalendar className="text-amber-600 text-xl" />
            </div>
            <h3 className="font-semibold">Ujian Mendatang</h3>
          </div>
          <div className="space-y-3">
            {[
              { subject: "Matematika", date: "14 Okt", time: "08:00", class: "XI IPA 1" },
              { subject: "Bahasa Indonesia", date: "15 Okt", time: "10:00", class: "X IPS 2" },
              { subject: "Kimia", date: "16 Okt", time: "13:00", class: "XII IPA 3" }
            ].map((exam, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-white/50 rounded-2xl">
                <div className="text-center">
                  <div className="font-bold text-amber-600">{exam.date}</div>
                  <div className="text-xs text-default-500 dark:text-white/60">{exam.time}</div>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{exam.subject}</div>
                  <div className="text-xs text-default-500 dark:text-white/60">{exam.class}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card isBlurred className="lg:col-span-1 bg-white/80 dark:bg-default-100/10 backdrop-blur-sm p-6 rounded-3xl border border-white/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-2xl">
              <FiActivity className="text-primary text-xl" />
            </div>
            <h2 className="text-xl font-semibold">Aktivitas Terakhir</h2>
          </div>
          <div className="space-y-4 overflow-y-auto h-[20rem] scrollbar-hide">
            {[
              { 
                user: "Rina A.", 
                action: "menambahkan soal baru", 
                target: "XI IPA 2",
                time: "5 menit lalu",
                type: "teacher"
              },
              { 
                user: "Andi Saputra", 
                action: "menyelesaikan ujian", 
                target: "Bahasa Inggris",
                time: "12 menit lalu",
                type: "student"
              },
              { 
                user: "System", 
                action: "45 siswa login dalam", 
                target: "5 menit terakhir",
                time: "15 menit lalu",
                type: "system"
              },
              { 
                user: "Koala Creative", 
                action: "menambahkan pengumuman", 
                target: "baru",
                time: "30 menit lalu",
                type: "admin"
              }
            ].map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 hover:bg-white/50 rounded-2xl transition-colors">
                <div className={`p-2 rounded-2xl ${
                  activity.type === 'teacher' ? 'bg-blue-100 text-blue-600' :
                  activity.type === 'student' ? 'bg-green-100 text-green-600' :
                  activity.type === 'admin' ? 'bg-purple-100 text-purple-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  <FiClock className="text-sm" />
                </div>
                <div className="flex-1">
                  <p className="text-sm">
                    <b>{activity.user}</b> {activity.action} <b>{activity.target}</b>
                  </p>
                  <p className="text-xs text-default-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}