"use server";

import { redirect } from "next/navigation";
import { acceptInvite } from "@/server/invites";
import { takeFormTry } from "@/server/rate-limit";
import { textField, tooManyTries, type FormState } from "@/ui/form-state";

export async function acceptInviteAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const limit = await takeFormTry("/invite");
  if (!limit.ok) return { error: tooManyTries(limit.retryAfter) };

  const result = await acceptInvite({
    token: textField(formData, "token"),
    name: textField(formData, "name"),
    password: textField(formData, "password"),
  });
  if (!result.ok) return { error: result.error };
  redirect("/login");
}
