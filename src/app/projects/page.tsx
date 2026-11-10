import { listProjects } from "@/server/projects";
import { requireCheckedIn } from "@/server/session";
import { ActionButton } from "@/ui/action-button";
import { cardClass, mutedTextClass } from "@/ui/form-parts";
import { LocalTime } from "@/ui/local-time";
import { WorkDetails, WorkPage } from "@/ui/work-page";
import { finishProjectAction, reopenProjectAction } from "./actions";
import { EditProjectForm } from "./edit-project-form";
import { NewProjectForm } from "./new-project-form";

type Project = Awaited<ReturnType<typeof listProjects>>[number];

function ProjectCard({ project }: { project: Project }) {
  const { id, title, description, finishedAt, seat, sentBy } = project;
  return (
    <li className={cardClass}>
      <WorkDetails title={title} description={description} />
      <p className={mutedTextClass}>
        {finishedAt ? (
          <>
            Finished on <LocalTime value={finishedAt} />
          </>
        ) : (
          `Cubicle ${seat}`
        )}
        {sentBy && `, sent by ${sentBy}`}
      </p>
      {finishedAt ? (
        <div>
          <ActionButton action={reopenProjectAction} id={id} label="Reopen" />
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-2">
          <EditProjectForm id={id} title={title} description={description} />
          <ActionButton action={finishProjectAction} id={id} label="Finish" />
        </div>
      )}
    </li>
  );
}

function ProjectList({ heading, projects }: { heading: string; projects: Project[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">
        {heading} ({projects.length})
      </h2>
      <ul className="flex flex-col gap-2">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </ul>
    </section>
  );
}

async function ProjectsContent() {
  const user = await requireCheckedIn();
  const projects = await listProjects(user.id);

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">New project</h2>
        <NewProjectForm />
      </section>
      <ProjectList heading="Active" projects={projects.filter((p) => !p.finishedAt)} />
      <ProjectList heading="Finished" projects={projects.filter((p) => p.finishedAt)} />
    </>
  );
}

export default function ProjectsPage() {
  return (
    <WorkPage title="My projects">
      <ProjectsContent />
    </WorkPage>
  );
}
