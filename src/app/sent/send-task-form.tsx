"use client";

import { useActionState } from "react";
import { buttonClass, Field, FormError, inputClass } from "@/ui/form-parts";
import { WorkFields } from "@/ui/work-fields";
import { sendTaskAction } from "./actions";

export function SendTaskForm({ people }: { people: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(sendTaskAction, {});

  return (
    <form action={action} className="flex flex-col gap-3">
      <Field label="Send to">
        {/* A dropdown ignores a changed default, so the key rebuilds it to keep the choice. */}
        <select
          key={state.receiverId ?? ""}
          name="receiverId"
          required
          defaultValue={state.receiverId ?? ""}
          className={inputClass}
        >
          <option value="" disabled>
            Choose a person
          </option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </Field>
      <WorkFields title={state.title} description={state.description} />
      <FormError message={state.error} />
      <div>
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Sending…" : "Send task"}
        </button>
      </div>
    </form>
  );
}
