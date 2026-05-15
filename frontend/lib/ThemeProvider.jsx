"use client"

import { createContext, useContext, useEffect, useState } from "react"

const ThemeContext = createContext({ theme: "dark", toggleTheme: () => {} })

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("dark")

  // On mount, read saved preference
  useEffect(() => {
    const saved = localStorage.getItem("nexushack-theme") || "dark"
    setTheme(saved)
    applyTheme(saved)
  }, [])

  const applyTheme = (t) => {
    const root = document.documentElement
    if (t === "light") {
      root.classList.add("light")
    } else {
      root.classList.remove("light")
    }
  }

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark"
      localStorage.setItem("nexushack-theme", next)
      applyTheme(next)
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
