"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import api from "@/lib/axios"
import Navbar from "@/components/shared/Navbar"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sparkles, Users, GraduationCap, Code2, Send, Loader2, CheckCircle, ArrowLeft } from "lucide-react"

export default function AiRecommendationsPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.eventId

  const [loading, setLoading] = useState(true)
  const [recommendations, setRecommendations] = useState([])
  const [eventName, setEventName] = useState("")
  const [maxTeamSize, setMaxTeamSize] = useState(4)
  const [invitesSent, setInvitesSent] = useState({}) // userId -> 'sending' | 'sent' | 'error'
  const [user, setUser] = useState(null)
  const [teamId, setTeamId] = useState(null)
  const [sentCount, setSentCount] = useState(0)

  useEffect(() => {
    loadData()
  }, [eventId])

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push("/login/participant"); return }
      setUser(session.user)

      // Get AI match status & recommendations
      const statusRes = await api.get(`/api/teams/ai-match/status/${eventId}`)
      if (statusRes.data.status !== 'RECOMMENDATIONS_READY') {
        router.push("/dashboard/participant")
        return
      }
      setRecommendations(statusRes.data.recommendations || [])

      // Get event info
      const { data: event } = await supabase
        .from("events")
        .select("name, max_team_size")
        .eq("id", eventId)
        .single()
      if (event) {
        setEventName(event.name)
        setMaxTeamSize(event.max_team_size || 4)
      }

      // Check if user already has a team for this event (leader of AI-created team)
      const { data: reg } = await supabase
        .from("event_registrations")
        .select("team_id")
        .eq("event_id", eventId)
        .eq("user_id", session.user.id)
        .single()
      if (reg?.team_id) setTeamId(reg.team_id)

    } catch (err) {
      console.error("Failed to load AI recommendations:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (rec) => {
    if (invitesSent[rec.userId]) return
    setInvitesSent(prev => ({ ...prev, [rec.userId]: 'sending' }))

    try {
      // If user doesn't have a team yet, create one first
      let currentTeamId = teamId
      if (!currentTeamId) {
        const createRes = await api.post("/api/teams/create", {
          eventId,
          teamName: `${user.user_metadata?.name || "AI"}'s Team`
        })
        currentTeamId = createRes.data.team.id
        setTeamId(currentTeamId)
      }

      // Send invite by fetching the recommended user's email
      const { data: targetUser } = await supabase
        .from("users")
        .select("email")
        .eq("id", rec.userId)
        .single()

      if (!targetUser?.email) throw new Error("Could not find user email")

      await api.post("/api/teams/invite/send", {
        teamId: currentTeamId,
        email: targetUser.email
      })

      setInvitesSent(prev => ({ ...prev, [rec.userId]: 'sent' }))
      setSentCount(c => c + 1)
    } catch (err) {
      setInvitesSent(prev => ({ ...prev, [rec.userId]: 'error' }))
      console.error("Failed to send invite:", err.response?.data?.error || err.message)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <Navbar role="participant" />
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    </div>
  )

  const maxInvitesReached = sentCount >= maxTeamSize - 1

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <Navbar role="participant" />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <button onClick={() => router.push("/dashboard/participant")}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Sparkles className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Teammate Recommendations</h1>
              <p className="text-slate-400 text-sm">{eventName}</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm mt-3">
            The AI analyzed skill sets and college proximity to suggest the most compatible teammates.
            Send invites to whoever you'd like — the <span className="text-white">first to accept</span> will join your team.
          </p>
          {maxInvitesReached && (
            <div className="mt-3 px-4 py-2 bg-violet-500/10 border border-violet-500/30 rounded-lg text-sm text-violet-300">
              ✅ You've sent the maximum number of invites ({sentCount}/{maxTeamSize - 1}). Wait for responses in your team!
            </div>
          )}
        </div>

        {recommendations.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/10 rounded-xl text-slate-400">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p>No recommendations yet. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec, idx) => {
              const inviteState = invitesSent[rec.userId]
              const canInvite = !inviteState && !maxInvitesReached
              return (
                <div key={rec.userId}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-[#1a1a2e]/50 border border-white/10 rounded-xl hover:border-white/20 transition-colors">
                  
                  {/* Rank Badge */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    idx === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' :
                    idx === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/40' :
                    'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                  }`}>
                    {idx + 1}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-medium">{rec.name}</h3>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        {rec.compatibilityScore}% match
                      </span>
                      {rec.lowConfidence && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                          Best available
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-2">
                      {rec.college && (
                        <span className="flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" /> {rec.college}
                        </span>
                      )}
                      {rec.skills?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Code2 className="h-3 w-3" /> {rec.skills.slice(0, 4).join(", ")}
                        </span>
                      )}
                    </div>

                    <p className="text-slate-400 text-xs italic">"{rec.reason}"</p>
                  </div>

                  {/* Invite Button */}
                  <div className="shrink-0">
                    {inviteState === 'sent' ? (
                      <div className="flex items-center gap-1.5 text-green-400 text-sm font-medium">
                        <CheckCircle className="h-4 w-4" /> Invited
                      </div>
                    ) : inviteState === 'sending' ? (
                      <Button disabled size="sm" className="bg-violet-600/50 w-24">
                        <Loader2 className="h-3 w-3 animate-spin" />
                      </Button>
                    ) : inviteState === 'error' ? (
                      <Button size="sm" onClick={() => { setInvitesSent(p => ({...p, [rec.userId]: null})); handleInvite(rec) }}
                        variant="outline" className="border-red-500/40 text-red-400 hover:bg-red-500/10 w-24 text-xs">
                        Retry
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => handleInvite(rec)} disabled={!canInvite}
                        className={`w-24 ${canInvite ? 'bg-violet-600 hover:bg-violet-700' : 'bg-white/5 text-slate-500 cursor-not-allowed'}`}>
                        <Send className="h-3 w-3 mr-1.5" />
                        Invite
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
