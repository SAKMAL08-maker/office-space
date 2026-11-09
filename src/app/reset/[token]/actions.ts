"use server";

import { redirect } from "next/navigation";
import { redeemPasswordResetLink } from "@/server/password-resets";
import { textField, type FormState } from "@/ui/form-state";

export async function resetPasswordAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await redeemPasswordResetLink({
    token: textField(formData, "token"),
    password: textField(formData, "password"),
  });
  if (!result.ok) return { error: result.error };
  redirect("/login");
}
