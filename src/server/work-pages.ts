import { revalidatePath } from "next/cache";

/** Check-in decides whether these pages open, and tasks and projects change what they show. */
export function refreshWorkPages() {
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/inbox");
  revalidatePath("/sent");
}
