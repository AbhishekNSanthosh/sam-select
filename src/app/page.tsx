import { redirect } from "next/navigation";
import { getSession } from "@/lib/utils/session";

export default async function HomePage() {
  const session = await getSession();

  if (session) {
    if (session.eventId === "admin") {
      redirect("/admin");
    } else {
      redirect(`/event/${session.eventId}`);
    }
  }

  redirect("/login");
}
