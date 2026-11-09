"use client";

import { useActionState, useState } from "react";
import { buttonClass, FormError, quietButtonClass } from "@/ui/form-parts";
import type { WorkFormState } from "@/ui/form-state";
import { WorkFields } from "@/ui/work-fields";
import { updateProjectAction } from "./actions";

function EditFields({
  id,
  title,
  description,
  onClose,
}: {
  id: string;
  title: string;
  description: string;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(
    async (previous: WorkFormState, formData: FormData) => {
      const next = await updateProjectAction(previous, formData);
      if (!next.error) onClose();
      return next;
    },
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <WorkFields title={state.title ?? title} description={state.description ?? description} />
      <FormError message={state.error} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onClose} disabled={pending} className={quietButtonClass}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function EditProjectForm(project: { id: string; title: string; description: string }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className={quietButtonClass}>
        Edit
      </button>
    );
  }
  return (
    <div className="w-full">
      <EditFields {...project} onClose={() => setEditing(false)} />
    </div>
  );
}
