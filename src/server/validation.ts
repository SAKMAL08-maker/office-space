export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;
export const MAX_TITLE_LENGTH = 120;
export const MAX_DESCRIPTION_LENGTH = 2000;
export const MAX_REJECT_REASON_LENGTH = 500;

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

/** Returns what is wrong with a project's or task's details, or null when they are fine. */
export function workDetailsProblem(title: string, description: string): string | null {
  if (title.length === 0) return "Enter a title.";
  if (title.length > MAX_TITLE_LENGTH) {
    return `Use at most ${MAX_TITLE_LENGTH} characters for the title.`;
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return `Use at most ${MAX_DESCRIPTION_LENGTH} characters for the description.`;
  }
  return null;
}

export function isRole(value: unknown): value is Role {
  return value === "admin" || value === "member";
}
