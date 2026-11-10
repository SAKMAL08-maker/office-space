/** What a form's server action hands back: nothing on success, or a message to show. */
export type FormState = { error?: string };
export type LinkFormState = FormState & { link?: string };
/** Sent back with an error, because a form empties itself after submitting. */
export type WorkFormState = FormState & {
  title?: string;
  description?: string;
  receiverId?: string;
};

/** Reads a text field from a submitted form. A missing field becomes an empty string. */
export function textField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
