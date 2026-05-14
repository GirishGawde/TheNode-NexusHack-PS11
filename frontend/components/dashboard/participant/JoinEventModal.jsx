import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, UserPlus, Users, Search, Sparkles } from "lucide-react"

export default function JoinEventModal({ event, onClose, onJoin }) {
  const [mode, setMode] = useState(null) // 'solo', 'create', 'join', 'find'
  const [teamName, setTeamName] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [loading, setLoading] = useState(false)

  const handleAction = async (e) => {
    e.preventDefault()
    setLoading(true)
    await onJoin(mode, { teamName, inviteCode })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0A0A0F] border border-white/10 rounded-xl w-full max-w-md overflow-hidden shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="p-6 pb-0">
          <h2 className="text-2xl font-bold text-white mb-2">{event.name}</h2>
          <p className="text-slate-400 text-sm mb-6">How would you like to participate?</p>
        </div>

        {!mode ? (
          <div className="p-6 pt-0 grid grid-cols-1 gap-3">
            {event.allow_solo && (
              <Button 
                variant="outline" 
                className="h-auto py-4 justify-start gap-4 hover:bg-white/5 hover:border-violet-500/50"
                onClick={() => setMode('solo')}
              >
                <div className="bg-violet-500/20 p-2 rounded-full">
                  <UserPlus className="h-5 w-5 text-violet-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-white">Go Solo</div>
                  <div className="text-xs text-slate-400 font-normal">Participate on your own</div>
                </div>
              </Button>
            )}

            <Button 
              variant="outline" 
              className="h-auto py-4 justify-start gap-4 hover:bg-white/5 hover:border-cyan-500/50"
              onClick={() => setMode('create')}
            >
              <div className="bg-cyan-500/20 p-2 rounded-full">
                <Users className="h-5 w-5 text-cyan-400" />
              </div>
              <div className="text-left">
                <div className="font-medium text-white">Create Team</div>
                <div className="text-xs text-slate-400 font-normal">Form a new team and invite others</div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto py-4 justify-start gap-4 hover:bg-white/5 hover:border-blue-500/50"
              onClick={() => setMode('join')}
            >
              <div className="bg-blue-500/20 p-2 rounded-full">
                <Search className="h-5 w-5 text-blue-400" />
              </div>
              <div className="text-left">
                <div className="font-medium text-white">Join via Invite Code</div>
                <div className="text-xs text-slate-400 font-normal">Enter a code given by your team leader</div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto py-4 justify-start gap-4 hover:bg-white/5 hover:border-fuchsia-500/50"
              onClick={() => setMode('find')}
            >
              <div className="bg-fuchsia-500/20 p-2 rounded-full">
                <Sparkles className="h-5 w-5 text-fuchsia-400" />
              </div>
              <div className="text-left">
                <div className="font-medium text-white">Find Team with AI</div>
                <div className="text-xs text-slate-400 font-normal">Let AI match you with compatible participants</div>
              </div>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleAction} className="p-6 pt-0 space-y-4">
            {mode === 'create' && (
              <div className="space-y-2">
                <Label>Team Name</Label>
                <Input 
                  value={teamName} 
                  onChange={(e) => setTeamName(e.target.value)} 
                  placeholder="e.g. Code Ninjas"
                  required 
                />
              </div>
            )}

            {mode === 'join' && (
              <div className="space-y-2">
                <Label>Invite Code</Label>
                <Input 
                  value={inviteCode} 
                  onChange={(e) => setInviteCode(e.target.value)} 
                  placeholder="e.g. A1B2C3D4"
                  required 
                  className="uppercase tracking-widest font-mono"
                />
              </div>
            )}

            {mode === 'solo' && (
              <p className="text-slate-300 text-sm">
                You are about to register for this event as a solo participant. You can always form a team later before the deadline.
              </p>
            )}

            {mode === 'find' && (
              <p className="text-slate-300 text-sm">
                We will analyze your profile skills and find the best teams that are looking for your expertise.
              </p>
            )}

            <div className="flex gap-3 pt-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setMode(null)} className="flex-1">
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Processing..." : "Confirm"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
