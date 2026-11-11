"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, useState } from "react";
import type { ListedFile } from "@/server/attachments";
import { ActionButton } from "@/ui/action-button";
import { FormError, mutedTextClass, quietButtonClass } from "@/ui/form-parts";
import { finishUploadAction, removeAttachmentAction, startUploadAction } from "./actions";

function readableSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Sends one file: the server hands out a link, the browser sends the file there, the server checks. */
async function upload(projectId: string, file: File): Promise<string | undefined> {
  const started = await startUploadAction(projectId, file.name, file.size);
  if ("error" in started) return started.error;

  let sent = false;
  try {
    const response = await fetch(started.url, {
      method: "PUT",
      headers: started.headers,
      body: file,
    });
    sent = response.ok;
  } catch {
    sent = false;
  }
  // Finishing runs either way, so a failed upload does not leave a half-made record behind.
  const finished = await finishUploadAction(started.id);
  if (!sent) return "The upload failed. Check your connection and try again.";
  return finished.error;
}

function UploadButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function onChoose(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(undefined);
    try {
      setError(await upload(projectId, file));
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      input.value = "";
      setBusy(false);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className={`${quietButtonClass} w-fit cursor-pointer has-disabled:cursor-wait`}>
        {busy ? "Uploading…" : "Add a file"}
        <input type="file" className="sr-only" disabled={busy} onChange={onChoose} />
      </label>
      <FormError message={error} />
    </div>
  );
}

/** A project's files, with download links, and an upload button for those allowed to add one. */
export function FileList({
  projectId,
  files,
  canUpload,
}: {
  projectId: string;
  files: ListedFile[];
  canUpload: boolean;
}) {
  if (files.length === 0 && !canUpload) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Files ({files.length})</p>
      {files.length > 0 && (
        <ul className="flex flex-col gap-1">
          {files.map((file) => (
            <li key={file.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <a
                href={`/api/attachments/${file.id}`}
                className="text-sm underline wrap-anywhere"
                rel="noreferrer"
              >
                {file.fileName}
              </a>
              <span className={mutedTextClass}>{readableSize(file.size)}</span>
              {file.canRemove && (
                <ActionButton action={removeAttachmentAction} id={file.id} label="Remove" />
              )}
            </li>
          ))}
        </ul>
      )}
      {canUpload && <UploadButton projectId={projectId} />}
    </div>
  );
}
