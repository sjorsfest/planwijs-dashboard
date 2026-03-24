import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "~/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold transition-all duration-100 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer border-2 border-black",
  {
    variants: {
      variant: {
        default:
          "bg-black text-white shadow-[3px_3px_0px_#555] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0px_#555] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        destructive:
          "bg-[#d63838] text-white shadow-[3px_3px_0px_#8a1a1a] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0px_#8a1a1a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        outline:
          "bg-white text-black shadow-[3px_3px_0px_#000] hover:bg-[#fdf4c4] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        secondary:
          "bg-[#e8e4d9] text-black shadow-[3px_3px_0px_#000] hover:bg-[#fdf4c4] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        ghost: "border-transparent shadow-none hover:bg-[#fdf4c4] hover:border-black",
        link: "border-transparent shadow-none underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-8 text-base",
        icon: "h-9 w-9",
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
