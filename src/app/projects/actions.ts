"use server";

import { createProject, finishProject, reopenProject, updateProject } from "@/server/projects";
import { requireCheckedIn } from "@/server/session";
import { refreshWorkPages } from "@/server/work-pages";
import { type FormState, textField, type WorkFormState } from "@/ui/form-state";

// Server actions can be called directly, so each one checks the gate itself.

export async function createProjectAction(
  _previous: WorkFormState,
  formData: FormData,
): Promise<WorkFormState> {
  const user = await requireCheckedIn();
  const details = {
    title: textField(formData, "title"),
    description: textField(formData, "description"),
  };
  const result = await createProject(user.id, details);
  if (!result.ok) return { error: result.error, ...details };
  refreshWorkPages();
  return {};
}

export async function updateProjectAction(
  _previous: WorkFormState,
  formData: FormData,
): Promise<WorkFormState> {
  const user = await requireCheckedIn();
  const details = {
    title: textField(formData, "title"),
    description: textField(formData, "description"),
  };
  const result = await updateProject(user.id, textField(formData, "id"), details);
  if (!result.ok) return { error: result.error, ...details };
  refreshWorkPages();
  return {};
}

export async function finishProjectAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireCheckedIn();
  const result = await finishProject(user.id, textField(formData, "id"));
  refreshWorkPages();
  return result.ok ? {} : { error: result.error };
}

export async function reopenProjectAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireCheckedIn();
  const result = await reopenProject(user.id, textField(formData, "id"));
  refreshWorkPages();
  return result.ok ? {} : { error: result.error };
}
