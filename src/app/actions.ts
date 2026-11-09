"use server";

import { revalidatePath } from "next/cache";
import { checkIn, checkOut } from "@/server/attendance";
import { requireCheckedIn, requireUser } from "@/server/session";

function refreshAttendancePages() {
  revalidatePath("/");
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
