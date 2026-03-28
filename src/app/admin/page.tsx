"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  Plus,
  Calendar,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import type { IEvent } from "@/types";

export default function AdminDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [events, setEvents] = useState<IEvent[]>([]);
  const [loading, setLoading] = useState(true);
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
    if (!/^\d{6}$/.test(form.pin)) {
      toast("Access PIN must be exactly 6 digits", "error");
      return;
    }
    setCreating(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("clientName", form.clientName);
      fd.append("eventDate", form.eventDate);
      fd.append("pin", form.pin);
      if (form.description) fd.append("description", form.description);
      if (form.minSelection) fd.append("minSelection", form.minSelection);
      if (form.maxSelection) fd.append("maxSelection", form.maxSelection);

      const res = await fetch("/api/events", {
        method: "POST",
        body: fd,
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

  const stats = {
    total: events.length,
    active: events.filter((e) => e.status === "active").length,
    locked: events.filter((e) => e.status === "locked").length,
    archived: events.filter((e) => e.status === "archived").length,
  };

  return (
    <div className="min-h-screen">
      <AdminPageHeader
        title="Dashboard"
        subtitle="Overview of all events and album submissions"
        action={
          <Button onClick={() => setCreateOpen(true)} className="px-3 sm:px-5">
            <Plus size={15} /> <span className="hidden sm:inline">New Event</span>
          </Button>
        }
      />

      <div className="p-6 space-y-5">
        {/* Welcome banner */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#2B2B2B] to-[#1E1A14] p-6 text-white">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[#D6C3A3]/10 -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 right-16 w-24 h-24 rounded-full bg-[#B89B72]/10 translate-y-1/2" />
          <div className="relative z-10">
            <p className="text-[#D6C3A3] text-[10px] tracking-[0.2em] uppercase mb-1">Welcome back</p>
            <h2 className="font-display text-2xl mb-1">Sam&apos;s Creations Studio</h2>
            <p className="text-white/50 text-sm">
              {stats.total === 0
                ? "No events yet — create your first one below."
                : `${stats.active} active event${stats.active !== 1 ? "s" : ""} · ${stats.locked} pending review`}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Events", value: stats.total, icon: <Users size={16} />, color: "text-[#B89B72]", bg: "bg-[#F5EFE6]" },
            { label: "Active", value: stats.active, icon: <TrendingUp size={16} />, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Awaiting Review", value: stats.locked, icon: <Clock size={16} />, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Approved", value: stats.archived, icon: <CheckCircle size={16} />, color: "text-blue-600", bg: "bg-blue-50" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-[#EDE7DD] p-4">
              <div className={`w-8 h-8 rounded-lg ${s.bg} ${s.color} flex items-center justify-center mb-3`}>
                {s.icon}
              </div>
              <p className="font-display text-2xl text-[#2B2B2B]">{s.value}</p>
              <p className="text-xs text-[#A09080] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Events table */}
        <div className="bg-white rounded-xl border border-[#EDE7DD] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#EDE7DD] flex items-center justify-between">
            <h2 className="font-display text-base text-[#2B2B2B]">Recent Events</h2>
            <Link
              href="/admin/albums"
              className="text-xs text-[#B89B72] hover:text-[#9A7D5A] flex items-center gap-1 transition-colors"
            >
              View albums <ChevronRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-[#F5EFE6] flex items-center justify-center mb-4">
                <Calendar size={22} className="text-[#B89B72]" />
              </div>
              <p className="font-display text-base text-[#2B2B2B] mb-1">No events yet</p>
              <p className="text-sm text-[#A09080] mb-4">Create your first event to get started.</p>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus size={14} /> Create Event
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-[#EDE7DD]">
              {events.map((event) => (
                <Link
                  key={event._id}
                  href={`/admin/events/${event._id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#FBF9F6] transition-colors group"
                >
                  {/* Icon / Cover Photo */}
                  {event.coverPhoto ? (
                    <div className="w-12 h-12 rounded-lg bg-[#EDE7DD] overflow-hidden shrink-0 relative shadow-sm border border-[#EDE7DD]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={event.coverPhoto.replace(/=s\d+$/, "=s200")} 
                        alt={event.name} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-[#F5EFE6] flex items-center justify-center shrink-0 border border-[#EDE7DD]">
                      <ImageIcon size={20} className="text-[#B89B72]" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2B2B2B] truncate">{event.name}</p>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#A09080] mt-0.5">
                      <span className="font-medium text-[#7A7060]">{event.clientName}</span>
                      <span className="w-1 h-1 rounded-full bg-[#EDE7DD]" />
                      <span>{new Date(event.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      <span className="w-1 h-1 rounded-full bg-[#EDE7DD]" />
                      <span>{event.totalPhotos} photos</span>
                      <span className="w-1 h-1 rounded-full bg-[#EDE7DD]" />
                      <span className="font-mono bg-[#F5EFE6] text-[#7A7060] px-1.5 py-0.5 rounded shadow-sm border border-[#EDE7DD]/50">PIN: {event.pin}</span>
                    </div>
                  </div>

                  {/* Status + arrow */}
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge
                      variant={
                        event.status === "active" ? "green"
                        : event.status === "locked" ? "gold"
                        : "gray"
                      }
                    >
                      {event.status}
                    </Badge>
                    <ChevronRight
                      size={14}
                      className="text-[#D6C3A3]/50 group-hover:text-[#B89B72] transition-colors"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Event Name *" placeholder="Priya & Arjun Wedding" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Client Name *" placeholder="Priya Sharma" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Event Date *" type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
            <Input 
              label="Access PIN (6 digits) *" 
              placeholder="e.g. 123456" 
              maxLength={6}
              inputMode="numeric"
              value={form.pin} 
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setForm({ ...form, pin: val });
              }} 
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
