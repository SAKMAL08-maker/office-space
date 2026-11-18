"use server";

import { redirect } from "next/navigation";
import { createFirstAdmin } from "@/server/setup";
import { takeFormTry } from "@/server/rate-limit";
import { textField, tooManyTries, type FormState } from "@/ui/form-state";

export async function setupAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const limit = await takeFormTry("/setup");
  if (!limit.ok) return { error: tooManyTries(limit.retryAfter) };

  const result = await createFirstAdmin({
    token: textField(formData, "token"),
    name: textField(formData, "name"),
    email: textField(formData, "email"),
    password: textField(formData, "password"),
  });
  if (!result.ok) return { error: result.error };
  redirect("/login");
}
