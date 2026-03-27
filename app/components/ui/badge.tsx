import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "~/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[#2a14b4]/10 text-[#2a14b4]",
        secondary: "bg-[#ab8ffe] text-[#3f1e8c]",
        destructive: "bg-[#fecaca] text-[#ba1a1a]",
        outline: "bg-[#eff4ff] text-[#464554]",
        tertiary: "bg-[#ffdf9f] text-[#4c3700]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
