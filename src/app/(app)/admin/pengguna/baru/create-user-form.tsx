"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { RoleSelect, type RoleValue } from "@/components/ui/role-select";
import { useToast } from "@/components/ui/toast";

import { createUser } from "../actions";

export function CreateUserForm() {
  const router = useRouter();
  const { show } = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<RoleValue>("cashier");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const next: Record<string, string> = {};
    if (!fullName.trim()) next.fullName = "Nama wajib diisi";
    if (!email.includes("@")) next.email = "Email tidak valid";
    if (password.length < 6) next.password = "Kata sandi minimal 6 karakter";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    const res = await createUser({ email, password, fullName, phone, role });
    setSubmitting(false);

    if (!res.success) {
      setErrors({ form: res.error });
      return;
    }

    show(`Pengguna ${fullName.trim()} ditambahkan`);
    router.push("/admin/pengguna");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4">
        <Field label="Nama lengkap" htmlFor="fullName" error={errors.fullName}>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nama petugas"
            className={inputClass}
          />
        </Field>

        <Field
          label="Email"
          htmlFor="email"
          helper="Dipakai untuk masuk ke aplikasi."
          error={errors.email}
        >
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@laundry.local"
            className={inputClass}
          />
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

        <Field label="Kata sandi" htmlFor="password" error={errors.password}>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

        <Field label="Role" htmlFor="role">
          <RoleSelect value={role} onChange={setRole} />
        </Field>
      </div>

      {errors.form ? <p className="text-sm text-red-600">{errors.form}</p> : null}

      <Button type="submit" size="lg" fullWidth disabled={submitting}>
        {submitting ? "Menyimpan..." : "Simpan pengguna"}
      </Button>
    </form>
  );
}
