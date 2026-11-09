"use client";

import { useActionState } from "react";
import { buttonClass, Field, FormError, inputClass } from "@/ui/form-parts";
import { NewPasswordField } from "@/ui/password-fields";
import { acceptInviteAction } from "./actions";

export function InviteForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(acceptInviteAction, {});

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <Field label="Email">
        <input value={email} readOnly autoComplete="username" className={inputClass} />
      </Field>
      <Field label="Your name">
        <input name="name" required autoComplete="name" className={inputClass} />
      </Field>
      <NewPasswordField label="Choose a password" />
      <FormError message={state.error} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Creating…" : "Create my account"}
      </button>
    </form>
  );
}
