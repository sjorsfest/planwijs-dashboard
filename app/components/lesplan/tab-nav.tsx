import type React from "react"

export const REVIEW_TABS = [
  { id: "overview", label: "Overzicht" },
  { id: "sequence", label: "Lessenreeks" },
  { id: "notes", label: "Docentnotities" },
] as const

export type ReviewTabId = (typeof REVIEW_TABS)[number]["id"]

export function LessonSeriesTabNav({
  activeTab,
  onChange,
}: {
  activeTab: ReviewTabId
  onChange: (tab: ReviewTabId) => void
}) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const currentIndex = REVIEW_TABS.findIndex((tab) => tab.id === activeTab)
    if (currentIndex < 0) return

    let nextIndex = currentIndex
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % REVIEW_TABS.length
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + REVIEW_TABS.length) % REVIEW_TABS.length
    if (event.key === "Home") nextIndex = 0
    if (event.key === "End") nextIndex = REVIEW_TABS.length - 1

    if (nextIndex === currentIndex) return
    event.preventDefault()
    const nextTab = REVIEW_TABS[nextIndex]
    onChange(nextTab.id)
    window.setTimeout(() => document.getElementById(`review-tab-${nextTab.id}`)?.focus(), 0)
  }

  return (
    <div className="sticky top-[57px] z-10 bg-[#f8f9ff]/90 backdrop-blur-sm border-b border-[#e8eeff]">
      <div
        role="tablist"
        aria-label="Lessenreeks review tabs"
        onKeyDown={handleKeyDown}
        className="px-8 py-2 max-w-5xl flex gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
      >
        {REVIEW_TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              id={`review-tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`review-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={[
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 whitespace-nowrap",
                isActive
                  ? "bg-gradient-to-br from-[#2a14b4] to-[#4338ca] text-white shadow-[0px_2px_8px_rgba(42,20,180,0.2)]"
                  : "text-[#5c5378] hover:text-[#0b1c30] hover:bg-[#eff4ff]",
              ].join(" ")}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function TabPanel({
  id,
  activeTab,
  children,
}: {
  id: ReviewTabId
  activeTab: ReviewTabId
  children: React.ReactNode
}) {
  return (
    <section
      id={`review-panel-${id}`}
      role="tabpanel"
      aria-labelledby={`review-tab-${id}`}
      hidden={activeTab !== id}
      className={activeTab === id ? "space-y-5" : "hidden"}
    >
      {children}
    </section>
  )
}
