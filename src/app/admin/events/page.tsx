"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Calendar,
  ChevronRight,
  ImageIcon,
  Search,
  Copy,
  Check,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import type { IEvent } from "@/types";

const STATUS_FILTERS = ["all", "active", "locked", "archived"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

export default function AdminEventsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [events, setEvents] = useState<IEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    clientName: "",
    eventDate: "",
    pin: "",
    description: "",
    minSelection: "",
    maxSelection: "",
  });

  useEffect(() => {
    fetch("/api/events")
      .then((r) => {
        if (r.status === 401) router.replace("/login");
        return r.json();
      })
      .then((d) => {
        if (d.success) setEvents(d.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  async function handleCreate() {
    if (!form.name || !form.clientName || !form.eventDate || !form.pin) {
      toast("Please fill in all required fields", "error");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          minSelection: form.minSelection ? Number(form.minSelection) : undefined,
          maxSelection: form.maxSelection ? Number(form.maxSelection) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Failed to create event", "error");
      } else {
        setEvents((prev) => [data.data, ...prev]);
        setCreateOpen(false);
        setForm({ name: "", clientName: "", eventDate: "", pin: "", description: "", minSelection: "", maxSelection: "" });
        toast("Event created successfully", "success");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy(event: IEvent) {
    const origin = window.location.origin;
    const text = event.shareToken
      ? `${origin}/g/${event.shareToken}`
      : `${origin}/login`;
    await navigator.clipboard.writeText(text);
    setCopiedId(event._id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const filtered = events.filter((e) => {
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.clientName.toLowerCase().includes(q) ||
      e.pin.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen">
      <AdminPageHeader
        title="Events"
        subtitle={`${events.length} total event${events.length !== 1 ? "s" : ""}`}
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={15} /> New Event
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]" />
            <input
              type="text"
              placeholder="Search by name, client or PIN…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full outline-none pl-9 pr-4 py-2.5 text-sm rounded-xl border border-[#EDE7DD] bg-white text-[#2B2B2B] placeholder-[#6B6B6B]/60 focus:outline-none focus:border-[#D6C3A3] focus:ring-2 focus:ring-[#D6C3A3]/20"
            />
          </div>
          <div className="flex gap-1.5 bg-white border border-[#EDE7DD] rounded-xl p-1">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                  statusFilter === s
                    ? "bg-[#D6C3A3] text-white"
                    : "text-[#6B6B6B] hover:text-[#2B2B2B]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl card-shadow overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner className="w-8 h-8" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-[#EDE7DD] flex items-center justify-center mb-4">
                <Calendar size={24} className="text-[#D6C3A3]" />
              </div>
              <p className="font-display text-lg text-[#2B2B2B] mb-1">
                {search || statusFilter !== "all" ? "No events match your filters" : "No events yet"}
              </p>
              <p className="text-sm text-[#6B6B6B] mb-4">
                {search || statusFilter !== "all"
                  ? "Try adjusting your search or filter."
                  : "Create your first event to get started."}
              </p>
              {!search && statusFilter === "all" && (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus size={14} /> Create Event
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#EDE7DD]">
              {filtered.map((event) => (
                <Link
                  key={event._id}
                  href={`/admin/events/${event._id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-[#FBF9F6] transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D6C3A3]/15 to-[#B89B72]/15 flex items-center justify-center shrink-0">
                    <ImageIcon size={17} className="text-[#D6C3A3]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#2B2B2B] truncate">{event.name}</p>
                    <p className="text-xs text-[#6B6B6B]">
                      {event.clientName} &middot; {event.totalPhotos} photos &middot;{" "}
                      {new Date(event.eventDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    {event.shareToken ? (
                      <p className="text-xs text-[#B89B72] font-mono mt-0.5 truncate">
                        /g/{event.shareToken}
                      </p>
                    ) : (
                      <p className="text-xs text-[#6B6B6B]/50 mt-0.5 italic">No link — open event to generate</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={
                        event.status === "active" ? "green"
                        : event.status === "locked" ? "gold"
                        : "gray"
                      }
                    >
                      {event.status}
                    </Badge>
                    <button
                      onClick={(e) => { e.preventDefault(); handleCopy(event); }}
                      title={event.shareToken ? "Copy gallery link" : "Copy login URL"}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#EDE7DD] transition-colors text-[#6B6B6B] hover:text-[#2B2B2B]"
                    >
                      {copiedId === event._id
                        ? <Check size={14} className="text-emerald-500" />
                        : <Copy size={14} />}
                    </button>
                    <ChevronRight
                      size={15}
                      className="text-[#D6C3A3]/50 group-hover:text-[#D6C3A3] transition-colors"
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create event modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Event" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Event Name *" placeholder="Priya & Arjun Wedding" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Client Name *" placeholder="Priya Sharma" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Event Date *" type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
            <Input label="Access PIN *" placeholder="e.g. PRIYA24" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.toUpperCase() })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Min Selection" type="number" placeholder="e.g. 50" value={form.minSelection} onChange={(e) => setForm({ ...form, minSelection: e.target.value })} />
            <Input label="Max Selection" type="number" placeholder="e.g. 100" value={form.maxSelection} onChange={(e) => setForm({ ...form, maxSelection: e.target.value })} />
          </div>
          <Input label="Description (optional)" placeholder="A brief note about this event…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="flex-1" loading={creating} onClick={handleCreate}>Create Event</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
