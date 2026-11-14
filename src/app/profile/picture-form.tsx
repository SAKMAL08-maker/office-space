"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, useState } from "react";
import { ActionButton } from "@/ui/action-button";
import { FormError, mutedTextClass, quietButtonClass } from "@/ui/form-parts";
import { finishPictureAction, removeMyPictureAction, startPictureAction } from "./actions";

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
/** The chosen file is shrunk before it is sent, so it may be bigger than what is stored. */
const MAX_CHOSEN_BYTES = 20 * 1024 * 1024;
const SIDE_PX = 256;
const JPEG_QUALITY = 0.85;

/**
 * Crops the middle square, shrinks it to 256 pixels and saves it as a JPEG. A new file holds only
 * the pixels, so hidden details such as where a phone photo was taken are left behind.
 */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIDE_PX;
  canvas.height = SIDE_PX;
  const context = canvas.getContext("2d")!;
  // JPEG has no see-through parts, so they turn white rather than black.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, SIDE_PX, SIDE_PX);
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    SIDE_PX,
    SIDE_PX,
  );
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) throw new Error("The picture could not be saved.");
  return blob;
}

/** Sends one picture: the server hands out a link, the browser sends it there, the server checks. */
async function upload(file: File): Promise<string | undefined> {
  if (!ACCEPTED.includes(file.type)) return "Choose a PNG, JPEG or WebP picture.";
  if (file.size > MAX_CHOSEN_BYTES) return "Choose a picture of at most 20 MB.";

  let picture: Blob;
  try {
    picture = await shrink(file);
  } catch {
    return "That picture could not be read. Try another PNG, JPEG or WebP file.";
  }

  const started = await startPictureAction(picture.size);
  if ("error" in started) return started.error;

  let sent = false;
  try {
    const response = await fetch(started.url, {
      method: "PUT",
      headers: started.headers,
      body: picture,
    });
    sent = response.ok;
  } catch {
    sent = false;
  }
  // Finishing runs either way, so a failed upload does not leave a half-made record behind.
  const finished = await finishPictureAction(started.id);
  if (!sent) return "The upload failed. Check your connection and try again.";
  return finished.error;
}

/** Choose or remove your own picture. */
export function PictureForm({ userId, hasPicture }: { userId: string; hasPicture: boolean }) {
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
      setError(await upload(file));
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      input.value = "";
      setBusy(false);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className={mutedTextClass}>
        PNG, JPEG or WebP. It is cropped to a square and made small before it is sent.
      </p>
      <div className="flex flex-wrap items-start gap-2">
        <label className={`${quietButtonClass} w-fit cursor-pointer has-disabled:cursor-wait`}>
          {busy ? "Uploading…" : hasPicture ? "Change picture" : "Choose picture"}
          <input
            type="file"
            accept={ACCEPTED.join(",")}
            className="sr-only"
            disabled={busy}
            onChange={onChoose}
          />
        </label>
        {hasPicture && !busy && (
          <ActionButton action={removeMyPictureAction} id={userId} label="Remove" />
        )}
      </div>
      <FormError message={error} />
    </div>
  );
}
