## laundry.in (PWA)

Milestone 0: fondasi aplikasi laundry (PWA basic + login + role kasir/admin + skema database inti).

## Getting Started

### 1) Setup Supabase

- Buat project Supabase baru
- Buka SQL Editor, lalu jalankan file [schema.sql](file:///Users/nafihermawan/Documents/trae_projects/laundryApp/supabase/schema.sql)
- Buat user untuk kasir dan admin (Auth → Users)
- Set role admin lewat tabel `profiles` (mis. update `role` menjadi `admin` untuk user admin)

### 2) Setup env

Copy `.env.example` menjadi `.env.local` lalu isi:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=... # hanya untuk script create user (jangan pakai NEXT_PUBLIC)
```

### 2a) Buat user kasir via script (opsional)

Jika ingin membuat user kasir dari lokal (tanpa klik di Dashboard), jalankan:

```bash
npm run create:user kasir 123456
```

Script akan membuat user dengan email `kasir@laundry.local` (default), lalu trigger database akan otomatis membuat baris di tabel `profiles` dengan role `cashier`.

### 3) Jalankan lokal

Run development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Routes

- `/login` untuk masuk
- `/kasir` untuk area kasir (kasir dan admin bisa akses)
- `/admin` untuk area admin (khusus role `admin`)

### PWA

Aplikasi sudah punya manifest dan icon dasar (`/manifest.webmanifest`).
