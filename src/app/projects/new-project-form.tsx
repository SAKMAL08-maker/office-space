"use client";

import { useActionState } from "react";
import { buttonClass, FormError } from "@/ui/form-parts";
import { WorkFields } from "@/ui/work-fields";
import { createProjectAction } from "./actions";

export function NewProjectForm() {
  const [state, action, pending] = useActionState(createProjectAction, {});

  return (
    <form action={action} className="flex flex-col gap-3">
      <WorkFields title={state.title} description={state.description} />
      <FormError message={state.error} />
      <div>
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Creating…" : "Create project"}
        </button>
      </div>
    </form>
  );
}
