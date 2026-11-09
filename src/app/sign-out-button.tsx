"use client";

import { useState } from "react";
import { authClient } from "@/ui/auth-client";
import { quietButtonClass } from "@/ui/form-parts";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await authClient.signOut();
    // A full page load, so nothing from this login stays in the browser's page memory.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  }

  return (
    <button type="button" onClick={signOut} disabled={pending} className={quietButtonClass}>
      Log out
    </button>
  );
}
