-- Soft-disable akun pengguna.
-- Kolom status aktif; user dengan is_active = false tidak boleh login.

alter table public.profiles
  add column if not exists is_active boolean not null default true;
