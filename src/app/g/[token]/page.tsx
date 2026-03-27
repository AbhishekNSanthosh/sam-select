import { notFound } from "next/navigation";
import Logo from "@/components/layout/Logo";
import InviteForm from "./InviteForm";
import { connectDB } from "@/lib/db/connect";
import Event from "@/models/Event";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  await connectDB();
  const event = await Event.findOne(
    { shareToken: token, status: { $ne: "archived" } },
    { name: 1, clientName: 1, eventDate: 1, description: 1 }
  ).lean();

  if (!event) notFound();

  return (
    <main className="min-h-screen bg-[#FBF9F6] flex flex-col items-center justify-center px-4 py-10">
      {/* Decorative background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#D6C3A3]/8 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#B89B72]/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#EDE7DD]/20 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Logo className="justify-center" />
        </div>

        <InviteForm
          token={token}
          clientName={event.clientName}
          eventName={event.name}
          eventDate={event.eventDate ? event.eventDate.toISOString() : null}
          description={event.description ?? null}
        />

        <p className="text-center text-xs text-[#6B6B6B] mt-6 italic font-display">
          &ldquo;Capturing your forever moments&rdquo;
        </p>
      </div>
    </main>
  );
}
