"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import api from "@/lib/axios"
import { Sparkles, X, CheckCircle, XCircle, Loader2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "react-hot-toast"

export default function AiMatchBanner({ eventId, eventName }) {
  const router = useRouter()
  const [status, setStatus] = useState(null) // null = loading, 'NOT_IN_POOL' = hide
  const [poolDeadline, setPoolDeadline] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const intervalRef = useRef(null)

  const poll = async () => {
    try {
      const res = await api.get(`/api/teams/ai-match/status/${eventId}`)
      setStatus(res.data.status)
      setPoolDeadline(res.data.poolDeadline)
    } catch {
      // Silently fail polls
    }
  }

  useEffect(() => {
    poll()
    // Poll every 30 seconds (DB only, no AI cost)
    intervalRef.current = setInterval(poll, 30_000)
    return () => clearInterval(intervalRef.current)
  }, [eventId])

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await api.post(`/api/teams/ai-match/cancel/${eventId}`)
      setStatus('CANCELLED')
      clearInterval(intervalRef.current)
      window.location.reload()
    } catch (err) {
      toast.error(err.response?.data?.error || err.message)
    } finally {
      setCancelling(false)
    }
  }

  const formatDeadline = (deadline) => {
    if (!deadline) return ""
    const d = new Date(deadline)
    const now = new Date()
    const diffMs = d - now
    if (diffMs <= 0) return "soon"
    const hours = Math.floor(diffMs / 3600000)
    const mins = Math.floor((diffMs % 3600000) / 60000)
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  if (!status || status === 'NOT_IN_POOL' || status === 'CANCELLED' || status === 'MATCHED') return null

  const configs = {
    SEARCHING: {
      icon: <Loader2 className="h-4 w-4 animate-spin text-violet-400" />,
      bg: "bg-violet-500/10 border-violet-500/30",
      text: "text-violet-300",
      message: `🤖 AI is searching for your ideal teammates for ${eventName}`,
      sub: poolDeadline ? `Search ends in ${formatDeadline(poolDeadline)}` : "Searching...",
      action: (
        <Button variant="ghost" size="sm" onClick={handleCancel} disabled={cancelling}
          className="text-slate-400 hover:text-white h-7 px-3 text-xs shrink-0">
          {cancelling ? <Loader2 className="h-3 w-3 animate-spin" /> : <><X className="h-3 w-3 mr-1" />Cancel</>}
        </Button>
      )
    },
    RECOMMENDATIONS_READY: {
      icon: <Sparkles className="h-4 w-4 text-cyan-400" />,
      bg: "bg-cyan-500/10 border-cyan-500/30",
      text: "text-cyan-300",
      message: `✨ AI found compatible teammates for ${eventName}!`,
      sub: "View your recommendations and send invites",
      action: (
        <div className="flex gap-2 shrink-0">
          <Button size="sm" onClick={() => router.push(`/dashboard/participant/ai-match/${eventId}`)}
            className="bg-cyan-600 hover:bg-cyan-700 h-7 px-3 text-xs">
            <Users className="h-3 w-3 mr-1" />View Recommendations
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCancel} disabled={cancelling}
            className="text-slate-400 hover:text-white h-7 px-3 text-xs">
            {cancelling ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
          </Button>
        </div>
      )
    },
    EXPIRED: {
      icon: <XCircle className="h-4 w-4 text-red-400" />,
      bg: "bg-red-500/10 border-red-500/30",
      text: "text-red-300",
      message: `❌ Couldn't find enough teammates for ${eventName}`,
      sub: "You can now join or create a team manually",
      action: (
        <Button variant="ghost" size="sm" onClick={() => setStatus('NOT_IN_POOL')}
          className="text-slate-400 hover:text-white h-7 px-3 text-xs shrink-0">
          <X className="h-3 w-3" />
        </Button>
      )
    }
  }

  const cfg = configs[status]
  if (!cfg) return null

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${cfg.bg} mb-4`}>
      {cfg.icon}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${cfg.text} truncate`}>{cfg.message}</p>
        <p className="text-xs text-slate-500">{cfg.sub}</p>
      </div>
      {cfg.action}
    </div>
  )
}
