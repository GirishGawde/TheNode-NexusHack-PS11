"use client"

import { useTheme } from "@/lib/ThemeProvider"
import { Sun, Moon } from "lucide-react"

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        width: "48px",
        height: "48px",
        borderRadius: "50%",
        border: "2px solid var(--accent)",
        background: "var(--bg-card)",
        color: "var(--accent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "none",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "var(--accent)"
        e.currentTarget.style.color = "var(--text-on-accent)"
        e.currentTarget.style.boxShadow = "none"
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "var(--bg-card)"
        e.currentTarget.style.color = "var(--accent)"
        e.currentTarget.style.boxShadow = "none"
      }}
    >
      {theme === "dark"
        ? <Sun  size={20} strokeWidth={2} />
        : <Moon size={20} strokeWidth={2} />
      }
    </button>
  )
}
