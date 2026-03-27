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
        /* Mobile: slide up from bottom */
        @keyframes _sheet_in  { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes _sheet_out { from { transform: translateY(0);    } to { transform: translateY(100%); } }
        
        /* Desktop: fade + scale in center */
        @keyframes _modal_in  { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes _modal_out { from { opacity: 1; transform: scale(1);    } to { opacity: 0; transform: scale(0.95); } }

        @keyframes _bd_in     { from { opacity: 0; }  to { opacity: 1; } }
        @keyframes _bd_out    { from { opacity: 1; }  to { opacity: 0; } }
      `}</style>

      <div className="fixed inset-0 z-50 flex justify-center items-end sm:items-center sm:p-4">
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

        {/* Sheet / Modal */}
        <div
          className={[
            "_bottom_sheet_surface relative z-10 w-full bg-white shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto",
            "rounded-t-2xl sm:rounded-2xl", // flat bottom on mobile, rounded all sides on desktop
            maxWidth,
          ].join(" ")}
          style={{
            animation: closing
              ? "var(--anim-out) forwards"
              : "var(--anim-in) forwards",
          }}
        >
          {/* Inject dynamic animation variables based on screen size */ }
          <style>{`
            ._bottom_sheet_surface {
              --anim-in: _sheet_in 0.42s cubic-bezier(0.16,1,0.3,1);
              --anim-out: _sheet_out 0.38s cubic-bezier(0.4,0,1,1);
            }
            @media (min-width: 640px) {
              ._bottom_sheet_surface {
                --anim-in: _modal_in 0.3s cubic-bezier(0.16,1,0.3,1);
                --anim-out: _modal_out 0.25s cubic-bezier(0.4,0,1,1);
              }
            }
          `}</style>
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
