import { notFound, redirect } from "next/navigation";
import Logo from "@/components/layout/Logo";
import InviteForm from "./InviteForm";
import { connectDB } from "@/lib/db/connect";
import Event from "@/models/Event";
import { getSession } from "@/lib/utils/session";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token } = await params;
  const { edit } = await searchParams;

  await connectDB();
  const event = await Event.findOne(
    { shareToken: token, status: { $ne: "archived" } },
    { name: 1, clientName: 1, eventDate: 1, description: 1, coverPhoto: 1 }
  ).lean();

  if (!event) notFound();

  // If already logged in with PIN for this specific event, skip the form
  const session = await getSession();
  if (session && session.eventId === event._id.toString() && edit !== "true") {
    redirect(`/event/${event._id}`);
  }

  const bgImage = event.coverPhoto?.replace(/=s\d+$/, "=s1600") || "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=2669&auto=format&fit=crop";

  const formattedDate = event.eventDate
    ? new Date(event.eventDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <main className="h-[100dvh] overflow-hidden bg-[#FBF9F6] flex flex-col md:flex-row">
      {/* Background / Left Image Panel */}
      <div className="relative w-full h-[35vh] sm:h-[40vh] md:h-full md:w-5/12 lg:w-1/2 flex-shrink-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${bgImage}')` }}
        />
        {/* Simple, smooth gradient for clean contrast */}
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        
        <div className="absolute top-6 left-6 md:top-8 md:left-8 z-10 opacity-90">
          <Logo className="text-white invert" />
        </div>

        {/* Clean, minimalist Mobile Text */}
        <div className="absolute bottom-10 left-6 right-6 md:hidden text-white">
          <h1 className="font-display text-3xl font-medium tracking-wide mb-1 leading-tight">{event.clientName}</h1>
          <p className="text-sm text-white/90">{event.name}</p>
          {formattedDate && <p className="text-xs text-white/60 mt-0.5">{formattedDate}</p>}
          {event.description && <p className="text-xs text-white/60 mt-0.5 line-clamp-1 italic">{event.description}</p>}
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 md:p-12 -mt-6 md:mt-0 relative z-10 bg-[#FBF9F6] rounded-t-3xl md:rounded-none overflow-y-auto">
        <div className="w-full max-w-sm md:max-w-md mx-auto relative">
          <div className="hidden md:block text-center mb-6">
            <p className="text-xs tracking-[0.2em] uppercase text-[#D6C3A3] mb-2 font-medium">Welcome to</p>
            <h1 className="font-display text-4xl text-[#2B2B2B] mb-2">{event.clientName}</h1>
            <p className="text-sm text-[#6B6B6B]">{event.name}</p>
            {formattedDate && <p className="text-xs text-[#B0A090] mt-1">{formattedDate}</p>}
            {event.description && <p className="text-xs text-[#B0A090] mt-1 italic mx-auto max-w-[80%] line-clamp-2">{event.description}</p>}
          </div>

          <InviteForm
            token={token}
            clientName={event.clientName}
            eventName={event.name}
            eventDate={event.eventDate ? event.eventDate.toISOString() : null}
            description={event.description ?? null}
          />

          <p className="text-center text-xs text-[#B0A090] mt-6 italic font-display">
            &ldquo;Capturing your forever moments&rdquo;
          </p>
        </div>
      </div>
    </main>
  );
}
