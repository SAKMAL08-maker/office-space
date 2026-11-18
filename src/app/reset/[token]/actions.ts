"use server";

import { redirect } from "next/navigation";
import { redeemPasswordResetLink } from "@/server/password-resets";
import { takeFormTry } from "@/server/rate-limit";
import { textField, tooManyTries, type FormState } from "@/ui/form-state";

export async function resetPasswordAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const limit = await takeFormTry("/reset");
  if (!limit.ok) return { error: tooManyTries(limit.retryAfter) };

  const result = await redeemPasswordResetLink({
    token: textField(formData, "token"),
    password: textField(formData, "password"),
  });
  if (!result.ok) return { error: result.error };
  redirect("/login");
}
