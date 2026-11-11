import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import { StillHere } from "@/app/presence";
import { Loading, mutedTextClass, quietButtonClass } from "./form-parts";

/**
 * The frame of the office pages (projects, inbox, sent), which all sit behind the check-in gate.
 * While one is open, it keeps telling presence the person is still here.
 */
export function WorkPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 p-4 sm:p-6">
      <StillHere />
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <Link href="/" className={quietButtonClass}>
          Back
        </Link>
      </div>
      <Suspense fallback={<Loading />}>{children}</Suspense>
    </main>
  );
}

/** A title and description as the person typed them, however long or oddly spaced. */
export function WorkDetails({ title, description }: { title: string; description: string }) {
  return (
    <div className="min-w-0">
      <p className="font-medium wrap-anywhere">{title}</p>
      {description && (
        <p className={`${mutedTextClass} wrap-anywhere whitespace-pre-wrap`}>{description}</p>
      )}
    </div>
  );
}
