import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

const buttonVariants = {
  base: "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40",
  primary:   "bg-[var(--accent)] text-[var(--text-on-accent)] hover:bg-[var(--accent-hover)]",
  secondary: "bg-[var(--bg-card2)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)]",
  danger:    "bg-red-600 text-white hover:bg-red-700",
  ghost:     "text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]",
  outline:   "border border-[var(--border)] bg-transparent text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)]",
}

const sizes = {
  default: "h-10 px-4 py-2",
  sm:      "h-9 rounded-md px-3",
  lg:      "h-11 rounded-md px-8",
  icon:    "h-10 w-10",
}

const Button = React.forwardRef(({ className, variant = "primary", size = "default", asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants.base, buttonVariants[variant], sizes[size], className)}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button }
