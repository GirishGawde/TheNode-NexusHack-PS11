import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Users, Settings } from "lucide-react"

export default function EventCard({ event, onManage }) {
  const participantCount = event.event_registrations?.[0]?.count || 0

  return (
    <Card className="flex flex-col h-full overflow-hidden border-white/10 hover:border-cyan-500/50 transition-colors bg-[#1a1a2e]/50">
      <div 
        className="h-32 w-full bg-cover bg-center border-b border-white/10 relative"
        style={{ 
          backgroundImage: event.banner_url ? `url(${event.banner_url})` : "linear-gradient(to right, #083344, #06b6d4)",
          backgroundColor: event.primary_color || "#06B6D4" 
        }}
      >
        {event.logo_url && (
          <div className="absolute -bottom-6 left-6 h-12 w-12 rounded-lg border-2 border-[#0A0A0F] overflow-hidden bg-[#0A0A0F]">
            <img src={event.logo_url} alt={event.name} className="h-full w-full object-cover" />
          </div>
        )}
      </div>
      
      <CardHeader className="pt-10 pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-xl line-clamp-1 text-white">{event.name}</CardTitle>
          <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded-full whitespace-nowrap ${
            event.status === 'DRAFT' ? 'bg-slate-500/20 text-slate-400' :
            event.status === 'PUBLISHED' ? 'bg-blue-500/20 text-blue-400' :
            event.status === 'LIVE' ? 'bg-green-500/20 text-green-400' :
            'bg-slate-600/20 text-slate-500'
          }`}>
            {event.status}
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 space-y-3 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-cyan-400" />
          <span>{new Date(event.start_date).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-violet-400" />
          <span>{participantCount} Registered</span>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          className="w-full bg-cyan-600 hover:bg-cyan-700 gap-2" 
          onClick={() => onManage(event)}
        >
          <Settings className="h-4 w-4" /> Manage Event
        </Button>
      </CardFooter>
    </Card>
  )
}
