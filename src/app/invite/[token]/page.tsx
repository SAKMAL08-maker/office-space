import { connection } from "next/server";
import { Suspense } from "react";
import { findUsableInvite } from "@/server/invites";
import { AuthCard, Loading } from "@/ui/form-parts";
import { InviteForm } from "./invite-form";

async function InviteContent({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const invite = await findUsableInvite(token);
  if (!invite) {
    return <p>This invite link is no longer valid. Ask an admin for a new one.</p>;
  }
  return <InviteForm token={token} email={invite.email} />;
}

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <AuthCard title="Join Office Space">
      <Suspense fallback={<Loading />}>
        <InviteContent params={params} />
      </Suspense>
    </AuthCard>
  );
}
