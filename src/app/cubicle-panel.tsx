"use client";

import { ActionButton } from "@/ui/action-button";
import { mutedTextClass, quietButtonClass } from "@/ui/form-parts";
import { LocalTime } from "@/ui/local-time";
import type { CubicleInfo } from "@/world/layout";
import { startWorkAction, stopWorkAction } from "./actions";

/**
 * A cubicle's details: its project, who sent it, and who is working there.
 * Its owner can start or stop working here; everyone else can only look.
 */
export function CubiclePanel({
  cubicle,
  ownerName,
  mine,
  onClose,
}: {
  cubicle: CubicleInfo;
  ownerName: string;
  mine: boolean;
  onClose: () => void;
}) {
  const { projectId, title, description, sentBy, workingSince } = cubicle;
  const who = mine ? "You are" : `${ownerName} is`;
  return (
    <aside
      aria-label="Cubicle details"
      className="pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-2 rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold break-words">{title}</h2>
          <p className={mutedTextClass}>
            {mine ? "Your project" : `${ownerName}'s project`}
            {sentBy && `, sent by ${sentBy}`}
          </p>
        </div>
        <button type="button" onClick={onClose} className={quietButtonClass}>
          Close
        </button>
      </div>
      {description && (
        <p className="max-h-28 overflow-y-auto text-sm break-words whitespace-pre-wrap">
          {description}
        </p>
      )}
      <p
        className={
          workingSince ? "text-sm font-medium text-amber-700 dark:text-amber-400" : mutedTextClass
        }
      >
        {workingSince ? (
          <>
            {who} working here since <LocalTime value={workingSince} />.
          </>
        ) : (
          "Nobody is working here right now."
        )}
      </p>
      {mine ? (
        // The key gives each state a fresh button, so an old error does not linger.
        workingSince ? (
          <ActionButton
            key={`stop-${projectId}`}
            action={stopWorkAction}
            id={projectId}
            label="Stop working"
          />
        ) : (
          <ActionButton
            key={`start-${projectId}`}
            action={startWorkAction}
            id={projectId}
            label="Start working here"
            primary
          />
        )
      ) : (
        <p className={mutedTextClass}>Only {ownerName} can work here.</p>
      )}
    </aside>
  );
}
