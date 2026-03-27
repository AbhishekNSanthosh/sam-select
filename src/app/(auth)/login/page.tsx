"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/layout/Logo";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const pinStr = pin.join("");

  function handleChange(index: number, value: string) {
    if (!/^[a-zA-Z0-9]*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1).toUpperCase();
    setPin(newPin);
    setError("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (!pin[index] && index > 0) {
        const newPin = [...pin];
        newPin[index - 1] = "";
        setPin(newPin);
        inputRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === "Enter" && pinStr.length === 6) {
      handleSubmit();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
    const newPin = [...pin];
    pasted.split("").forEach((ch, i) => {
      if (i < 6) newPin[i] = ch;
    });
    setPin(newPin);
    const nextEmpty = newPin.findIndex((c) => !c);
    inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
  }

  async function handleSubmit() {
    if (pinStr.length < 4) {
      setError("Please enter your full event PIN");
      triggerShake();
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinStr }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Invalid PIN. Please try again.");
        triggerShake();
        setPin(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        if (data.data?.role === "admin") {
          router.push("/admin");
        } else {
          router.push(`/event/${data.data.eventId}`);
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  }

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }

  return (
    <main className="min-h-screen bg-[#FBF9F6] flex flex-col items-center justify-center px-4">
      {/* Decorative background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#D6C3A3]/8 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#B89B72]/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#EDE7DD]/20 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <Logo className="justify-center" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl card-shadow p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl text-[#2B2B2B] mb-2">
              Welcome to Your Gallery
            </h1>
            <p className="text-[#6B6B6B] text-sm leading-relaxed">
              Enter the event PIN provided by Sam&apos;s Creations to access your photos.
            </p>
          </div>

          {/* PIN inputs */}
          <div
            className={cn(
              "flex gap-2 justify-center mb-6",
              shake && "animate-[wiggle_0.5s_ease]"
            )}
            style={
              shake
                ? {
                    animation: "wiggle 0.5s ease",
                  }
                : {}
            }
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
                className={cn(
                  "w-12 h-14 text-center text-xl font-display rounded-xl border-2 outline-none transition-all duration-200",
                  "bg-[#FBF9F6] text-[#2B2B2B]",
                  digit
                    ? "border-[#D6C3A3] bg-[#D6C3A3]/5"
                    : "border-[#EDE7DD] focus:border-[#D6C3A3] focus:bg-white focus:ring-2 focus:ring-[#D6C3A3]/20",
                  error && "border-red-400 bg-red-50"
                )}
                autoComplete="off"
                autoFocus={i === 0}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <p className="text-center text-sm text-red-500 mb-4 animate-fade-in">
              {error}
            </p>
          )}

          {/* Submit */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            loading={loading}
            disabled={pinStr.replace(/\s/g, "").length < 4}
          >
            {loading ? "Verifying..." : "Enter Gallery"}
          </Button>

          <p className="text-center text-xs text-[#6B6B6B] mt-4">
            Don&apos;t have a PIN?{" "}
            <a href="mailto:hello@samscreations.com" className="text-[#D6C3A3] hover:underline">
              Contact us
            </a>
          </p>
        </div>

        {/* Tagline */}
        <p className="text-center text-xs text-[#6B6B6B] mt-6 italic font-display">
          &ldquo;Capturing your forever moments&rdquo;
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
    </main>
  );
}
