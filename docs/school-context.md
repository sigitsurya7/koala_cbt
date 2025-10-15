# 🏫 School Context Flow (SuperAdmin vs Non-SuperAdmin)

## 🧠 Tujuan
Menjelaskan bagaimana frontend dan backend saling sinkron dalam hal **pengambilan data yang membutuhkan `schoolId`**,  
dengan memperhatikan dua kondisi utama:
- `isSuperAdmin === true`
- `isSuperAdmin === false`

---

## ⚙️ 1. Konsep Dasar

Semua request yang menyentuh entitas sekolah (misal: `Class`, `Department`, `Subject`, `Exam`, dsb.)  
harus membawa konteks `schoolId`.  

Konteks ini bisa berasal dari:
- **Dropdown (select)** — jika user `isSuperAdmin === true`
- **Context aktif (session)** — jika user `isSuperAdmin === false`

---

## 🧩 2. Flow A — `isSuperAdmin === true`

SuperAdmin **tidak terikat ke satu sekolah**, jadi:
- Dia **bisa berpindah sekolah** lewat dropdown “Select School” (biasanya di navbar).
- Value `activeSchoolId` akan **disimpan di global state / context (misal Zustand, Redux, atau ContextAPI)**.
- Semua API call **menggunakan `activeSchoolId`** sebagai query param atau header tambahan.

### 🪄 Alur Detail

```
[1] User login → isSuperAdmin = true
      ↓
[2] Fetch list sekolah via /api/school/list
      ↓
[3] Tampilkan dropdown <SelectSchool> di Navbar
      ↓
[4] User pilih sekolah → update context.activeSchoolId
      ↓
[5] Semua fetch API setelah ini:
      /api/class?schoolId={activeSchoolId}
      /api/subject?schoolId={activeSchoolId}
      /api/exam?schoolId={activeSchoolId}
      ↓
[6] Context disimpan (misal di Zustand / localStorage)
      agar gak reset tiap reload.
```

📦 **Contoh State di Frontend**

```ts
interface SchoolContext {
  activeSchoolId: string | null;
  setActiveSchool: (id: string) => void;
}
```

📡 **Contoh Request API**
```ts
axios.get(`/api/department?schoolId=${activeSchoolId}`);
```

🧠 Catatan:
- Kalau `activeSchoolId` belum dipilih → redirect atau tampilkan warning.
- Bisa juga set default `schoolId` ke sekolah pertama dalam list.

---

## 🧩 3. Flow B — `isSuperAdmin === false`

Untuk user **Admin Sekolah, Guru, Staff, Siswa**,  
mereka **hanya terikat ke satu sekolah aktif**, jadi:
- Tidak perlu dropdown pilih sekolah.
- `schoolId` otomatis diambil dari **context session login** (misal `req.user.activeSchoolId` di backend).
- Semua request frontend **tidak perlu kirim schoolId manual**.

### ⚙️ Alur Detail

```
[1] User login → isSuperAdmin = false
      ↓
[2] Backend kirim payload login:
      { user: ..., activeSchoolId: "cmgofwl1s0000vk98tfwqohqp" }
      ↓
[3] Frontend simpan di authStore / context:
      state.schoolId = activeSchoolId
      ↓
[4] Semua request berikut otomatis include:
      /api/class  → backend baca req.user.schoolId
      /api/exam   → backend baca req.user.schoolId
      /api/subject → backend baca req.user.schoolId
```

📦 **Contoh State di Frontend**

```ts
interface AuthStore {
  user: User;
  schoolId: string; // fixed for non-superadmin
}
```

📡 **Contoh Request API**
```ts
axios.get("/api/class"); // backend ambil schoolId dari JWT payload
```

🧠 Catatan:
- Kalau user ( isSuperAdmin === false ) punya banyak sekolah (misal guru multi-school),  
  backend harus kirim `availableSchools[]` untuk di letakan pada navbar, dan jadikan satu sekolah sebagai default sekolah aktif.
- Lalu saat merubah pada navbar maka schoolActive bisa berubah

---

## 🔐 4. Middleware Protection (Frontend & Backend)

| Layer | Behavior |
|--------|-----------|
| **Frontend Middleware** | Jika `!isSuperAdmin` dan tidak ada `schoolId` di context → logout paksa / error “School context missing.” |
| **Backend Middleware** | Cek JWT payload. Kalau `!isSuperAdmin` → wajib ada `schoolId` di payload. Kalau SuperAdmin → boleh override `?schoolId=...`. |

📜 **Contoh Middleware (Next.js)**
```ts
if (!user.isSuperAdmin && !user.schoolId) {
  return NextResponse.json({ message: "No school context" }, { status: 403 });
}
```

---

## 🧭 5. Behavior Ringkas

| Kondisi | UI Select School | Sumber `schoolId` | Boleh Ganti Sekolah | Catatan |
|----------|------------------|------------------|----------------------|----------|
| `isSuperAdmin === true` | ✅ Ya | User pilih (manual) | ✅ Bisa | Harus pilih sebelum API call |
| `isSuperAdmin === false` | ❌ Tidak | Dari session/login | ❌ Tidak bisa | Auto contextualized |

---

## 🧘‍♂️ 6. Future Extension

- Semua audit log tetap mencatat `schoolId`, biar jejaknya jelas walau user multi-tenant.
- Tambahkan **lastActiveSchoolId** di DB biar context bisa auto-restore pas login ulang.
