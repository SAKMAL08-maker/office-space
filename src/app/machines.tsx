"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { buttonClass, FormError, quietButtonClass } from "@/ui/form-parts";
import { checkOutAction, pressMachineAction } from "./actions";

const FAILED = "That did not work. Check your connection and try again.";

function StillCheckedInPrompt({
  pending,
  onYes,
  onNo,
}: {
  pending: boolean;
  onYes: () => void;
  onNo: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="still-checked-in"
      onCancel={onNo}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-zinc-200 bg-white p-6 text-zinc-900 backdrop:bg-black/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
    >
      <p id="still-checked-in" className="mb-4">
        You are still not checked out, would you like to?
      </p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onNo} disabled={pending} className={quietButtonClass}>
          No
        </button>
        <button type="button" onClick={onYes} disabled={pending} className={buttonClass}>
          Yes
        </button>
      </div>
    </dialog>
  );
}

/** The check-in machine stays usable while checked in, because that is when it asks the question. */
export function Machines({ checkedIn }: { checkedIn: boolean }) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function run(work: () => Promise<void>) {
    setError(undefined);
    startTransition(async () => {
      try {
        await work();
      } catch {
        setAsking(false);
        setError(FAILED);
      }
    });
  }

  const checkIn = () =>
    run(async () => {
      const { stillCheckedIn } = await pressMachineAction();
      setAsking(stillCheckedIn);
    });

  const checkOut = () =>
    run(async () => {
      await checkOutAction();
      setAsking(false);
    });

  return (
    <>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={checkIn} disabled={pending} className={buttonClass}>
          Use check-in machine
        </button>
        <button
          type="button"
          onClick={checkOut}
          disabled={pending || !checkedIn}
          className={buttonClass}
        >
          Use check-out machine
        </button>
      </div>
      <FormError message={error} />
      {asking && (
        <StillCheckedInPrompt pending={pending} onYes={checkOut} onNo={() => setAsking(false)} />
      )}
    </>
  );
}
