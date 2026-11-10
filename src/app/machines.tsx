"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { buttonClass, FormError, quietButtonClass } from "@/ui/form-parts";
import { checkOutAction, pressMachineAction } from "./actions";

const FAILED = "That did not work. Check your connection and try again.";
const NOT_CHECKED_IN = "You are not checked in. Use the check-in machine first.";

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

/**
 * What the two machines do, shared by the 3D scene and the plain buttons.
 * The check-in machine stays usable while checked in, because that is when it asks the question.
 */
export function useMachines(checkedIn: boolean) {
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

  const checkOut = () => {
    // The 3D machine can be walked to at any time, so it explains rather than doing nothing.
    if (!checkedIn) {
      setError(NOT_CHECKED_IN);
      return;
    }
    run(async () => {
      await checkOutAction();
      setAsking(false);
    });
  };

  const messages = (
    <>
      <FormError message={error} />
      {asking && (
        <StillCheckedInPrompt pending={pending} onYes={checkOut} onNo={() => setAsking(false)} />
      )}
    </>
  );
  return { checkIn, checkOut, pending, messages };
}

/** Plain buttons for the machines, for browsers that cannot show the 3D office. */
export function Machines({ checkedIn }: { checkedIn: boolean }) {
  const { checkIn, checkOut, pending, messages } = useMachines(checkedIn);
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
      {messages}
    </>
  );
}
