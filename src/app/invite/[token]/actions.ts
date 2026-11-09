"use server";

import { redirect } from "next/navigation";
import { acceptInvite } from "@/server/invites";
import { textField, type FormState } from "@/ui/form-state";

export async function acceptInviteAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await acceptInvite({
    token: textField(formData, "token"),
    name: textField(formData, "name"),
    password: textField(formData, "password"),
  });
  if (!result.ok) return { error: result.error };
  redirect("/login");
}
