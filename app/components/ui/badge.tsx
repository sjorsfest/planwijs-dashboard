import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "~/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center border-2 border-black px-2 py-0.5 text-xs font-bold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-black text-white",
        secondary: "bg-[#e8e4d9] text-black",
        destructive: "bg-[#d63838] text-white border-[#8a1a1a]",
        outline: "bg-white text-black",
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
