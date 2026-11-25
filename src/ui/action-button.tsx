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
  confirm,
}: {
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
  id: string;
  label: string;
  primary?: boolean;
  /** If given, the browser asks this question first and does nothing unless the answer is OK. */
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
      className="flex flex-col gap-1"
    >
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
