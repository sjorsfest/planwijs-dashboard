import type { SVGProps } from "react"
import { Badge, type BadgeProps } from "~/components/ui/badge"
import { getSubjectIcon } from "~/lib/subject-metadata"
import { cn } from "~/lib/utils"

interface SubjectIconProps extends SVGProps<SVGSVGElement> {
  subjectName?: string | null
}

export function SubjectIcon({ subjectName, className, ...props }: SubjectIconProps) {
  const Icon = getSubjectIcon(subjectName)
  return <Icon className={cn("w-4 h-4", className)} {...props} />
}

interface SubjectBadgeProps extends Omit<BadgeProps, "children"> {
  subjectName?: string | null
  label?: string
}

export function SubjectBadge({ subjectName, label, className, variant = "default", ...props }: SubjectBadgeProps) {
  const displayLabel = label ?? subjectName ?? "Vak onbekend"

  return (
    <Badge variant={variant} className={cn("inline-flex items-center gap-1.5", className)} {...props}>
      <SubjectIcon subjectName={subjectName} className="w-3.5 h-3.5" />
      <span>{displayLabel}</span>
    </Badge>
  )
}
