import { requireCheckedIn } from "@/server/session";
import { listInbox } from "@/server/tasks";
import { ActionButton } from "@/ui/action-button";
import { cardClass, mutedTextClass } from "@/ui/form-parts";
import { LocalTime } from "@/ui/local-time";
import { WorkDetails, WorkPage } from "@/ui/work-page";
import { acceptTaskAction } from "./actions";
import { RejectForm } from "./reject-form";

async function InboxContent() {
  const user = await requireCheckedIn();
  const waiting = await listInbox(user.id);

  if (waiting.length === 0) return <p className={mutedTextClass}>No tasks are waiting for you.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {waiting.map((task) => (
        <li key={task.id} className={cardClass}>
          <WorkDetails title={task.title} description={task.description} />
          <p className={mutedTextClass}>
            From {task.sentBy} on <LocalTime value={task.createdAt} />
          </p>
          <div className="flex flex-wrap items-start gap-2">
            <ActionButton action={acceptTaskAction} id={task.id} label="Accept" primary />
            <RejectForm id={task.id} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function InboxPage() {
  return (
    <WorkPage title="Inbox">
      <InboxContent />
    </WorkPage>
  );
}
