import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, style, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={{
        background: "var(--bg-input)",
        border: "1px solid var(--border)",
        color: "var(--text-primary)",
        ...style,
      }}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
