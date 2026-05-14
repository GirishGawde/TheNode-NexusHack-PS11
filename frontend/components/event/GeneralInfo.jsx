import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Calendar, MapPin, Trophy, Users, CheckCircle2, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GeneralInfo({ event, team }) {
  const isLeader = team?.leader_id && team?.leader_id !== null // simplified check, normally compare with user.id

  const generateQR = async () => {
    // In a real implementation this would call the API to generate a QR pass
    alert("QR Pass generation would trigger here")
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
              
              {isLeader && (
                <Button className="w-full mt-2 gap-2 bg-white/10 hover:bg-white/20 text-white" onClick={generateQR}>
                  <QrCode className="h-4 w-4" /> Generate QR Pass
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
