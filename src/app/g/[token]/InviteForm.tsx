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
    <div className="bg-white rounded-3xl p-5 sm:p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-[#EDE7DD]/50">
      <p className="text-center text-sm text-[#6B6B6B] mb-6 leading-relaxed">
        Enter the PIN provided by Sam&apos;s Creations to access your personal gallery.
      </p>

      <div
        className={cn(
          "flex gap-1.5 sm:gap-2 justify-center mb-5",
          shake && "animate-[wiggle_0.5s_ease]"
        )}
      >
        {pin.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            disabled={locked}
            className={cn(
              "w-9 h-11 sm:w-12 sm:h-16 text-center text-lg sm:text-2xl font-display rounded-xl border-2 outline-none transition-all duration-200",
              "bg-[#FBF9F6] text-[#2B2B2B]",
              digit
                ? "border-[#D6C3A3] bg-[#D6C3A3]/5"
                : "border-[#EDE7DD] focus:border-[#D6C3A3] focus:bg-white focus:ring-2 focus:ring-[#D6C3A3]/30",
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
        className="w-full h-12 text-base shadow-lg shadow-[#D6C3A3]/20 hover:shadow-xl hover:shadow-[#D6C3A3]/30 transition-shadow"
        size="lg"
        onClick={handleSubmit}
        loading={loading}
        disabled={locked || pinStr.replace(/\s/g, "").length < 4}
      >
        {loading ? "Verifying…" : "Enter My Gallery"}
      </Button>

      <p className="text-center text-xs text-[#6B6B6B] mt-6">
        Need help?{" "}
        <a
          href="mailto:hello@samscreations.com"
          className="text-[#D6C3A3] hover:text-[#B89B72] hover:underline transition-colors font-medium"
        >
          Contact Sam&apos;s Creations
        </a>
      </p>

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
