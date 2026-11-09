import { connection } from "next/server";
import { Suspense } from "react";
import { findUsableResetLink } from "@/server/password-resets";
import { AuthCard, Loading } from "@/ui/form-parts";
import { ResetForm } from "./reset-form";

async function ResetContent({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const link = await findUsableResetLink(token);
  if (!link) {
    return <p>This reset link is no longer valid. Ask an admin for a new one.</p>;
  }
  return <ResetForm token={token} email={link.email} />;
}

export default function ResetPage({ params }: PageProps<"/reset/[token]">) {
  return (
    <AuthCard title="Set a new password">
      <Suspense fallback={<Loading />}>
        <ResetContent params={params} />
      </Suspense>
    </AuthCard>
  );
}
