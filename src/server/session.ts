import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getOpenAttendance } from "./attendance";
import { getAuth } from "./auth";
import { isRole, type Role } from "./validation";

export type CurrentUser = { id: string; name: string; email: string; role: Role };

/** Reads the login from the request. Always checks the database, so a removed session stops working. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  // Reading the request first keeps this out of the build, where the auth secret may not exist.
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const { id, name, email, role } = session.user;
  return { id, name, email, role: isRole(role) ? role : "member" };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Non-admins get a plain "not found", so the admin area does not advertise itself. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  return user;
}

/** The check-in gate. Anyone not checked in is sent back to the lobby, where the machine is. */
export async function requireCheckedIn(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!(await getOpenAttendance(user.id))) redirect("/");
  return user;
}
