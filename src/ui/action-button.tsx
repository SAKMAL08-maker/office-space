"use client";

import { useActionState } from "react";
import { buttonClass, FormError, quietButtonClass } from "./form-parts";
import type { FormState } from "./form-state";

/** One button that acts on one record, and shows why if the server refuses. */
export function ActionButton({
  action,
  id,
  label,
  primary = false,
}: {
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
  id: string;
  label: string;
  primary?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="id" value={id} />
      <div>
        <button
          type="submit"
          disabled={pending}
          className={primary ? buttonClass : quietButtonClass}
        >
          {label}
        </button>
      </div>
      <FormError message={state.error} />
    </form>
  );
}
