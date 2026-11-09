"use server";

import { requireCheckedIn } from "@/server/session";
import { acceptTask, rejectTask } from "@/server/tasks";
import { refreshWorkPages } from "@/server/work-pages";
import { type FormState, textField } from "@/ui/form-state";

// Server actions can be called directly, so each one checks the gate itself.

export async function acceptTaskAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireCheckedIn();
  const result = await acceptTask(user.id, textField(formData, "id"));
  refreshWorkPages();
  return result.ok ? {} : { error: result.error };
}

export async function rejectTaskAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireCheckedIn();
  const result = await rejectTask(
    user.id,
    textField(formData, "id"),
    textField(formData, "reason"),
  );
  refreshWorkPages();
  return result.ok ? {} : { error: result.error };
}
