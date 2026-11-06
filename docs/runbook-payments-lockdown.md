# Runbook — Payments Lockdown (#2)

Tujuan: menerapkan `20261106000004_lockdown_payments.sql` dengan aman ke **production**
(tidak ada staging), plus rollback.

Prasyarat: PR (a) **Redesign UI** dan PR (b) **Security: payments lockdown** sudah di-review.

> **Kompatibilitas urutan (penting).** Kode PR (b) berjalan **sebelum maupun sesudah** migrasi 004:
> - Sebelum 004: penulisan QRIS internal sudah lewat service role; `saveTransaction` (cash) memakai RPC `pay_order`; policy lama masih membolehkan klien menulis payment (celah belum ditutup).
> - Sesudah 004: policy baru memblokir penulisan klien; RPC & service role tetap bekerja.
> Karena itu urutannya: **deploy kode dulu → cek normal → baru migrasi.**

---

## a. Waktu
Kerjakan **di luar jam operasional**. Estimasi downtime: **0** (migrasi DDL singkat, tidak memblokir request lama).

## b. Cek env Vercel (Production)
1. Vercel → Project → Settings → Environment Variables, scope **Production**:
   - `SUPABASE_SERVICE_ROLE_KEY` **harus ada** (dipakai untuk penulisan QRIS internal, webhook, verifikasi status).
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — catat (untuk backup/test).
   - **Catat nilai `MIDTRANS_IS_PRODUCTION`** (apakah `true`/`false`, dan apakah `MIDTRANS_SERVER_KEY` ber-prefix sandbox `SB-`). Jangan diubah.
2. Pastikan juga scope **Preview** (kalau dipakai) punya variabel yang sama.

## c. Merge & deploy PR (a) — Redesign UI
1. Merge PR (a) ke `main`. Vercel deploy otomatis.
2. Cek cepat: buka `/kasir`, `/kasir/transaksi/baru`, Detail Transaksi, Nota, `/admin`. Tidak ada error.

## d. Merge & deploy PR (b) — Security: payments lockdown
1. Merge PR (b) ke `main` (di atas PR (a)). Tunggu deploy selesai.
2. Cek aplikasi **sebelum migrasi**: buat transaksi → bayar tunai; buat transaksi → Belum bayar; buka/tutup shift. Semua harus normal.

## e. Backup (sebelum migrasi)
1. **Backup otomatis Supabase**: Dashboard → Database → Backups. Catat jadwal/retensi sesuai paket (Free umumnya tanpa PITR harian; Pro punya harian). Jika tidak ada yang memadai, lanjut ke langkah 2.
2. **pg_dump manual** (ambil connection string dari Dashboard → Settings → Database → Connection string → URI, mode *Direct* port 5432):
   ```bash
   export SUPABASE_DB_URL="postgresql://postgres:<PASSWORD>@db.<ref>.supabase.co:5432/postgres"
   STAMP=$(date +%Y%m%d-%H%M%S)
   OUT="$HOME/laundryin-backups/$STAMP"; mkdir -p "$OUT"

   # Data tabel yang terdampak
   pg_dump "$SUPABASE_DB_URL" --schema=public \
     --table=public.payments --table=public.orders --table=public.order_items \
     --table=public.cash_registers --table=public.profiles \
     --data-only --format=custom --file "$OUT/data.dump"

   # Definisi fungsi + policy (schema penuh, untuk restore cepat)
   pg_dump "$SUPABASE_DB_URL" --schema=public --format=custom --file "$OUT/schema.dump"

   # Definisi policy & fungsi saja (ringkas, mudah dibaca)
   pg_dump "$SUPABASE_DB_URL" --schema=public --schema-only | \
     grep -iE "create policy|create or replace function|grant|revoke" > "$OUT/policies_and_functions.sql"
   ```
   Simpan di **luar repo** (`$HOME/laundryin-backups/...`), jangan commit.

## f. Terapkan migrasi 004
Pilih salah satu (SQL Editor paling sederhana):
- **Dashboard**: SQL Editor → tempel isi `supabase/migrations/20261106000004_lockdown_payments.sql` → Run.
- **CLI**: `supabase db push` (butuh `supabase link`).
- **psql**:
  ```bash
  psql "$SUPABASE_DB_URL" -f supabase/migrations/20261106000004_lockdown_payments.sql
  ```

## g. Jalankan skrip uji + cleanup
```bash
# dari root repo, dengan .env.local terisi (termasuk SUPABASE_SERVICE_ROLE_KEY)
node scripts/security-tests/payments-lockdown.mjs
# hanya membersihkan sisa data uji:
node scripts/security-tests/payments-lockdown.mjs --cleanup-only
```
Skrip hanya menyentuh akun uji `kasir.uji@…` / `admin.uji@…` dan order uji "UJI – jangan diproses".

## h. Uji manual singkat (di HP)
1. Kasir: buka shift → buat transaksi → **bayar tunai** → Detail menampilkan Lunas.
2. Kasir: buat transaksi → **QRIS** → tampil QR → (opsional) bayar di simulator → cek status.
3. Kasir: buat transaksi → **Bayar nanti** → dari Detail → "Terima pembayaran"/"Lihat QR".
4. Pastikan order **Belum bayar** tidak bisa ditandai "siap diambil"/"sudah diambil".

## i. Jika ada yang gagal
1. Jalankan rollback: `supabase/migrations/rollback/20261106000004_lockdown_payments_down.sql`
   ```bash
   psql "$SUPABASE_DB_URL" -f supabase/migrations/rollback/20261106000004_lockdown_payments_down.sql
   ```
2. Laporkan error (langkah, pesan, waktu) sebelum mencoba lagi.

---

## Lampiran A — Metode pembayaran & dampak "pay_order hanya cash"

| Metode | Dipakai di | Dampak setelah 004 |
|---|---|---|
| `cash` | `saveTransaction` (via RPC `pay_order`), halaman Pembayaran | **Tidak berubah** — satu-satunya jalur `paid` untuk tunai. |
| `qris_dynamic` | `startQrisDynamicForOrder` (halaman Pembayaran) | Penulisan via **service role**; `paid` hanya dari webhook/verifikasi status Midtrans. `pay_order` tidak menanganinya (pending qris akan di-`expired` bila ada). |
| `qris_manual` | Dinonaktifkan di `saveTransaction` | **Tidak bisa** lagi memakai `pay_order` untuk menandai paid (dulu bisa → celah). Perlu alur/fungsi khusus bila ingin diaktifkan. |
| `transfer` | Dinonaktifkan di `saveTransaction` | Sama seperti `qris_manual`: tidak bisa via `pay_order`. |
| `payLater` | `saveTransaction` (insert pending cash) | Insert **pending** masih boleh (terikat shift open); pelunasan lewat `pay_order`. |

Catatan: `payments.method` masih mengizinkan `cash|transfer|qris_manual|qris_dynamic` (constraint tidak diubah). Yang berubah hanya jalur `paid` via `pay_order`.
