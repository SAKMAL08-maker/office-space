import Link from "next/link";
import { Suspense } from "react";
import { listEveryonesTimeLog } from "@/server/attendance";
import { requireAdmin } from "@/server/session";
import { Loading, quietButtonClass } from "@/ui/form-parts";
import { TimeLogList } from "@/ui/time-log-list";

async function EveryonesTimeLog() {
  await requireAdmin();
  return <TimeLogList entries={await listEveryonesTimeLog()} />;
}

export default function AdminTimeLogPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Everyone&apos;s time log</h1>
        <Link href="/" className={quietButtonClass}>
          Back
        </Link>
      </div>
      <Suspense fallback={<Loading />}>
        <EveryonesTimeLog />
      </Suspense>
    </main>
  );
}
