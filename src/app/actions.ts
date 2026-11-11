"use server";

import { revalidatePath } from "next/cache";
import { checkIn, checkOut } from "@/server/attendance";
import { requireCheckedIn, requireUser } from "@/server/session";
import { startWork, stopWork } from "@/server/work";
import { refreshWorkPages } from "@/server/work-pages";
import { type FormState, textField } from "@/ui/form-state";

function refreshAttendancePages() {
  refreshWorkPages();
  revalidatePath("/time-log");
  revalidatePath("/admin/time-log");
}

/** The machine always tries to check in. A refusal means the person never checked out. */
export async function pressMachineAction(): Promise<{ stillCheckedIn: boolean }> {
  const user = await requireUser();
  const result = await checkIn(user.id);
  // Refreshed either way, so a tab that was out of date stops offering Log out.
  refreshAttendancePages();
  return { stillCheckedIn: !result.ok };
}

export async function checkOutAction(): Promise<void> {
  const user = await requireCheckedIn();
  await checkOut(user.id);
  refreshAttendancePages();
}

// Server actions can be called directly, so each one checks the gate itself.
// startWork also checks ownership and check-in again inside its transaction.

export async function startWorkAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireCheckedIn();
  const result = await startWork(user.id, textField(formData, "id"));
  refreshAttendancePages();
  return result.ok ? {} : { error: result.error };
}

export async function stopWorkAction(): Promise<FormState> {
  const user = await requireCheckedIn();
  const result = await stopWork(user.id);
  refreshAttendancePages();
  return result.ok ? {} : { error: result.error };
}
