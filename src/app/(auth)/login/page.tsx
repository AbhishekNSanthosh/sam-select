"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      setError("Please enter your username and password.");
      triggerShake();
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Invalid credentials. Please try again.");
        triggerShake();
      } else {
        router.push("/admin");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FBF9F6] flex">
      {/* Left side: Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 md:px-24 relative z-10">
        <div className="w-full max-w-sm mx-auto animate-fade-in">
          {/* Logo */}
          <div className="mb-12">
            <Image
              src="/logo.png"
              alt="Sam's Creations"
              width={140}
              height={45}
              className="object-contain w-auto h-auto"
            />
          </div>

          {/* Header */}
          <div className="mb-10">
            <h1 className="font-display text-3xl text-[#2B2B2B] mb-2">Welcome Back</h1>
            <p className="text-base text-[#6B6B6B]">Sign in to your creative workspace.</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className={cn("space-y-6", shake && "animate-[wiggle_0.5s_ease]")}
          >
            {/* Username */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#2B2B2B] tracking-widest uppercase">
                Username
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D6C3A3]"
                />
                <input
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(""); }}
                  placeholder="admin"
                  className={cn(
                    "w-full pl-11 pr-4 py-3.5 rounded-xl border text-sm text-[#2B2B2B] bg-white outline-none transition-all duration-200 shadow-sm",
                    "placeholder:text-[#C4BAB0]",
                    error
                      ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                      : "border-[#EDE7DD] focus:border-[#D6C3A3] focus:ring-2 focus:ring-[#D6C3A3]/20"
                  )}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#2B2B2B] tracking-widest uppercase">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D6C3A3]"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  className={cn(
                    "w-full pl-11 pr-12 py-3.5 rounded-xl border text-sm text-[#2B2B2B] bg-white outline-none transition-all duration-200 shadow-sm",
                    "placeholder:text-[#C4BAB0]",
                    error
                      ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                      : "border-[#EDE7DD] focus:border-[#D6C3A3] focus:ring-2 focus:ring-[#D6C3A3]/20"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A09080] hover:text-[#2B2B2B] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              
              {/* Error - Tightly grouped underneath the password field to prevent white-space drifting */}
              <div className="h-5">
                {error && <p className="text-[13px] text-red-500 animate-fade-in font-medium pl-1">{error}</p>}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full py-4 text-base font-medium shadow-md hover:shadow-lg transition-shadow"
              size="lg"
              loading={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          
          <p className="text-center text-xs text-[#6B6B6B] mt-10 italic font-display">
            &ldquo;Capturing your forever moments&rdquo;
          </p>
        </div>
      </div>

      {/* Right side: Image overlay */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <Image
          src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=2069&auto=format&fit=crop"
          alt="Wedding photography"
          fill
          sizes="50vw"
          className="object-cover"
          priority
        />
        {/* Abstract elegant overlay matching Sam's Creations theme */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent flex flex-col justify-end p-12">
          <div className="max-w-md animate-fade-in [animation-delay:200ms]">
            <h2 className="text-white font-display text-4xl mb-4 leading-tight">
              Crafting memories that last a lifetime.
            </h2>
            <div className="w-12 h-1 bg-[#D6C3A3] mb-4"></div>
            <p className="text-[#FBF9F6]/80 text-lg">
              Manage your galleries, clients, and stunning collections all in one place.
            </p>
          </div>
        </div>
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


