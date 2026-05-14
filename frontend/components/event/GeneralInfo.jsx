import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Calendar, MapPin, Trophy, Users, CheckCircle2, QrCode, Mail, LogOut, Trash2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import api from "@/lib/axios"

export default function GeneralInfo({ event, team, user }) {
  const router = useRouter()
  const isLeader = team?.leader_id && user?.id && team.leader_id === user.id;
  
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMessage, setInviteMessage] = useState("")
  const [inviteError, setInviteError] = useState("")
  
  const [leaveLoading, setLeaveLoading] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)

  const handleLeaveClick = () => {
    setShowLeaveModal(true);
  }

  const confirmLeaveTeam = async () => {
    setLeaveLoading(true);
    try {
      await api.post("/api/teams/leave", { teamId: team.id });
      // Redirect to dashboard using window.location to force a fresh data fetch
      window.location.href = "/dashboard/participant";
    } catch (err) {
      alert(err.response?.data?.error || err.message);
      setLeaveLoading(false);
      setShowLeaveModal(false);
    }
  }

  const generateQR = async () => {
    // In a real implementation this would call the API to generate a QR pass
    alert("QR Pass generation would trigger here")
  }

  const sendInvite = async () => {
    if (!inviteEmail) return;
    setInviteLoading(true);
    setInviteMessage("");
    setInviteError("");
    try {
      await api.post("/api/teams/invite/send", {
        teamId: team.id,
        email: inviteEmail
      });
      setInviteMessage("Invite sent successfully!");
      setInviteEmail("");
    } catch (err) {
      setInviteError(err.response?.data?.error || err.message);
    } finally {
      setInviteLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-violet-400">About the Hackathon</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none">
            <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
              {event.description}
            </div>
            
            {event.tracks && event.tracks.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xl font-semibold text-white mb-4">Tracks & Themes</h3>
                <div className="flex flex-wrap gap-2">
                  {event.tracks.map((track, i) => (
                    <span key={i} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-cyan-400">
                      {track}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {event.prizes && Object.keys(event.prizes).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-violet-400 flex items-center gap-2">
                <Trophy className="h-6 w-6" /> Prizes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(event.prizes).map(([place, prize]) => (
                  <div key={place} className="p-4 bg-white/5 border border-white/10 rounded-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-yellow-400/20 to-transparent -mr-8 -mt-8 rounded-full blur-xl" />
                    <h4 className="font-bold text-lg text-white mb-1 capitalize">{place.replace('_', ' ')}</h4>
                    <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">
                      {prize}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 text-slate-300">
              <Calendar className="h-5 w-5 text-violet-400 shrink-0" />
              <div>
                <p className="font-medium text-white mb-1">Timeline</p>
                <p className="text-sm">Start: {new Date(event.start_date).toLocaleString()}</p>
                <p className="text-sm">End: {new Date(event.end_date).toLocaleString()}</p>
                <p className="text-sm text-yellow-400 mt-1">Submission: {new Date(event.submission_deadline).toLocaleString()}</p>
              </div>
            </div>
            
            <div className="h-px w-full bg-white/10" />
            
            <div className="flex gap-3 text-slate-300">
              <MapPin className="h-5 w-5 text-cyan-400 shrink-0" />
              <div>
                <p className="font-medium text-white mb-1">Venue</p>
                <p className="text-sm">{event.venue_name || "Online Event"}</p>
              </div>
            </div>

            <div className="h-px w-full bg-white/10" />
            
            <div className="flex gap-3 text-slate-300">
              <Users className="h-5 w-5 text-fuchsia-400 shrink-0" />
              <div>
                <p className="font-medium text-white mb-1">Team Size</p>
                <p className="text-sm">{event.min_team_size} to {event.max_team_size} members</p>
                {event.allow_solo && <p className="text-xs text-slate-400 mt-1">Solo participation allowed</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {team && (
          <Card className="border-violet-500/30 bg-violet-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl flex items-center gap-2">
                Your Team
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <h3 className="font-bold text-2xl text-white mb-1">{team.name}</h3>
              <p className="text-sm text-slate-400 mb-4 font-mono">Invite Code: <span className="text-violet-300">{team.invite_code}</span></p>
              
              {team.team_members && team.team_members.length > 0 && (
                <div className="mt-4 mb-4 space-y-3 border-t border-white/10 pt-4">
                  <h4 className="text-sm font-medium text-slate-300">Team Members</h4>
                  <div className="space-y-2">
                    {team.team_members.map(member => (
                      <div key={member.id} className="flex items-center gap-3">
                        {member.users?.profile_picture_url ? (
                          <img src={member.users.profile_picture_url} alt="Profile" className="w-8 h-8 rounded-full border border-white/10 object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-xs font-medium">
                            {member.users?.name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-white">
                            {member.users?.name || 'Unknown User'} 
                            {team.leader_id === member.user_id && <span className="text-xs text-violet-400 ml-1">(Leader)</span>}
                          </p>
                          <p className="text-xs text-slate-400">{member.users?.email || 'No email'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isLeader && (
                <div className="space-y-4 mt-2">
                  <div className="pt-4 border-t border-white/10">
                    <h4 className="text-sm font-medium mb-2 text-slate-300">Direct Invite</h4>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Player's email address" 
                        value={inviteEmail} 
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="bg-black/20 text-sm h-9"
                      />
                      <Button size="sm" onClick={sendInvite} disabled={inviteLoading || !inviteEmail} className="bg-violet-600 hover:bg-violet-700">
                        {inviteLoading ? "..." : <Mail className="w-4 h-4" />}
                      </Button>
                    </div>
                    {inviteMessage && <p className="text-xs mt-2 text-green-400">{inviteMessage}</p>}
                    {inviteError && <p className="text-xs mt-2 text-red-400">{inviteError}</p>}
                  </div>

                  <Button className="w-full gap-2 bg-white/10 hover:bg-white/20 text-white" onClick={generateQR}>
                    <QrCode className="h-4 w-4" /> Generate QR Pass
                  </Button>
                </div>
              )}

              {/* Leave / Delete Team Button */}
              <Button 
                variant="outline"
                className={`w-full mt-4 gap-2 ${isLeader ? 'border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300' : 'border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300'}`} 
                onClick={handleLeaveClick}
                disabled={leaveLoading}
              >
                {isLeader ? (
                  <><Trash2 className="h-4 w-4" /> Delete Team</>
                ) : (
                  <><LogOut className="h-4 w-4" /> Leave Team</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Custom Modal for Leave Team */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#11111A] border border-white/10 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-orange-400">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-xl font-bold text-white">{isLeader ? 'Delete Team' : 'Leave Team'}</h3>
            </div>
            <p className="text-slate-300 mb-6">
              {isLeader 
                ? "Are you sure you want to delete this team? All members will be removed and everyone will have to join a new team." 
                : "Are you sure you want to leave this team? Your event registration will be removed and you will have to join a new team."}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowLeaveModal(false)} disabled={leaveLoading}>
                Cancel
              </Button>
              <Button 
                className={isLeader ? "bg-red-600 hover:bg-red-700 text-white" : "bg-orange-600 hover:bg-orange-700 text-white"} 
                onClick={confirmLeaveTeam} 
                disabled={leaveLoading}
              >
                {leaveLoading ? "Processing..." : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
