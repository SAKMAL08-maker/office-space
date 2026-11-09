import Link from "next/link";
import { Suspense } from "react";
import { listTimeLog } from "@/server/attendance";
import { requireUser } from "@/server/session";
import { Loading, quietButtonClass } from "@/ui/form-parts";
import { TimeLogList } from "@/ui/time-log-list";

async function MyTimeLog() {
  const user = await requireUser();
  return <TimeLogList entries={await listTimeLog(user.id)} />;
}

export default function TimeLogPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">My time log</h1>
        <Link href="/" className={quietButtonClass}>
          Back
        </Link>
      </div>
      <Suspense fallback={<Loading />}>
        <MyTimeLog />
      </Suspense>
    </main>
  );
}
