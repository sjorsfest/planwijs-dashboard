import { NavLink, Outlet, useLoaderData } from "react-router"
import { NavigationProgress } from "~/components/navigation-progress"
import { LogOut } from "lucide-react"
import { LesLabLogo } from "~/components/branding/leslab-logo"
import { OnboardingProvider } from "~/components/onboarding/onboarding-context"
import { WelkomOverlay } from "~/components/onboarding/welkom-overlay"
import { FeedbackPanel } from "~/components/feedback/feedback-panel"
import type { loader } from "./route"
import { navItems } from "./constants"
export default function AppLayout() {
  const { hasLesplans } = useLoaderData<typeof loader>()

  return (
    <OnboardingProvider hasLesplans={hasLesplans}>
    <div className="min-h-screen bg-[#f8f9ff] grid grid-cols-1 lg:grid-cols-[260px_1fr]">
      <NavigationProgress />

      {/* ── Mobile top header ── */}
      <header className="flex lg:hidden items-center justify-between px-4 h-14 bg-white shadow-[0px_1px_0px_rgba(199,196,215,0.5)]">
        <LesLabLogo />
        <a
          href="/auth/logout"
          className="w-9 h-9 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#5c5378] hover:bg-[#dce9ff] transition-colors"
          aria-label="Uitloggen"
        >
          <LogOut className="w-4 h-4" />
        </a>
      </header>

      {/* ── Zijbalk (desktop only) ── */}
      <aside className="w-full lg:w-auto flex-shrink-0 bg-white hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen shadow-[1px_0px_0px_rgba(199,196,215,0.5)]">

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
              prefetch="intent"
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
      <div className="min-w-0 pb-20 lg:pb-0">
        <Outlet />
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0px_-4px_20px_rgba(11,28,48,0.08)] border-t border-[#eff4ff] pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="flex items-center justify-around px-1 h-16">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              prefetch="intent"
              className="flex flex-col items-center gap-1 min-w-0 py-1 px-1"
            >
              {({ isActive }) => (
                <>
                  <div className={[
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                    isActive
                      ? "bg-gradient-to-br from-[#2a14b4] to-[#4338ca] shadow-[0px_4px_10px_rgba(42,20,180,0.25)]"
                      : "bg-[#eff4ff]",
                  ].join(" ")}>
                    <Icon className={["w-5 h-5 transition-colors", isActive ? "text-white" : "text-[#5c5378]"].join(" ")} />
                  </div>
                  <span className={["text-[10px] font-semibold leading-tight", isActive ? "text-[#2a14b4]" : "text-[#464554]"].join(" ")}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
    <WelkomOverlay />
    <FeedbackPanel />
    </OnboardingProvider>
  )
}
