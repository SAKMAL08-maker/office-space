import Link from "next/link";
import { Suspense } from "react";
import { getOpenAttendance } from "@/server/attendance";
import { requireUser } from "@/server/session";
import { countInbox } from "@/server/tasks";
import { Loading, quietButtonClass } from "@/ui/form-parts";
import { LocalTime } from "@/ui/local-time";
import { Machines } from "./machines";
import { SignOutButton } from "./sign-out-button";

async function Welcome() {
  const user = await requireUser();
  const open = await getOpenAttendance(user.id);
  return (
    <>
      <p className="text-zinc-600 dark:text-zinc-400">
        Hello, {user.name}.{" "}
        {open ? (
          <>
            You checked in on <LocalTime value={open.checkedInAt} />.
          </>
        ) : (
          "You are checked out."
        )}
      </p>
      <Machines checkedIn={open !== null} />
      <div className="flex flex-wrap justify-center gap-2">
        {open && (
          <>
            <Link href="/projects" className={quietButtonClass}>
              My projects
            </Link>
            <Link href="/inbox" className={quietButtonClass}>
              Inbox ({await countInbox(user.id)})
            </Link>
            <Link href="/sent" className={quietButtonClass}>
              Sent tasks
            </Link>
          </>
        )}
        <Link href="/time-log" className={quietButtonClass}>
          My time log
        </Link>
        {user.role === "admin" && (
          <>
            <Link href="/admin/time-log" className={quietButtonClass}>
              Everyone&apos;s time log
            </Link>
            <Link href="/admin/people" className={quietButtonClass}>
              People
            </Link>
          </>
        )}
        {!open && <SignOutButton />}
      </div>
    </>
  );
}

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Office Space</h1>
      <Suspense fallback={<Loading />}>
        <Welcome />
      </Suspense>
    </main>
  );
}
