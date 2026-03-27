"use client";

import { forwardRef, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "gold" | "outline" | "ghost" | "danger" | "blush";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "gold", size = "md", loading, disabled, children, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D6C3A3] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
      gold: "bg-[#D6C3A3] text-white hover:bg-[#C5AF8E] shadow-sm hover:shadow-md",
      outline:
        "border border-[#D6C3A3] text-[#D6C3A3] hover:bg-[#D6C3A3]/10 bg-transparent",
      ghost: "text-[#6B6B6B] hover:bg-[#EDE7DD] hover:text-[#2B2B2B] bg-transparent",
      danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
      blush: "bg-[#B89B72] text-[#2B2B2B] hover:bg-[#A08A62] shadow-sm",
    };

    const sizes = {
      sm: "text-sm px-3 py-1.5 gap-1.5",
      md: "text-sm px-5 py-2.5 gap-2",
      lg: "text-base px-7 py-3.5 gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? (
          <>
            <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
