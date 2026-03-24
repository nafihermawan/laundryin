## laundry.in (PWA)

Aplikasi laundry PWA untuk operasional internal.

Milestone 0 berfokus pada fondasi:
- Login via Supabase Auth
- Role `cashier` dan `admin` (di tabel `profiles`)
- Skema database inti untuk transaksi laundry
- PWA basic (manifest + icon)

## Teknologi

- Next.js (App Router)
- Supabase (Auth + Postgres)
- Tailwind CSS
- Vitest

## Setup Lokal

### 1) Prasyarat

- Node.js (disarankan Node 20+)
- Project Supabase (baru atau existing)

### 2) Setup Supabase

- Buat project Supabase baru.
- Buka SQL Editor, lalu jalankan [schema.sql](file:///Users/nafihermawan/Documents/trae_projects/laundryApp/supabase/schema.sql).
- Buat user untuk kasir dan admin:
  - lewat Dashboard (Auth → Users), atau
  - lewat script lokal (lihat bagian “Buat User via Script”).
- Set role admin lewat tabel `profiles` (mis. update kolom `role` menjadi `admin` untuk user admin).

### 3) Setup Environment Variables

Copy `.env.example` menjadi `.env.local`, lalu isi:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Catatan:
- `NEXT_PUBLIC_*` dipakai di client/server runtime aplikasi.
- `SUPABASE_SERVICE_ROLE_KEY` hanya untuk proses server (mis. script create user). Jangan pernah memindahkan key ini ke variabel `NEXT_PUBLIC_*`, dan jangan pernah commit `.env.local`.

### 4) Install Dependency

```bash
npm install
```

### 5) Jalankan Lokal

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Buat User via Script (Opsional)

Jika ingin membuat user kasir dari lokal (tanpa klik di Dashboard), jalankan:

```bash
npm run create:user kasir 123456
```

Script akan membuat user dengan email `kasir@laundry.local` (default). Trigger database akan otomatis membuat baris di tabel `profiles` dengan role `cashier`.

## Scripts

- `npm run dev` menjalankan dev server
- `npm run build` build production
- `npm run start` menjalankan hasil build
- `npm run lint` menjalankan ESLint
- `npm run test` menjalankan Vitest
- `npm run create:user <nama> <password>` membuat user via service role key

Jika butuh dummy data, jalankan script:

```bash
dotenv_config_path=.env.local node -r dotenv/config scripts/seed-dummy.mjs
```

## Testing & Linting

```bash
npm run test
npm run lint
```

## Build & Start (Production)

```bash
npm run build
npm run start
```

## Catatan Database

- Sumber skema database ada di [schema.sql](file:///Users/nafihermawan/Documents/trae_projects/laundryApp/supabase/schema.sql).
- Role user dibaca dari `public.profiles.role`. Default role user baru adalah `cashier`. Untuk admin, set `role = 'admin'`.

## Catatan Keamanan

- Jangan commit `.env.local` atau service role key ke repo publik.
- Jika key terlanjur bocor, rotasi key Supabase dan update env di server/dev machine.

## Routes

- `/login` masuk aplikasi
- `/kasir` area kasir (kasir dan admin bisa akses)
- `/admin` area admin (khusus role `admin`)
- `/embed/*` halaman embed untuk kebutuhan cetak/riwayat

## PWA

Aplikasi sudah punya manifest dan icon dasar (`/manifest.webmanifest`).
