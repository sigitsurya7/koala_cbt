"use client";

import { Card, Button } from "@heroui/react";
import { FiUsers, FiBook, FiBell, FiActivity } from "react-icons/fi";

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {/* */}
      <Card shadow="none" className="col-span-1 md:col-span-2 xl:col-span-2 bg-white/70 dark:bg-default-100/10 backdrop-blur-sm p-6 rounded-3xl">
        <div className="flex items-center gap-3 mb-3">
          <FiBell className="text-primary text-2xl" />
          <h2 className="text-xl font-semibold">Pengumuman Terbaru</h2>
        </div>
        <p className="text-sm opacity-80 mb-4">
          Ujian Tengah Semester dimulai pada <b>Senin, 14 Oktober 2025</b>.
          Pastikan seluruh siswa sudah login dan memverifikasi akun mereka.
        </p>
        <Button color="primary" size="sm" className="font-medium">
          Lihat Semua Pengumuman
        </Button>
      </Card>

      {/* */}
      <Card shadow="none" className="bg-koala-mint/30 dark:bg-default-100/20 backdrop-blur-sm p-6 rounded-3xl flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <FiBook className="text-2xl dark:text-primary" />
          <span className="text-xs opacity-70">Total</span>
        </div>
        <h3 className="text-3xl font-semibold mt-2">24</h3>
        <p className="text-sm opacity-70">Kelas Terdaftar</p>
      </Card>

      {/* */}
      <Card shadow="none" className="bg-koala-sky/30 dark:bg-default-100/20 backdrop-blur-sm p-6 rounded-3xl flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <FiUsers className="text-2xl dark:text-primary" />
          <span className="text-xs opacity-70">Hari Ini</span>
        </div>
        <h3 className="text-3xl font-semibold mt-2">372</h3>
        <p className="text-sm opacity-70">Siswa Aktif</p>
      </Card>

      {/* */}
      <Card shadow="none" className="col-span-1 md:col-span-2 xl:col-span-4 bg-white/70 dark:bg-default-100/10 backdrop-blur-sm p-6 rounded-3xl">
        <div className="flex items-center gap-3 mb-3">
          <FiActivity className="text-primary text-2xl" />
          <h2 className="text-lg font-semibold">Aktivitas Terakhir</h2>
        </div>
        <ul className="text-sm opacity-90 space-y-2">
          <li>Guru <b>Rina A.</b> menambahkan soal baru di kelas <b>XI IPA 2</b>.</li>
          <li>Siswa <b>Andi Saputra</b> menyelesaikan ujian Bahasa Inggris.</li>
          <li><b>45</b> siswa login dalam 5 menit terakhir.</li>
          <li>Pengumuman baru ditambahkan oleh admin <b>Koala Creative</b>.</li>
        </ul>
      </Card>
    </div>
  );
}


