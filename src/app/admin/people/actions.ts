"use server";

import { revalidatePath } from "next/cache";
import { appBaseUrl } from "@/server/auth";
import { createInvite, revokeInvite } from "@/server/invites";
import { createPasswordResetLink } from "@/server/password-resets";
import { removePicture } from "@/server/pictures";
import { requireAdmin } from "@/server/session";
import { type FormState, textField, type LinkFormState } from "@/ui/form-state";

// Server actions can be called directly, so each one checks for an admin itself.

export async function createInviteAction(
  _previous: LinkFormState,
  formData: FormData,
): Promise<LinkFormState> {
  const admin = await requireAdmin();
  const result = await createInvite({
    email: textField(formData, "email"),
    role: textField(formData, "role"),
    createdBy: admin.id,
  });
  if (!result.ok) return { error: result.error };
  revalidatePath("/admin/people");
  return { link: `${appBaseUrl()}/invite/${result.token}` };
}

export async function revokeInviteAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await revokeInvite(textField(formData, "id"));
  revalidatePath("/admin/people");
}

export async function createResetLinkAction(
  _previous: LinkFormState,
  formData: FormData,
): Promise<LinkFormState> {
  const admin = await requireAdmin();
  const result = await createPasswordResetLink({
    userId: textField(formData, "userId"),
    createdBy: admin.id,
  });
  if (!result.ok) return { error: result.error };
  return { link: `${appBaseUrl()}/reset/${result.token}` };
}

/** Takes down someone's picture, for example one not suitable for work. Their initials show instead. */
export async function removePictureAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const result = await removePicture(textField(formData, "id"));
  revalidatePath("/admin/people");
  revalidatePath("/");
  return result.ok ? {} : { error: result.error };
}
