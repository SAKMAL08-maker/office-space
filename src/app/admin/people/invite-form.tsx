"use client";

import { useActionState } from "react";
import { CopyLink } from "@/ui/copy-link";
import { buttonClass, Field, FormError, inputClass } from "@/ui/form-parts";
import { createInviteAction } from "./actions";

export function InviteForm() {
  const [state, action, pending] = useActionState(createInviteAction, {});

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Field label="Email">
          <input name="email" type="email" required autoComplete="off" className={inputClass} />
        </Field>
        <Field label="Role">
          <select name="role" defaultValue="member" className={inputClass}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
      </div>
      <FormError message={state.error} />
      <div>
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Creating…" : "Create invite link"}
        </button>
      </div>
      {state.link && (
        <CopyLink
          link={state.link}
          hint="Send this link yourself. It works once, lasts 7 days and is not shown again."
        />
      )}
    </form>
  );
}
