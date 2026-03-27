"use client";

import { useEffect, useState, useRef } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function BottomSheet({ open, onClose, children, maxWidth = "sm:max-w-lg" }: Props) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setClosing(false);
      setVisible(true);
    } else if (visible) {
      // play exit, then unmount
      setClosing(true);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setClosing(false);
      }, 380);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <>
      {/* Keyframe definitions injected once */}
      <style>{`
        @keyframes _sheet_in  { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes _sheet_out { from { transform: translateY(0);    } to { transform: translateY(100%); } }
        @keyframes _bd_in     { from { opacity: 0; }  to { opacity: 1; } }
        @keyframes _bd_out    { from { opacity: 1; }  to { opacity: 0; } }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-end justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/45 backdrop-blur-sm"
          style={{
            animation: closing
              ? "_bd_out 0.35s ease forwards"
              : "_bd_in 0.25s ease forwards",
          }}
          onClick={onClose}
        />

        {/* Sheet */}
        <div
          className={[
            "relative z-10 bg-white w-full rounded-t-2xl sm:rounded-t-2xl",
            "shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto",
            maxWidth,
          ].join(" ")}
          style={{
            animation: closing
              ? "_sheet_out 0.38s cubic-bezier(0.4,0,1,1) forwards"
              : "_sheet_in  0.42s cubic-bezier(0.16,1,0.3,1) forwards",
          }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
            <div className="w-10 h-1 rounded-full bg-[#D6C3A3]/50" />
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
