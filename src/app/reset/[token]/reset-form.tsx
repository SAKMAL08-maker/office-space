"use client";

import { useActionState } from "react";
import { buttonClass, Field, FormError, inputClass } from "@/ui/form-parts";
import { NewPasswordField } from "@/ui/password-fields";
import { resetPasswordAction } from "./actions";

export function ResetForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, {});

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <Field label="Email">
        <input value={email} readOnly autoComplete="username" className={inputClass} />
      </Field>
      <NewPasswordField label="New password" />
      <FormError message={state.error} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
