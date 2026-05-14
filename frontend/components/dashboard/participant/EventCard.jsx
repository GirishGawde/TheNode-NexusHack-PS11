import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Users, MapPin } from "lucide-react"

export default function EventCard({ event, onJoin, actionLabel = "View Event" }) {
  const isJoined = actionLabel !== "Join Event" && actionLabel !== "View Event"

  return (
    <Card className="flex flex-col h-full overflow-hidden border-white/10 hover:border-violet-500/50 transition-colors bg-[#1a1a2e]/50">
      <div 
        className="h-32 w-full bg-cover bg-center border-b border-white/10 relative"
        style={{ 
          backgroundImage: event.banner_url ? `url(${event.banner_url})` : "linear-gradient(to right, #4c1d95, #06b6d4)",
          backgroundColor: event.primary_color || "#7C3AED" 
        }}
      >
        {event.logo_url && (
          <div className="absolute -bottom-6 left-6 h-12 w-12 rounded-lg border-2 border-[#0A0A0F] overflow-hidden bg-[#0A0A0F]">
            <img src={event.logo_url} alt={event.name} className="h-full w-full object-cover" />
          </div>
        )}
      </div>
      
      <CardHeader className="pt-10">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-xl line-clamp-1">{event.name}</CardTitle>
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-white/10 text-slate-300 whitespace-nowrap">
            {event.status}
          </span>
        </div>
        <CardDescription className="line-clamp-2 mt-1">
          {event.tagline || event.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 space-y-3 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-violet-400" />
          <span>{new Date(event.start_date).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-cyan-400" />
          <span className="line-clamp-1">{event.venue_name || "Online"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-400" />
          <span>Team Size: {event.min_team_size} - {event.max_team_size}</span>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={() => onJoin(event)}
          disabled={actionLabel === "Join Event" && (event.status === "LIVE" || event.status === "ENDED")}
          variant={actionLabel === "Join Event" && (event.status === "LIVE" || event.status === "ENDED") ? "secondary" : "default"}
        >
          {actionLabel === "Join Event" && event.status === "LIVE" 
            ? "Registration Closed" 
            : actionLabel}
        </Button>
      </CardFooter>
    </Card>
  )
}
