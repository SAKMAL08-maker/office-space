"use client";

import { useActionState, useState } from "react";
import { buttonClass, Field, FormError, inputClass, quietButtonClass } from "@/ui/form-parts";
import { MAX_REJECT_REASON_LENGTH } from "@/server/validation";
import { rejectTaskAction } from "./actions";

/** Asks for an optional reason first, so one stray click cannot reject a task. */
export function RejectForm({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(rejectTaskAction, {});

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={quietButtonClass}>
        Reject
      </button>
    );
  }
  return (
    <form action={action} className="flex w-full flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <Field label="Reason (optional)">
        <input
          name="reason"
          maxLength={MAX_REJECT_REASON_LENGTH}
          autoComplete="off"
          className={inputClass}
        />
      </Field>
      <FormError message={state.error} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Rejecting…" : "Reject task"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
          className={quietButtonClass}
        >
          Keep it
        </button>
      </div>
    </form>
  );
}
