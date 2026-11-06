"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, ShieldCheck, ShieldOff } from "lucide-react";

import { MenuGroup, MenuRow } from "@/components/app/menu-group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { RoleSelect, type RoleValue } from "@/components/ui/role-select";
import { useToast } from "@/components/ui/toast";
import type { ManagedUser } from "@/lib/data/users";

import { resetUserPassword, setUserActive, updateUserProfile } from "../actions";

function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
      >
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

export function PenggunaDetail({
  user,
  currentUserId,
}: {
  user: ManagedUser;
  currentUserId: string;
}) {
  const router = useRouter();
  const { show } = useToast();
  const isSelf = user.id === currentUserId;

  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [role, setRole] = useState<RoleValue>(user.role);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetting, setResetting] = useState(false);

  const [activeOpen, setActiveOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  const name = user.full_name?.trim() || user.email || "Tanpa Nama";
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const roleLabel = user.role === "admin" ? "Admin" : "Kasir";

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrors({ fullName: "Nama wajib diisi" });
      return;
    }
    setErrors({});
    setSaving(true);
    const res = await updateUserProfile(user.id, { fullName, phone, role });
    setSaving(false);

    if (!res.success) {
      setErrors({ form: res.error });
      return;
    }

    show("Perubahan disimpan");
    router.refresh();
  }

  async function onResetPassword() {
    setResetError("");
    if (newPassword.length < 6) {
      setResetError("Kata sandi minimal 6 karakter");
      return;
    }
    setResetting(true);
    const res = await resetUserPassword(user.id, newPassword);
    setResetting(false);
    if (!res.success) {
      setResetError(res.error);
      return;
    }
    setResetOpen(false);
    setNewPassword("");
    show("Kata sandi diperbarui");
  }

  async function onToggleActive() {
    setToggling(true);
    const res = await setUserActive(user.id, !user.is_active);
    setToggling(false);
    if (!res.success) {
      show(res.error);
      return;
    }
    setActiveOpen(false);
    show(user.is_active ? "Akun dinonaktifkan" : "Akun diaktifkan");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-display text-[22px] font-bold ${
            user.role === "admin" ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-900"
          }`}
        >
          {initial}
        </span>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[17px] font-semibold text-slate-900">{name}</span>
            <Badge variant={user.role === "admin" ? "default" : "secondary"}>{roleLabel}</Badge>
          </div>
          {user.is_active ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Aktif
            </span>
          ) : (
            <Badge variant="outline">Nonaktif</Badge>
          )}
        </div>
      </div>

      <form onSubmit={onSave} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4">
          <Field label="Nama lengkap" htmlFor="fullName" error={errors.fullName}>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field
            label="Email"
            htmlFor="email"
            helper="Email tidak dapat diubah di sini."
          >
            <input id="email" type="email" value={user.email} readOnly disabled className={inputClass} />
          </Field>

          <Field label="No. HP (opsional)" htmlFor="phone">
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08xxxxxxxxxx"
              className={inputClass}
            />
          </Field>

          <Field label="Role" htmlFor="role">
            <RoleSelect value={role} onChange={setRole} disabled={isSelf} />
          </Field>

          {errors.form ? <p className="text-sm text-red-600">{errors.form}</p> : null}

          <Button type="submit" size="lg" fullWidth disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan perubahan"}
          </Button>
        </div>
      </form>

      <MenuGroup title="Keamanan & status">
        <MenuRow
          title="Reset kata sandi"
          icon={KeyRound}
          iconBox={false}
          onClick={() => {
            setNewPassword("");
            setResetError("");
            setResetOpen(true);
          }}
        />
        {!isSelf ? (
          user.is_active ? (
            <MenuRow
              title="Nonaktifkan akun"
              description="Tidak bisa masuk, riwayat transaksi tetap tersimpan"
              icon={ShieldOff}
              iconBox={false}
              destructive
              onClick={() => setActiveOpen(true)}
            />
          ) : (
            <MenuRow
              title="Aktifkan akun"
              description="Izinkan pengguna ini masuk kembali"
              icon={ShieldCheck}
              iconBox={false}
              onClick={() => setActiveOpen(true)}
            />
          )
        ) : null}
      </MenuGroup>

      {resetOpen ? (
        <Dialog title="Reset kata sandi" onClose={() => setResetOpen(false)}>
          <div className="flex flex-col gap-4">
            <Field label="Kata sandi baru" htmlFor="newPassword" error={resetError}>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-slate-500"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" strokeWidth={2} />
                  ) : (
                    <Eye className="h-5 w-5" strokeWidth={2} />
                  )}
                </button>
              </div>
            </Field>
            <div className="flex flex-col gap-2">
              <Button onClick={onResetPassword} disabled={resetting}>
                {resetting ? "Menyimpan..." : "Simpan kata sandi"}
              </Button>
              <Button variant="outline" onClick={() => setResetOpen(false)}>
                Batal
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}

      {activeOpen ? (
        <Dialog
          title={user.is_active ? "Nonaktifkan akun?" : "Aktifkan akun?"}
          onClose={() => setActiveOpen(false)}
        >
          <p className="text-sm text-slate-500">
            {user.is_active
              ? `${name} tidak akan bisa masuk ke aplikasi. Riwayat transaksi tetap tersimpan.`
              : `${name} akan bisa masuk kembali ke aplikasi.`}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Button onClick={onToggleActive} disabled={toggling}>
              {toggling ? "Memproses..." : user.is_active ? "Ya, nonaktifkan" : "Ya, aktifkan"}
            </Button>
            <Button variant="outline" onClick={() => setActiveOpen(false)}>
              Batal
            </Button>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
