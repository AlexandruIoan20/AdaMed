import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[#f6faf8]">
      <Sidebar />
      {/* pt-16 lasă loc pentru bara superioară de pe mobil; pl-64 pentru bara laterală pe desktop */}
      <div className="pt-16 md:pt-0 md:pl-64">
        <main className="min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
