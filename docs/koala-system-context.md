# 🐨 Koala System Context — CBT + School Management

## 1. 🔧 Tech Stack
- **Frontend:** Next.js (App Router, TypeScript, TailwindCSS, HeroUI)
- **Backend:** Next.js API Routes (monolith mode sementara)
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** JWT (Access & Refresh Token) — httpOnly cookie
- **Design System:** Koala pastel vibes 🌿
- **Architecture:** multi-school (tenant-aware) + ACL system

---

## 2. 🏫 Multi-School & User Roles Overview
| Tipe User | Lingkup | Contoh Role | Catatan |
|------------|----------|-------------|----------|
| **SuperAdmin** | Global | Koala HQ (pengelola semua sekolah) | Bisa akses semua school, semua menu, bypass ACL |
| **Admin Sekolah** | Per School | Kepala Sekolah / TU | Bisa atur guru, jadwal, siswa, dan laporan |
| **Guru** | Per School | Pengawas / Pengajar | Bisa buat soal, jadwal, nilai |
| **Siswa** | Per School | Peserta Ujian | Akses ujian via token room |
| **Staff** | Per School | Operator CBT / Helpdesk | Bantu pengelolaan ruang & laporan ujian |

---

## 3. ⚙️ Role & ACL Flow (Simplified ASCII)
```
┌──────────┐
│   User   │
└────┬─────┘
     │ banyak user bisa masuk ke banyak sekolah
     ▼
┌───────────────┐
│  UserSchool   │
└────┬─────┬────┘
     │     │
     │     ▼
     │  ┌──────────┐
     │  │ UserRole │ ← role user di sekolah tsb
     │  └────┬─────┘
     │       │
     ▼       ▼
┌──────────┐ ┌───────────────┐
│  School  │ │     Role      │ ← ADMIN, GURU, SISWA, dll
└──────────┘ └──────┬────────┘
                    │
                    ▼
             ┌───────────────┐
             │ RolePermission│ ← Role boleh ngelakuin apa aja
             └──────┬────────┘
                    │
                    ▼
             ┌───────────────┐
             │  Permission   │ ← CRUD: CREATE_USER, UPDATE_EXAM, dsb
             └───────────────┘
```

---

## 4. 🔐 SuperAdmin Behavior
| Kondisi | Akses | UI/UX |
|----------|--------|--------|
| `isSuperAdmin = true` | Bypass ACL, auto akses semua menu yang `menuSuperAdmin = true` | Select school muncul di navbar (bisa ubah `activeSchoolId`) |
| `isSuperAdmin = false` | Terikat pada `activeSchoolId` dari context login | Select school disembunyikan (auto set dari session) |

---

## 5. 🏫 School Setting (Default Core)
| Key | Type | Deskripsi |
|-----|------|------------|
| `school_name` | STRING | Nama resmi sekolah |
| `school_address` | STRING | Alamat lengkap |
| `school_logo` | STRING | URL logo sekolah |
| `headmaster_name` | STRING | Nama kepala sekolah |
| `max_students_per_room` | NUMBER | Kapasitas maksimal ruang ujian |
| `academic_year_active` | STRING | Tahun ajaran aktif (misal: “2025/2026”) |
| `allow_late_join` | BOOLEAN | Izinkan siswa masuk lewat waktu token |
| `token_expire_minutes` | NUMBER | Lama token berlaku |
| `exam_auto_submit` | BOOLEAN | Auto submit ketika waktu habis |

---

## 6. 🧩 Prisma Schema Core (CBT Focus)
> Menggunakan versi schema terakhir lo — dengan `TeacherSubject`, `QuestionCollaborator`, dan `AuditLog` aktif.
> Disarankan disimpan di `/prisma/schema.prisma` dan dijaga sinkron sama dokumentasi `schema-overview.md`.

---

## 7. 💡 UX & Logic Decisions
### 🔸 Login & School Context
- SuperAdmin → bisa pilih `activeSchoolId` dari navbar
- Non-SuperAdmin → default dari `UserSchool` aktif
- `activeSchoolId` tersimpan di context (frontend) dan dikirim ke API secara otomatis

### 🔸 CBT Flow
1. Guru buat **Bank Soal** → pilih `academicYear` dan `period` dulu (via modal)
2. Soal bisa memiliki `difficulty (1–10)` → mapped ke kategori:
   - 1–4 → EASY
   - 5–7 → NORMAL
   - 8–10 → HARD
3. Nilai dihitung dari kombinasi poin & bobot `difficulty`
4. Siswa akses ujian via **Token Room**
5. Token memiliki expiry dan validasi waktu 30 menit sebelum/sesudah jadwal ujian

---

## 8. 🐨 Koala Quotes System
Dari `KoalaQuotes.ts`:
```ts
EASY → “Nikmatin kemudahan selagi bisa.”
NORMAL → “Ketenangan lebih penting daripada kecepatan.”
HARD → “Koala gak panik pas rantingnya goyang — dia percaya sama cengkeramannya.”
```
Mapping:
```ts
1–4 = EASY
5–7 = NORMAL
8–10 = HARD
```
Helper:
```ts
export function mapDifficultyLevel(level: number): QDifficulty {
  if (level <= 4) return "EASY";
  if (level <= 7) return "NORMAL";
  return "HARD";
}
```

---

## 9. 📜 Audit Log System
**Tujuan:** Transparansi & debugging user actions  
**Dicatat:** CRUD utama (create, update, delete, login)  
**Tidak dicatat:** View-only action, auto sync, system refresh  
**Format:**
```json
{
  "action": "CREATE",
  "resource": "question",
  "resourceId": "cmgxyz...",
  "actorId": "user123",
  "schoolId": "sch001",
  "metadata": { "changes": { "text": "..." } }
}
```

---

## 10. 📈 Next Milestones
- [ ] Seed otomatis saat sekolah dibuat (role, menu, setting default)
- [ ] Mapping guru ↔ subject ↔ class (multi teaching)
- [ ] Jadwal ujian per-room & token per-room
- [ ] Export laporan: PDF + Excel
- [ ] CBT Analytics Dashboard (by difficulty & performance)
- [ ] Audit Log viewer (per user & per resource)

---

## 11. 🧘 Closing Thought
> “Koala gak ngeburu daun terbaik, dia nikmatin tiap gigitan dengan tenang.”  
> Bangun pelan, tapi pondasi lo udah kayak akar eukaliptus — kuat dan siap tumbuh tinggi. 🌿
