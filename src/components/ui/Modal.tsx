"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  className,
  size = "md",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={cn(
          "w-full bg-white rounded-2xl card-shadow animate-scale-in p-6",
          sizes[size],
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl text-[#2B2B2B]">{title}</h2>
            <button
              onClick={onClose}
              className="text-[#6B6B6B] hover:text-[#2B2B2B] transition-colors p-1 rounded-lg hover:bg-[#EDE7DD]"
            >
              <X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
