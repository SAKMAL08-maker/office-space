import { asc } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { listPendingInvites } from "@/server/invites";
import { requireAdmin } from "@/server/session";
import { Loading, quietButtonClass } from "@/ui/form-parts";
import { revokeInviteAction } from "./actions";
import { InviteForm } from "./invite-form";
import { ResetLinkForm } from "./reset-link-form";

async function PeopleContent() {
  await requireAdmin();
  const [people, pending] = await Promise.all([
    getDb()
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .orderBy(asc(users.name)),
    listPendingInvites(),
  ]);

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Invite someone</h2>
        <InviteForm />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Waiting to join ({pending.length})</h2>
        <ul className="flex flex-col gap-2">
          {pending.map((invite) => (
            <li
              key={invite.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="min-w-0">
                <p className="break-all">{invite.email}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {invite.role}, expires {invite.expiresAt.toISOString().slice(0, 10)}
                </p>
              </div>
              <form action={revokeInviteAction}>
                <input type="hidden" name="id" value={invite.id} />
                <button type="submit" className={quietButtonClass}>
                  Cancel invite
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">People ({people.length})</h2>
        <ul className="flex flex-col gap-2">
          {people.map((person) => (
            <li
              key={person.id}
              className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="min-w-0">
                <p className="font-medium">{person.name}</p>
                <p className="text-sm break-all text-zinc-600 dark:text-zinc-400">
                  {person.email}, {person.role}
                </p>
              </div>
              <ResetLinkForm userId={person.id} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export default function PeoplePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">People</h1>
        <Link href="/" className={quietButtonClass}>
          Back
        </Link>
      </div>
      <Suspense fallback={<Loading />}>
        <PeopleContent />
      </Suspense>
    </main>
  );
}
