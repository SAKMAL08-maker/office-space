import { AuthCard } from "@/ui/form-parts";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <AuthCard title="Log in to Office Space">
      <LoginForm />
    </AuthCard>
  );
}
