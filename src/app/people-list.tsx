import { mutedTextClass } from "@/ui/form-parts";
import type { LivePerson } from "@/world/people";

function status({ away, workingOn }: LivePerson): string {
  if (workingOn) return `${away ? "Away · " : ""}Working on ${workingOn.title}`;
  return away ? "Away" : "Here";
}

/**
 * Who is checked in and what they are doing, as plain text. It works without 3D, with a keyboard
 * and on small screens, and updates with presence every few seconds.
 */
export function PeopleList({
  people,
  viewerId,
}: {
  people: LivePerson[] | null;
  viewerId: string;
}) {
  if (people === null) return <p className={mutedTextClass}>Finding out who is in…</p>;
  return (
    <section aria-labelledby="people-heading" className="flex flex-col gap-1 text-left">
      <h2 id="people-heading" className="text-sm font-semibold">
        Who&apos;s in ({people.length})
      </h2>
      <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto text-sm">
        {people.map((person) => (
          <li key={person.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="font-medium break-words">
              {person.name}
              {person.id === viewerId && " (you)"}
            </span>
            <span
              className={
                person.away
                  ? mutedTextClass
                  : person.workingOn
                    ? "text-sm break-words text-amber-700 dark:text-amber-400"
                    : "text-sm text-emerald-700 dark:text-emerald-400"
              }
            >
              {status(person)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
