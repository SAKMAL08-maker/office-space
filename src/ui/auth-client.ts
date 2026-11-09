import { createAuthClient } from "better-auth/react";

/** Browser side of login. It talks to /api/auth on the same site. */
export const authClient = createAuthClient();
