import Link from "next/link";
import { Suspense } from "react";
import { getOpenAttendance } from "@/server/attendance";
import { getFloor } from "@/server/floor";
import { currentPictureId } from "@/server/pictures";
import { requireUser } from "@/server/session";
import { countInbox } from "@/server/tasks";
import { Avatar } from "@/ui/avatar";
import { Loading, quietButtonClass } from "@/ui/form-parts";
import { LocalTime } from "@/ui/local-time";
import { Office } from "./office";
import { SignOutButton } from "./sign-out-button";

async function Welcome() {
  const user = await requireUser();
  const [open, pictureId] = await Promise.all([
    getOpenAttendance(user.id),
    currentPictureId(user.id),
  ]);
  // getFloor checks the gate again itself, so the floor is only ever sent to people checked in.
  const floor = open ? await getFloor() : null;

  const greeting = (
    <div className="flex items-center gap-2">
      <Avatar userId={user.id} name={user.name} pictureId={pictureId} size="md" />
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
    </div>
  );

  const menu = (
    <>
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
      <Link href="/profile" className={quietButtonClass}>
        My profile
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
    </>
  );

  return (
    <Office
      viewerId={user.id}
      checkedIn={open !== null}
      floor={floor}
      greeting={greeting}
      menu={menu}
    />
  );
}

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center p-6">
            <Loading />
          </div>
        }
      >
        <Welcome />
      </Suspense>
    </main>
  );
}
