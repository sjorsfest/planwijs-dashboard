import { NavLink, Outlet } from "react-router"
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  ListTodo,
  Users,
  LogOut,
} from "lucide-react"
import { LesLabLogo } from "~/components/branding/leslab-logo"

const navItems = [
  {
    to: "/dashboard",
    label: "Overzicht",
    icon: LayoutDashboard,
  },
  {
    to: "/classes",
    label: "Lokaal & Klassen",
    icon: Users,
  },
  {
    to: "/plans",
    label: "Mijn Lessen",
    icon: BookOpen,
  },
  {
    to: "/todos",
    label: "To Do's",
    icon: ListTodo,
  },
  {
    to: "/calendar",
    label: "Kalender",
    icon: CalendarDays,
  },
]
export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[#f8f9ff] grid grid-cols-1 lg:grid-cols-[260px_1fr]">
      {/* ── Zijbalk ── */}
      <aside className="w-full lg:w-auto flex-shrink-0 bg-white flex flex-col lg:sticky lg:top-0 lg:h-screen shadow-[1px_0px_0px_rgba(199,196,215,0.5)]">

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 flex-shrink-0">
          <LesLabLogo />
        </div>

        {/* Navigatie */}
        <nav className="flex flex-col gap-1 px-3 pt-1 flex-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  "group flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all",
                  isActive
                    ? "bg-[#2a14b4]/10"
                    : "text-[#464554] hover:bg-[#eff4ff]",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <div className={[
                    "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
                    isActive
                      ? "bg-gradient-to-br from-[#2a14b4] to-[#4338ca] shadow-[0px_4px_10px_rgba(42,20,180,0.25)]"
                      : "bg-[#eff4ff] group-hover:bg-[#dce9ff]",
                  ].join(" ")}>
                    <Icon className={["w-4 h-4 transition-colors", isActive ? "text-white" : "text-[#5c5378]"].join(" ")} />
                  </div>
                  <div className="min-w-0">
                    <p className={["text-sm font-semibold leading-tight", isActive ? "text-[#2a14b4]" : "text-[#0b1c30]"].join(" ")}>{label}</p>
                  </div>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Uitloggen */}
        <div className="p-3 flex-shrink-0">
          <a
            href="/auth/logout"
            className="group flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[#464554] hover:bg-[#eff4ff] transition-colors w-full"
          >
            <div className="w-8 h-8 rounded-xl bg-[#eff4ff] group-hover:bg-[#dce9ff] flex items-center justify-center flex-shrink-0 transition-colors">
              <LogOut className="w-4 h-4 text-[#5c5378]" />
            </div>
            <span className="text-sm font-semibold text-[#0b1c30]">Uitloggen</span>
          </a>
        </div>
      </aside>

      {/* ── Paginainhoud ── */}
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
