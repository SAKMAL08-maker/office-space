import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/server/session";
import { Loading, quietButtonClass } from "@/ui/form-parts";
import { SignOutButton } from "./sign-out-button";

async function Welcome() {
  const user = await requireUser();
  return (
    <>
      <p className="text-zinc-600 dark:text-zinc-400">
        Hello, {user.name}. The building is under construction.
      </p>
      <div className="flex gap-2">
        {user.role === "admin" && (
          <Link href="/admin/people" className={quietButtonClass}>
            People
          </Link>
        )}
        <SignOutButton />
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
