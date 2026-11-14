"use server";

import { revalidatePath } from "next/cache";
import { finishPictureUpload, removePicture, startPictureUpload } from "@/server/pictures";
import { requireUser } from "@/server/session";
import { UPLOAD_HEADERS } from "@/server/storage";
import type { FormState } from "@/ui/form-state";

// Server actions can be called directly, so each one checks the login itself. A picture belongs
// to the account, so being logged in is enough; checking in is not needed.

export type StartedPicture =
  { error: string } | { id: string; url: string; headers: Record<string, string> };

function refreshPicturePages() {
  revalidatePath("/profile");
  revalidatePath("/");
  revalidatePath("/admin/people");
}

export async function startPictureAction(size: number): Promise<StartedPicture> {
  const user = await requireUser();
  const result = await startPictureUpload(user.id, Number(size));
  if (!result.ok) return { error: result.error };
  return { id: result.id, url: result.url, headers: { ...UPLOAD_HEADERS } };
}

/** Called after the browser's upload, whether or not it worked, so the server can check or tidy up. */
export async function finishPictureAction(pictureId: string): Promise<FormState> {
  const user = await requireUser();
  const result = await finishPictureUpload(user.id, String(pictureId));
  refreshPicturePages();
  return result.ok ? {} : { error: result.error };
}

/** Always the signed-in person's own picture, whatever the form sends. */
export async function removeMyPictureAction(): Promise<FormState> {
  const user = await requireUser();
  const result = await removePicture(user.id);
  refreshPicturePages();
  return result.ok ? {} : { error: result.error };
}
