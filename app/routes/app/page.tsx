import { useEffect, useRef, useState } from "react"
import { NavLink, Link, Outlet, useLoaderData } from "react-router"
import { NavigationProgress } from "~/components/navigation-progress"
import { LogOut, Settings, ChevronUp } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { LesLabLogo } from "~/components/branding/leslab-logo"
import { OnboardingProvider } from "~/components/onboarding/onboarding-context"
import { WelkomOverlay } from "~/components/onboarding/welkom-overlay"
import { SchoolConfigOnboarding } from "~/components/onboarding/school-config-onboarding"
import { FeedbackPanel } from "~/components/feedback/feedback-panel"
import type { loader } from "./route"
import { navItems } from "./constants"

export default function AppLayout() {
  const { hasLesplans, hasSchoolConfig, userName } = useLoaderData<typeof loader>()

  return (
    <OnboardingProvider hasLesplans={hasLesplans}>
    <div className="min-h-screen bg-[#f8f9ff] grid grid-cols-1 lg:grid-cols-[260px_1fr]">
      <NavigationProgress />

      {/* ── Mobile top header ── */}
      <header className="flex lg:hidden items-center justify-between px-4 h-14 bg-white shadow-[0px_1px_0px_rgba(199,196,215,0.5)]">
        <LesLabLogo />
        <MobileProfileButton userName={userName} />
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

        {/* Profile */}
        <div className="p-3 flex-shrink-0">
          <ProfilePopover userName={userName} />
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
    {!hasSchoolConfig && <SchoolConfigOnboarding />}
    <WelkomOverlay />
    <FeedbackPanel />
    </OnboardingProvider>
  )
}

/* ─── Profile Popover (desktop sidebar) ───────────────────── */

function ProfilePopover({
  userName,
}: {
  userName: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div ref={containerRef} className="relative">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 right-0 mb-1.5 bg-white rounded-xl shadow-[0px_12px_32px_rgba(11,28,48,0.15)] border border-[#eff4ff] overflow-hidden"
          >
            <div className="p-1.5">
              <Link
                to="/settings"
                prefetch="intent"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[#0b1c30] hover:bg-[#eff4ff] transition-colors"
              >
                <Settings className="w-4 h-4 text-[#5c5378]" />
                <span className="text-sm font-semibold">Instellingen</span>
              </Link>
              <a
                href="/auth/logout"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[#0b1c30] hover:bg-[#eff4ff] transition-colors"
              >
                <LogOut className="w-4 h-4 text-[#5c5378]" />
                <span className="text-sm font-semibold">Uitloggen</span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-[#eff4ff] transition-colors"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2a14b4] to-[#4338ca] flex items-center justify-center flex-shrink-0 shadow-[0px_2px_6px_rgba(42,20,180,0.2)]">
          <span className="text-[11px] font-bold text-white leading-none">{initials}</span>
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-sm font-semibold text-[#0b1c30] truncate">{userName}</p>
        </div>
        <ChevronUp className={[
          "w-4 h-4 text-[#8a91a5] transition-transform flex-shrink-0",
          isOpen ? "" : "rotate-180",
        ].join(" ")} />
      </button>
    </div>
  )
}

/* ─── Mobile profile button ───────────────────────────────── */

function MobileProfileButton({ userName }: { userName: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2a14b4] to-[#4338ca] flex items-center justify-center shadow-[0px_2px_6px_rgba(42,20,180,0.2)]"
        aria-label="Profiel"
      >
        <span className="text-[11px] font-bold text-white leading-none">{initials}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-1.5 w-48 bg-white rounded-xl shadow-[0px_12px_32px_rgba(11,28,48,0.15)] border border-[#eff4ff] overflow-hidden z-50"
          >
            <div className="px-3.5 py-3 border-b border-[#eff4ff]">
              <p className="text-sm font-semibold text-[#0b1c30] truncate">{userName}</p>
            </div>
            <div className="p-1.5">
              <Link
                to="/settings"
                prefetch="intent"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[#0b1c30] hover:bg-[#eff4ff] transition-colors"
              >
                <Settings className="w-4 h-4 text-[#5c5378]" />
                <span className="text-sm font-semibold">Instellingen</span>
              </Link>
              <a
                href="/auth/logout"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[#0b1c30] hover:bg-[#eff4ff] transition-colors"
              >
                <LogOut className="w-4 h-4 text-[#5c5378]" />
                <span className="text-sm font-semibold">Uitloggen</span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
