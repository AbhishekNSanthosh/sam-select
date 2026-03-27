import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-[#2B2B2B]">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full px-4 py-3 rounded-xl border bg-white text-[#2B2B2B] placeholder-[#6B6B6B]/60",
            "border-[#EDE7DD] focus:border-[#D6C3A3] focus:ring-2 focus:ring-[#D6C3A3]/20",
            "outline-none transition-all duration-200 text-sm",
            error && "border-red-400 focus:border-red-400 focus:ring-red-200",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
