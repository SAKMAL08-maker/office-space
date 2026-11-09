import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { isSetupOpen } from "@/server/setup";
import { AuthCard, Loading } from "@/ui/form-parts";
import { SetupForm } from "./setup-form";

async function SetupContent() {
  await connection();
  if (!(await isSetupOpen())) notFound();
  return <SetupForm />;
}

export default function SetupPage() {
  return (
    <AuthCard title="Create the first admin">
      <Suspense fallback={<Loading />}>
        <SetupContent />
      </Suspense>
    </AuthCard>
  );
}
