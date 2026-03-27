import * as React from "react"
import { cn } from "~/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-xl bg-[#dce9ff] px-3 py-1 text-sm text-[#0b1c30] font-medium transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#464554]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2a14b4]/30 focus-visible:bg-[#d3e4fe] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
