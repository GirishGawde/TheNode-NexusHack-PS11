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
  const [aiResult, setAiResult] = useState(null) // { poolDeadline }

  const handleAction = async (e) => {
    e.preventDefault()
    setLoading(true)
    const result = await onJoin(mode, { teamName, inviteCode })
    if (mode === 'find' && result?.status === 'SEARCHING') {
      setAiResult(result)
    }
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
            {(mode === 'create' || mode === 'solo') && (
              <div className="space-y-2">
                <Label>{mode === 'solo' ? 'Solo Team Name' : 'Team Name'}</Label>
                <Input 
                  value={teamName} 
                  onChange={(e) => setTeamName(e.target.value)} 
                  placeholder={mode === 'solo' ? "e.g. Lone Wolf" : "e.g. Code Ninjas"}
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

            {mode === 'find' && !aiResult && (
              <div className="space-y-3">
                <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-violet-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white text-sm font-medium mb-1">How AI Matching Works</p>
                      <ul className="text-slate-400 text-xs space-y-1">
                        <li>• Your skills and college are used to find compatible teammates</li>
                        <li>• AI will notify you when quality recommendations are ready</li>
                        <li>• You choose who to invite — no one is auto-added</li>
                        <li>• First to accept fills the team (others auto-declined)</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <p className="text-slate-400 text-xs text-center">You can cancel the search anytime from your dashboard</p>
              </div>
            )}

            {mode === 'find' && aiResult && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                <div className="text-green-400 text-2xl mb-2">🤖</div>
                <p className="text-white font-medium mb-1">AI is searching for your team!</p>
                <p className="text-slate-400 text-xs">Check your dashboard for updates. We'll notify you when recommendations are ready.</p>
              </div>
            )}

            <div className="flex gap-3 pt-2 mt-4">
              {aiResult ? (
                // After AI search started — show a single 'Go to My Events' button
                <Button type="button" className="flex-1 bg-violet-600 hover:bg-violet-700" onClick={onClose}>
                  Go to My Events →
                </Button>
              ) : (
                <>
                  <Button type="button" variant="ghost" onClick={() => setMode(null)} className="flex-1">
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading
                      ? "Processing..."
                      : mode === 'find'
                        ? "🤖 Start AI Search"
                        : "Confirm"}
                  </Button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
