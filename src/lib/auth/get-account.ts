import { getSessionProfile } from "./session";
import type { UserRole } from "./roles";

export type AccountInfo = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export async function getAccount(): Promise<AccountInfo | null> {
  const profile = await getSessionProfile();

  if (!profile) return null;

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
  };
}
