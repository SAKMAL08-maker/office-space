import Link from "next/link";
import { Suspense } from "react";
import { listTimeLog } from "@/server/attendance";
import { requireUser } from "@/server/session";
import { listWorkLog } from "@/server/work";
import { Loading, quietButtonClass } from "@/ui/form-parts";
import { TimeLogList } from "@/ui/time-log-list";
import { WorkLogList } from "@/ui/work-log-list";

async function MyTimeLog() {
  const user = await requireUser();
  const [attendance, work] = await Promise.all([listTimeLog(user.id), listWorkLog(user.id)]);
  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Check-ins</h2>
        <TimeLogList entries={attendance} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Work periods</h2>
        <WorkLogList entries={work} />
      </section>
    </>
  );
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
