export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

export type Role = "admin" | "member";
export type Result<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Returns what is wrong with the password, or null when it is fine. */
export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters for the password.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Use at most ${MAX_PASSWORD_LENGTH} characters for the password.`;
  }
  return null;
}

/** Returns what is wrong with the name, or null when it is fine. */
export function nameProblem(name: string): string | null {
  const length = name.trim().length;
  if (length === 0) return "Enter your name.";
  if (length > 80) return "Use at most 80 characters for the name.";
  return null;
}

export function isRole(value: unknown): value is Role {
  return value === "admin" || value === "member";
}
