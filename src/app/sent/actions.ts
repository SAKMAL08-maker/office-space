"use server";

import { requireCheckedIn } from "@/server/session";
import { cancelTask, sendTask } from "@/server/tasks";
import { refreshWorkPages } from "@/server/work-pages";
import { type FormState, textField, type WorkFormState } from "@/ui/form-state";

// Server actions can be called directly, so each one checks the gate itself.

export async function sendTaskAction(
  _previous: WorkFormState,
  formData: FormData,
): Promise<WorkFormState> {
  const user = await requireCheckedIn();
  const details = {
    receiverId: textField(formData, "receiverId"),
    title: textField(formData, "title"),
    description: textField(formData, "description"),
  };
  const result = await sendTask(user.id, details);
  if (!result.ok) return { error: result.error, ...details };
  refreshWorkPages();
  return {};
}

export async function cancelTaskAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireCheckedIn();
  const result = await cancelTask(user.id, textField(formData, "id"));
  refreshWorkPages();
  return result.ok ? {} : { error: result.error };
}
