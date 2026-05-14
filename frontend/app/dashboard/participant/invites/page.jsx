"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import Navbar from "@/components/shared/Navbar"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import api from "@/lib/axios"
import { Check, X, Inbox } from "lucide-react"

export default function InvitesInbox() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [invites, setInvites] = useState([])
  const [processingId, setProcessingId] = useState(null)
  
  useEffect(() => {
    fetchInvites()
  }, [])

  const fetchInvites = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/login/participant")
        return
      }

      const { data, error } = await supabase
        .from("team_invites")
        .select(`
          id,
          status,
          created_at,
          teams (
            id,
            name,
            events (
              id,
              name
            )
          ),
          sender:users!sender_id (
            name,
            email
          )
        `)
        .eq("receiver_id", session.user.id)
        .eq("status", "PENDING")
        .order("created_at", { ascending: false })
        
      if (error) throw error
      setInvites(data || [])
    } catch (err) {
      console.error("Failed to load invites", err)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (inviteId, action) => {
    setProcessingId(inviteId)
    try {
      if (action === 'accept') {
        await api.post('/api/teams/invite/accept', { inviteId })
      } else {
        await api.post('/api/teams/invite/reject', { inviteId })
      }
      // Remove from list
      setInvites(invites.filter(inv => inv.id !== inviteId))
    } catch (err) {
      alert(err.response?.data?.error || err.message)
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <Navbar role="participant" />
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-slate-400">Loading inbox...</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <Navbar role="participant" />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Team Invites</h1>
          <p className="text-slate-400">Manage invitations from other teams to join their ranks.</p>
        </div>

        <div className="bg-[#11111A] border border-white/10 rounded-xl p-6 sm:p-8 min-h-[50vh]">
          {invites.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center border border-dashed border-white/10 rounded-xl bg-white/5">
              <Inbox className="h-12 w-12 text-slate-500 mb-4" />
              <h3 className="text-lg font-medium text-white mb-1">Your inbox is empty</h3>
              <p className="text-slate-400 text-sm">You have no pending team invitations right now.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invites.map((invite) => (
                <div key={invite.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/5 border border-white/10 rounded-lg gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-medium text-white">
                        <span className="text-violet-400">{invite.teams?.name}</span> invited you
                      </h3>
                      {invite.sender?.name === "AI Matchmaker" || invite.is_ai_match ? (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">🤖 AI Match</span>
                      ) : null}
                    </div>
                    <p className="text-sm text-slate-400">
                      Event: <span className="text-slate-300">{invite.teams?.events?.name}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Sent by {invite.sender?.name}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <Button 
                      variant="outline" 
                      onClick={() => handleAction(invite.id, 'reject')}
                      disabled={processingId === invite.id}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Decline
                    </Button>
                    <Button 
                      onClick={() => handleAction(invite.id, 'accept')}
                      disabled={processingId === invite.id}
                      className="bg-violet-600 hover:bg-violet-700"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Accept
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
