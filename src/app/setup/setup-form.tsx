"use client";

import { useActionState } from "react";
import { buttonClass, Field, FormError, inputClass } from "@/ui/form-parts";
import { NewPasswordField } from "@/ui/password-fields";
import { setupAction } from "./actions";

export function SetupForm() {
  const [state, action, pending] = useActionState(setupAction, {});

  return (
    <form action={action} className="flex flex-col gap-3">
      <Field label="Setup token">
        <input name="token" type="password" required autoComplete="off" className={inputClass} />
      </Field>
      <Field label="Your name">
        <input name="name" required autoComplete="name" className={inputClass} />
      </Field>
      <Field label="Email">
        <input name="email" type="email" required autoComplete="email" className={inputClass} />
      </Field>
      <NewPasswordField />
      <FormError message={state.error} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Creating…" : "Create admin"}
      </button>
    </form>
  );
}
