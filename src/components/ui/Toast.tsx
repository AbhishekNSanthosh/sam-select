"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const icons = {
    success: <CheckCircle size={16} className="text-emerald-500 shrink-0" />,
    error: <XCircle size={16} className="text-red-500 shrink-0" />,
    info: <AlertCircle size={16} className="text-[#D6C3A3] shrink-0" />,
  };

  const styles = {
    success: "border-emerald-200 bg-white",
    error: "border-red-200 bg-white",
    info: "border-[#D6C3A3]/30 bg-white",
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 px-4 py-3 rounded-xl border card-shadow animate-fade-in text-sm text-[#2B2B2B]",
              styles[t.type]
            )}
          >
            {icons[t.type]}
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              className="text-[#6B6B6B] hover:text-[#2B2B2B] shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
