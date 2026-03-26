import { NavLink, Outlet } from "react-router"
import {
  CalendarDays,
  LayoutDashboard,
  BookOpen,
  LogOut,
} from "lucide-react"

const navItems = [
  {
    to: "/dashboard",
    label: "Dashboard",
    description: "Overzicht van vandaag",
    icon: LayoutDashboard,
    bg: "#dcd3f0",
  },
  {
    to: "/calendar",
    label: "Kalender",
    description: "Bekijk je lesweek",
    icon: CalendarDays,
    bg: "#c8ead8",
  },
  {
    to: "/plans",
    label: "Plannen",
    description: "Lesplannen beheren",
    icon: BookOpen,
    bg: "#c5d9f5",
  },
]

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-white grid grid-cols-1 lg:grid-cols-[0.9fr_3.1fr]">
      {/* ── Zijbalk ── */}
      <aside className="w-full lg:w-auto flex-shrink-0 border-r-2 border-black bg-white flex flex-col lg:sticky lg:top-0 lg:h-screen">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 h-16 border-b-2 border-black bg-white flex-shrink-0">
          <div className="w-7 h-7 flex items-center justify-center">
            <CalendarDays className="w-6 h-6 text-black" />
          </div>
          <span className="font-bold text-sm tracking-tight">Planwijs</span>
        </div>

        {/* Hero */}
        <div className="flex-1 flex flex-col justify-end p-6 bg-[#f9d5d3] border-b-2 border-black">
          <h2 className="text-3xl font-black leading-[1.05] text-black">
            Snel naar<br />je lessen.
          </h2>
          <p className="mt-3 text-xs text-black/60 leading-relaxed">
            Kies een onderdeel en ga direct verder.
          </p>
        </div>

        {/* Navigatie */}
        <nav className="flex flex-col flex-shrink-0 border-b-2 border-black">
          {navItems.map(({ to, label, description, icon: Icon, bg }, i, arr) => (
            <NavLink
              key={to}
              to={to}
              style={{ backgroundColor: bg }}
              className={({ isActive }) =>
                [
                  "group flex items-center gap-4 px-6 py-5 transition-[filter,box-shadow] text-black",
                  i < arr.length - 1 ? "border-b-2 border-black" : "",
                  isActive ? "shadow-[inset_5px_0px_0px_#000]" : "hover:brightness-[0.97]",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <div className={["w-7 h-7 border-2 border-black flex items-center justify-center flex-shrink-0 transition-colors", isActive ? "bg-black" : "bg-white"].join(" ")}>
                    <Icon className={["w-3.5 h-3.5 transition-colors", isActive ? "text-white" : "text-black"].join(" ")} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">{label}</p>
                    <p className="text-[11px] text-black/55 leading-tight mt-0.5">{description}</p>
                  </div>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Uitloggen */}
        <div className="p-3 bg-[#f5f0e8] flex-shrink-0">
          <a
            href="/auth/logout"
            className="group flex items-center gap-4 px-3 py-2 text-black hover:bg-white/60 transition-colors w-full"
          >
            <div className="w-7 h-7 border-2 border-black bg-white flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-black">
              <LogOut className="w-3.5 h-3.5 transition-colors group-hover:text-white" />
            </div>
            <span className="text-sm font-semibold">Uitloggen</span>
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
