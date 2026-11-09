"use client";

import { useActionState } from "react";
import { CopyLink } from "@/ui/copy-link";
import { FormError, quietButtonClass } from "@/ui/form-parts";
import { createResetLinkAction } from "./actions";

export function ResetLinkForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(createResetLinkAction, {});

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="userId" value={userId} />
      <div>
        <button type="submit" disabled={pending} className={quietButtonClass}>
          {pending ? "Creating…" : "Create password reset link"}
        </button>
      </div>
      <FormError message={state.error} />
      {state.link && (
        <CopyLink
          link={state.link}
          hint="Send this link yourself. It works once, lasts 24 hours and is not shown again."
        />
      )}
    </form>
  );
}
