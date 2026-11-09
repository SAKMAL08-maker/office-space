"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "@/ui/auth-client";
import { buttonClass, Field, FormError, inputClass } from "@/ui/form-parts";

export function LoginForm() {
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(undefined);

    const result = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });

    if (result.error) {
      setPending(false);
      setError(
        result.error.status === 429
          ? "Too many tries. Wait a minute and try again."
          : "That email or password is not right.",
      );
      return;
    }
    // A full page load, so the typed password does not stay in a hidden copy of this form.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/");
  }

  return (
    // method="post" keeps the password out of the address bar if submitted before scripts load.
    <form method="post" onSubmit={submit} className="flex flex-col gap-3">
      <Field label="Email">
        <input name="email" type="email" required autoComplete="email" className={inputClass} />
      </Field>
      <Field label="Password">
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </Field>
      <FormError message={error} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
