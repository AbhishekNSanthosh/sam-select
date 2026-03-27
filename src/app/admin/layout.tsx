import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#FBF9F6]">
      <AdminSidebar />
      {/* Main content — offset for mobile top bar */}
      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
