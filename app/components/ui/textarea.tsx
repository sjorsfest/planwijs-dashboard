import * as React from "react"
import { cn } from "~/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full border-2 border-black bg-white px-3 py-2 text-sm font-medium transition-all placeholder:text-[#999] focus-visible:outline-none focus-visible:bg-[#fdf4c4] focus-visible:shadow-[2px_2px_0px_#000] disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
