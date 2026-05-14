'use client'
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import JudgeRegistration from "@/components/judge/JudgeRegistration"
import JudgeDashboard from "@/components/judge/JudgeDashboard"
import { Loader2 } from "lucide-react"

export default function JudgePage({ params }) {
  const { token } = params
  const [eventId, setEventId] = useState(null)
  const [eventName, setEventName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [judgeSession, setJudgeSession] = useState(null)
  const [theme, setTheme] = useState("dark")

  useEffect(() => {
    const saved = localStorage.getItem("judge_theme")
    if (saved) setTheme(saved)
    init()
  }, [token])

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    localStorage.setItem("judge_theme", next)
  }

  const init = async () => {
    setLoading(true)
    try {
      let decoded
      try {
        const standardBase64 = token.replace(/-/g, '+').replace(/_/g, '/').padEnd(token.length + (4 - token.length % 4) % 4, '=')
        decoded = JSON.parse(atob(standardBase64))
      } catch {
        throw new Error("Invalid or expired invite link. Please ask the organiser for a new one.")
      }
      const eid = decoded.eventId
      if (!eid) throw new Error("No event ID found in the invite link.")
      setEventId(eid)
      const { data: eventData, error: eventErr } = await supabase.from("events").select("name").eq("id", eid).single()
      if (eventErr) throw new Error("Event not found.")
      setEventName(eventData.name)
      const stored = localStorage.getItem(`judge_session_${eid}`)
      if (stored) setJudgeSession(JSON.parse(stored))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const dark = theme === "dark"
  const bg = dark ? "bg-black" : "bg-white"
  const text = dark ? "text-white" : "text-black"

  if (loading) return (
    <div className={`min-h-screen ${bg} flex items-center justify-center`}>
      <div className="text-center">
        <Loader2 className={`h-8 w-8 animate-spin mx-auto mb-3 ${dark ? "text-white" : "text-black"}`} />
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>Verifying invitation...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className={`min-h-screen ${bg} flex items-center justify-center p-6`}>
      <div className={`rounded-2xl p-8 text-center max-w-md border ${dark ? "border-gray-800 bg-gray-950" : "border-gray-200 bg-gray-50"}`}>
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className={`text-xl font-bold mb-2 ${text}`}>Invalid Invite Link</h2>
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>{error}</p>
      </div>
    </div>
  )

  if (!judgeSession) return (
    <JudgeRegistration eventId={eventId} eventName={eventName} inviteToken={token} onComplete={setJudgeSession} theme={theme} toggleTheme={toggleTheme} />
  )

  return (
    <JudgeDashboard eventId={eventId} judgeId={judgeSession.judgeId} judgeName={judgeSession.name}
      onLogout={() => { localStorage.removeItem(`judge_session_${eventId}`); setJudgeSession(null) }}
      theme={theme} toggleTheme={toggleTheme} />
  )
}
