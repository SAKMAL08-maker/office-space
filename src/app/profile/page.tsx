import Link from "next/link";
import { Suspense } from "react";
import { getOpenAttendance } from "@/server/attendance";
import { currentPictureId } from "@/server/pictures";
import { requireUser } from "@/server/session";
import { Avatar } from "@/ui/avatar";
import { Loading, mutedTextClass, quietButtonClass } from "@/ui/form-parts";
import { StillHere } from "../presence";
import { PictureForm } from "./picture-form";

async function MyProfile() {
  const user = await requireUser();
  const [pictureId, open] = await Promise.all([
    currentPictureId(user.id),
    getOpenAttendance(user.id),
  ]);
  return (
    <section className="flex flex-col gap-4 sm:flex-row sm:items-start">
      {/* Someone checked in keeps showing as here while they change their picture. */}
      {open && <StillHere />}
      <Avatar userId={user.id} name={user.name} pictureId={pictureId} size="lg" />
      <div className="flex min-w-0 flex-col gap-3">
        <div>
          <p className="text-lg font-semibold break-words">{user.name}</p>
          <p className={`${mutedTextClass} break-all`}>{user.email}</p>
        </div>
        <PictureForm userId={user.id} hasPicture={pictureId !== null} />
      </div>
    </section>
  );
}

export default function ProfilePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">My profile</h1>
        <Link href="/" className={quietButtonClass}>
          Back
        </Link>
      </div>
      <Suspense fallback={<Loading />}>
        <MyProfile />
      </Suspense>
    </main>
  );
}
