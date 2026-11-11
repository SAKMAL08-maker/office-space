"use server";

import { revalidatePath } from "next/cache";
import { finishUpload, removeAttachment, startUpload } from "@/server/attachments";
import { requireCheckedIn } from "@/server/session";
import { UPLOAD_HEADERS } from "@/server/storage";
import { type FormState, textField } from "@/ui/form-state";

// Server actions can be called directly, so each one checks the gate itself.

export type StartedUpload =
  { error: string } | { id: string; url: string; headers: Record<string, string> };

function refreshFilePages() {
  revalidatePath("/projects");
  revalidatePath("/sent");
}

export async function startUploadAction(
  projectId: string,
  fileName: string,
  size: number,
): Promise<StartedUpload> {
  const user = await requireCheckedIn();
  const result = await startUpload(user.id, String(projectId), {
    fileName: String(fileName),
    size: Number(size),
  });
  if (!result.ok) return { error: result.error };
  return { id: result.id, url: result.url, headers: { ...UPLOAD_HEADERS } };
}

/** Called after the browser's upload, whether or not it worked, so the server can check or tidy up. */
export async function finishUploadAction(attachmentId: string): Promise<FormState> {
  const user = await requireCheckedIn();
  const result = await finishUpload(user.id, String(attachmentId));
  refreshFilePages();
  return result.ok ? {} : { error: result.error };
}

export async function removeAttachmentAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireCheckedIn();
  const result = await removeAttachment(user.id, textField(formData, "id"));
  refreshFilePages();
  return result.ok ? {} : { error: result.error };
}
