"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface Props {
  token: string;
  clientName: string;
  eventName: string;
  eventDate: string | null;
  description: string | null;
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function InviteForm({
  token,
  clientName,
  eventName,
  eventDate,
  description,
}: Props) {
  const router = useRouter();

  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [locked, setLocked] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const pinStr = pin.join("");

  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  function handleChange(index: number, value: string) {
    if (!/^[a-zA-Z0-9]*$/.test(value)) return;
    const next = [...pin];
    next[index] = value.slice(-1).toUpperCase();
    setPin(next);
    setError("");
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      const next = [...pin];
      next[index - 1] = "";
      setPin(next);
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter" && pinStr.length >= 4) handleSubmit();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 6)
      .toUpperCase();
    const next = [...pin];
    pasted.split("").forEach((ch, i) => { if (i < 6) next[i] = ch; });
    setPin(next);
    const nextEmpty = next.findIndex((c) => !c);
    inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
  }

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }

  async function handleSubmit() {
    if (pinStr.length < 4) {
      setError("Please enter your full PIN");
      triggerShake();
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/auth/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinStr }),
      });
      const data = await res.json();

      if (res.status === 429) {
        setError(data.error);
        setLocked(true);
        triggerShake();
        setPin(["", "", "", "", "", ""]);
      } else if (!res.ok) {
        setError(data.error ?? "Invalid PIN. Please try again.");
        triggerShake();
        setPin(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        router.push(`/event/${data.data.eventId}`);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl card-shadow overflow-hidden">
      {/* Personal header */}
      <div className="bg-gradient-to-br from-[#EDE7DD] to-[#D6C3A3]/30 px-8 pt-8 pb-6 text-center border-b border-[#D6C3A3]/20">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#C8A96A] to-[#B89B72] flex items-center justify-center mx-auto mb-4 shadow-md">
          <span className="font-display text-xl text-white tracking-wide">
            {initials(clientName)}
          </span>
        </div>

        <p className="text-xs tracking-[0.2em] uppercase text-[#B89B72] mb-1 font-medium">
          Welcome
        </p>
        <h1 className="font-display text-2xl text-[#2B2B2B] mb-4">
          {clientName}
        </h1>

        <div className="inline-flex flex-col items-center bg-white/70 rounded-xl px-5 py-3 border border-[#D6C3A3]/30 w-full">
          <p className="font-display text-sm text-[#2B2B2B] font-medium">{eventName}</p>
          {formattedDate && (
            <p className="text-xs text-[#6B6B6B] mt-0.5">{formattedDate}</p>
          )}
          {description && (
            <p className="text-xs text-[#6B6B6B] mt-1 italic">{description}</p>
          )}
        </div>
      </div>

      {/* PIN section */}
      <div className="px-8 py-7">
        <p className="text-center text-sm text-[#6B6B6B] mb-6 leading-relaxed">
          Enter the PIN provided by Sam&apos;s Creations to access your personal gallery.
        </p>

        <div
          className={cn(
            "flex gap-2 justify-center mb-5",
            shake && "animate-[wiggle_0.5s_ease]"
          )}
        >
          {pin.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              disabled={locked}
              className={cn(
                "w-11 h-14 text-center text-xl font-display rounded-xl border-2 outline-none transition-all duration-200",
                "bg-[#FBF9F6] text-[#2B2B2B]",
                digit
                  ? "border-[#D6C3A3] bg-[#D6C3A3]/5"
                  : "border-[#EDE7DD] focus:border-[#D6C3A3] focus:bg-white focus:ring-2 focus:ring-[#D6C3A3]/20",
                error && "border-red-400 bg-red-50",
                locked && "opacity-50 cursor-not-allowed"
              )}
              autoComplete="off"
              autoFocus={i === 0}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-red-500 mb-4 animate-fade-in leading-snug">
            {error}
          </p>
        )}

        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          loading={loading}
          disabled={locked || pinStr.replace(/\s/g, "").length < 4}
        >
          {loading ? "Verifying…" : "Enter My Gallery"}
        </Button>

        <p className="text-center text-xs text-[#6B6B6B] mt-4">
          Need help?{" "}
          <a
            href="mailto:hello@samscreations.com"
            className="text-[#D6C3A3] hover:underline"
          >
            Contact Sam&apos;s Creations
          </a>
        </p>
      </div>

      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
