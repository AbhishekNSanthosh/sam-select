import Link from "next/link";
import { ArrowLeft, Camera, ImageOff } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Decorative background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#D6C3A3]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#B89B72]/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#EDE7DD]/50 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Content Box */}
      <div className="relative z-10 w-full max-w-lg mx-auto bg-white/60 backdrop-blur-xl border border-[#EDE7DD] sm:p-16 p-8 rounded-3xl shadow-2xl text-center">
        
        {/* Animated Icon */}
        <div className="relative mx-auto w-24 h-24 mb-8 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#EDE7DD] rounded-full animate-ping opacity-20" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-2 bg-[#F5EFE6] rounded-full flex items-center justify-center border border-[#D6C3A3]">
            <ImageOff className="w-8 h-8 text-[#A09080]" strokeWidth={1.5} />
          </div>
        </div>

        {/* 404 Title */}
        <h1 className="text-[120px] font-extrabold text-[#2B2B2B] leading-none tracking-tighter sm:mb-4 mb-2 drop-shadow-sm font-serif">
          4<span className="text-[#B89B72]">0</span>4
        </h1>
        
        {/* Copy */}
        <h2 className="text-2xl font-serif text-[#2B2B2B] mb-4">
          Lost in the Archives
        </h2>
        <p className="text-[#8C7A6B] max-w-sm mx-auto mb-10 leading-relaxed font-light">
          It looks like the gallery or page you're searching for has been moved, deleted, or never existed in the first place.
        </p>

        {/* Action Button */}
        <Link 
          href="/"
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 bg-[#2B2B2B] hover:bg-[#1A1A1A] text-white rounded-full font-medium tracking-wide transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Return to Website
        </Link>
      </div>

      {/* Subtle branding or watermark */}
      <div className="absolute bottom-8 text-center text-[10px] tracking-[0.2em] font-medium text-[#C0B8B0] uppercase flex items-center gap-2">
        <Camera className="w-3 h-3" />
        Sam's Creations
      </div>
    </div>
  );
}
