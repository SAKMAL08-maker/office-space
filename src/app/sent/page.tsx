import { requireCheckedIn } from "@/server/session";
import { listSent } from "@/server/tasks";
import { listOtherPeople } from "@/server/users";
import { ActionButton } from "@/ui/action-button";
import { cardClass, mutedTextClass } from "@/ui/form-parts";
import { LocalTime } from "@/ui/local-time";
import { WorkDetails, WorkPage } from "@/ui/work-page";
import { cancelTaskAction } from "./actions";
import { SendTaskForm } from "./send-task-form";

const STATUS_LABEL = {
  pending: "Waiting for an answer",
  accepted: "Accepted",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

async function SentContent() {
  const user = await requireCheckedIn();
  const [sent, people] = await Promise.all([listSent(user.id), listOtherPeople(user.id)]);

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Send a task</h2>
        {people.length > 0 ? (
          <SendTaskForm people={people} />
        ) : (
          <p className={mutedTextClass}>There is nobody else to send a task to yet.</p>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Sent ({sent.length})</h2>
        <ul className="flex flex-col gap-2">
          {sent.map((task) => (
            <li key={task.id} className={cardClass}>
              <WorkDetails title={task.title} description={task.description} />
              <p className={mutedTextClass}>
                To {task.sentTo} on <LocalTime value={task.createdAt} />
              </p>
              <p className="text-sm font-medium wrap-anywhere">
                {STATUS_LABEL[task.status]}
                {task.rejectReason && `: ${task.rejectReason}`}
              </p>
              {task.status === "pending" && (
                <div>
                  <ActionButton action={cancelTaskAction} id={task.id} label="Cancel task" />
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export default function SentPage() {
  return (
    <WorkPage title="Sent tasks">
      <SentContent />
    </WorkPage>
  );
}
