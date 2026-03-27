import { cn } from "~/lib/utils"

type LesLabLogoProps = {
  tone?: "light" | "dark"
  showSubtitle?: boolean
  className?: string
}

export function LesLabLogo({
  tone = "light",
  showSubtitle = true,
  className,
}: LesLabLogoProps) {
  const isDark = tone === "dark"

  return (
    <div className={cn("flex items-center gap-3.5", className)}>
      <div className="relative flex h-10 w-10 items-center justify-center">
        <div
          className={cn(
            "absolute h-9 w-9 rounded-2xl border",
            isDark ? "border-white/20 bg-white/10" : "border-teal-500/20 bg-teal-500/10"
          )}
        />
        <div
          className={cn(
            "absolute right-1 top-1 h-8 w-8 rounded-xl shadow-inner",
            isDark ? "bg-white/20" : "bg-teal-500/30"
          )}
        />

        <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#2a14b4] to-[#4338ca] p-1 shadow-lg shadow-indigo-100">
          <div className="grid h-4 w-4 grid-cols-2 grid-rows-2 gap-0.5 text-white/90">
            <div className="rounded-sm bg-white" />
            <div className="rounded-sm bg-white/60" />
            <div className="rounded-sm bg-white" />
            <div className="rounded-sm bg-white" />
          </div>
        </div>
      </div>

      <div className="flex flex-col leading-tight">
        <span className={cn("text-xl font-bold tracking-tight", isDark ? "text-white" : "text-[#0b1c30]")}>
          Les<span className={cn("font-semibold", isDark ? "text-[#f9bd22]" : "text-[#2a14b4]")}>Lab</span>
        </span>
        {showSubtitle && (
          <span className={cn("mt-0.5 text-xs font-medium", isDark ? "text-white/65" : "text-[#5c5378]")}>
            Voortgezet Onderwijs
          </span>
        )}
      </div>
    </div>
  )
}
