import { filesByProject, type ListedFile } from "@/server/attachments";
import { listProjects } from "@/server/projects";
import { requireCheckedIn } from "@/server/session";
import { ActionButton } from "@/ui/action-button";
import { cardClass, mutedTextClass } from "@/ui/form-parts";
import { LocalTime } from "@/ui/local-time";
import { WorkDetails, WorkPage } from "@/ui/work-page";
import { startWorkAction, stopWorkAction } from "../actions";
import { FileList } from "../attachments/file-list";
import { finishProjectAction, reopenProjectAction } from "./actions";
import { EditProjectForm } from "./edit-project-form";
import { NewProjectForm } from "./new-project-form";

type Project = Awaited<ReturnType<typeof listProjects>>[number];

function ProjectCard({ project, files }: { project: Project; files: ListedFile[] }) {
  const { id, title, description, finishedAt, seat, sentBy, workingSince } = project;
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
      {workingSince && (
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          Working here since <LocalTime value={workingSince} />
        </p>
      )}
      <FileList projectId={id} files={files} canUpload={!finishedAt} />
      {finishedAt ? (
        <div>
          <ActionButton action={reopenProjectAction} id={id} label="Reopen" />
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-2">
          {workingSince ? (
            <ActionButton action={stopWorkAction} id={id} label="Stop working" />
          ) : (
            <ActionButton action={startWorkAction} id={id} label="Start working here" primary />
          )}
          <EditProjectForm id={id} title={title} description={description} />
          <ActionButton action={finishProjectAction} id={id} label="Finish" />
        </div>
      )}
    </li>
  );
}

function ProjectList({
  heading,
  projects,
  files,
}: {
  heading: string;
  projects: Project[];
  files: Map<string, ListedFile[]>;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">
        {heading} ({projects.length})
      </h2>
      <ul className="flex flex-col gap-2">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} files={files.get(project.id) ?? []} />
        ))}
      </ul>
    </section>
  );
}

async function ProjectsContent() {
  const user = await requireCheckedIn();
  const projects = await listProjects(user.id);
  const files = await filesByProject(
    user.id,
    projects.map((project) => project.id),
  );

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">New project</h2>
        <NewProjectForm />
      </section>
      <ProjectList
        heading="Active"
        projects={projects.filter((p) => !p.finishedAt)}
        files={files}
      />
      <ProjectList
        heading="Finished"
        projects={projects.filter((p) => p.finishedAt)}
        files={files}
      />
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
