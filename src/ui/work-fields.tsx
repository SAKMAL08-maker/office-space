import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from "@/server/validation";
import { Field, inputClass } from "./form-parts";

/** The details every task and project has. */
export function WorkFields({
  title = "",
  description = "",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <>
      <Field label="Title">
        <input
          name="title"
          required
          maxLength={MAX_TITLE_LENGTH}
          defaultValue={title}
          autoComplete="off"
          className={inputClass}
        />
      </Field>
      <Field label="Description (optional)">
        <textarea
          name="description"
          rows={3}
          maxLength={MAX_DESCRIPTION_LENGTH}
          defaultValue={description}
          className={inputClass}
        />
      </Field>
    </>
  );
}
