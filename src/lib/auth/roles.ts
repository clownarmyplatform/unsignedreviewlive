export type AccountRole = "user" | "admin";

export type HostAccount = {
  email: string;
  label: string;
};

export const hostAccounts: HostAccount[] = [
  {
    email: "mrmatthewking89@gmail.com",
    label: "Unsigned Review Host",
  },
  {
    email: "clownarmyhost@gmail.com",
    label: "Clown Army Host",
  },
  {
    email: "clownarmyplatform@gmail.com",
    label: "Clown Army Platform",
  },
];

export function normalizeAccountEmail(email: string | undefined | null) {
  return email?.toLowerCase().trim() ?? null;
}

export function resolveAccountRole(email: string | undefined | null): AccountRole | null {
  const normalizedEmail = normalizeAccountEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  return hostAccounts.some((account) => account.email === normalizedEmail)
    ? "admin"
    : "user";
}

export function resolveHostAccount(email: string | undefined | null) {
  const normalizedEmail = normalizeAccountEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  return hostAccounts.find((account) => account.email === normalizedEmail) ?? null;
}
