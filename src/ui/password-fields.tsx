import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/server/validation";
import { Field, inputClass } from "./form-parts";

/** The password box used by every form that sets a new password. */
export function NewPasswordField({ label = "Password" }: { label?: string }) {
  return (
    <Field label={`${label} (at least ${MIN_PASSWORD_LENGTH} characters)`}>
      <input
        name="password"
        type="password"
        required
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        maxLength={MAX_PASSWORD_LENGTH}
        className={inputClass}
      />
    </Field>
  );
}
