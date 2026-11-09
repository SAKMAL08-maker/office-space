"use client";

import { useState } from "react";
import { inputClass, quietButtonClass } from "./form-parts";

/** Shows a link once, with a button to copy it. */
export function CopyLink({ link, hint }: { link: string; hint: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{hint}</p>
      <div className="flex gap-2">
        <input
          readOnly
          value={link}
          aria-label="Link to send"
          className={`${inputClass} min-w-0 font-mono text-sm`}
        />
        <button type="button" onClick={copy} className={quietButtonClass}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
