import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import api from "@/lib/axios"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, Copy, CheckCircle2, ShieldAlert } from "lucide-react"

export default function JudgingPanel({ eventId }) {
  const [judges, setJudges] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [inviteLink, setInviteLink] = useState("")

  useEffect(() => {
    fetchJudges()
  }, [eventId])

  const fetchJudges = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("judge_assignments")
        .select(`
          id,
          users(name, email, profile_picture_url)
        `)
        .eq("event_id", eventId)
        
      if (error) throw error
      setJudges(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateInvite = async () => {
    setInviting(true)
    try {
      // In a real app, we'd store a token in DB. For now, generate a secure link
      const token = btoa(JSON.stringify({ eventId, timestamp: Date.now() }))
      const link = `${window.location.origin}/judge/${token}`
      setInviteLink(link)
      
      // If email is provided, send it via API
      if (inviteEmail) {
        await api.post("/api/events/invite-judge", {
          eventId,
          email: inviteEmail,
          link
        })
        alert(`Invite sent to ${inviteEmail}`)
        setInviteEmail("")
      }
    } catch (err) {
      alert("Failed to generate invite: " + err.message)
    } finally {
      setInviting(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink)
    alert("Link copied to clipboard!")
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 bg-[#1a1a2e]/50 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-white/10 mb-4">
          <CardTitle className="text-xl">Assigned Judges</CardTitle>
          <div className="flex items-center gap-2 text-sm text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full">
            <Users className="h-4 w-4" />
            {judges.length} Judges
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-slate-400 py-8">Loading judges...</div>
          ) : judges.length === 0 ? (
            <div className="text-center text-slate-400 py-12 border border-dashed border-white/10 rounded-xl bg-white/5">
              <ShieldAlert className="h-12 w-12 mx-auto text-slate-500 mb-4 opacity-50" />
              <p>No judges assigned yet.</p>
              <p className="text-sm mt-2">Generate an invite link to add judges to your event.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {judges.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-cyan-900/50 flex items-center justify-center text-white border border-cyan-500/30 overflow-hidden">
                      {assignment.users?.profile_picture_url ? (
                        <img src={assignment.users.profile_picture_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        assignment.users?.name?.charAt(0) || "J"
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{assignment.users?.name || "Pending Judge"}</h4>
                      <p className="text-sm text-slate-400">{assignment.users?.email || "Email hidden"}</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#1a1a2e]/50 border-white/10 h-fit">
        <CardHeader>
          <CardTitle>Invite Judges</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Send via Email</Label>
            <Input 
              type="email"
              value={inviteEmail} 
              onChange={(e) => setInviteEmail(e.target.value)} 
              placeholder="judge@company.com"
            />
          </div>
          
          <Button 
            onClick={handleGenerateInvite} 
            disabled={inviting}
            className="w-full bg-cyan-600 hover:bg-cyan-700"
          >
            {inviting ? "Generating..." : inviteEmail ? "Send Invite" : "Generate Link Only"}
          </Button>

          {inviteLink && (
            <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
              <Label className="text-green-400">Invite Link Generated!</Label>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="bg-black/40 border-white/20 font-mono text-xs" />
                <Button size="icon" variant="outline" onClick={copyLink} title="Copy Link">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-400">Anyone with this link can register as a judge for this event.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
