import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "~/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2a14b4]/40 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-[#2a14b4] to-[#4338ca] text-white shadow-[0px_4px_16px_rgba(42,20,180,0.25)] hover:shadow-[0px_8px_24px_rgba(42,20,180,0.35)] hover:brightness-110 active:brightness-95",
        destructive:
          "bg-[#ba1a1a] text-white shadow-[0px_4px_12px_rgba(186,26,26,0.25)] hover:shadow-[0px_8px_20px_rgba(186,26,26,0.35)] hover:brightness-110 active:brightness-95",
        outline:
          "bg-[#dce9ff] text-[#0b1c30] hover:bg-[#d3e4fe] active:bg-[#cad9fb]",
        secondary:
          "bg-[#ab8ffe] text-[#3f1e8c] hover:brightness-105 active:brightness-95 shadow-[0px_4px_12px_rgba(171,143,254,0.3)]",
        ghost:
          "text-[#2a14b4] hover:bg-[#2a14b4]/8 active:bg-[#2a14b4]/12",
        link:
          "text-[#2a14b4] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 rounded-xl",
        sm: "h-8 px-3 text-xs rounded-lg",
        lg: "h-11 px-8 text-base rounded-xl",
        icon: "h-9 w-9 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
