import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import EventCard from "./EventCard"
import JoinEventModal from "./JoinEventModal"
import api from "@/lib/axios"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "react-hot-toast"

export default function DiscoverEvents({ registeredEventIds = [] }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showAll, setShowAll] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .in("status", ["PUBLISHED", "ONGOING", "LIVE"])
        .order("created_at", { ascending: false })
      
      if (error) throw error
      setEvents(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinAction = async (mode, data) => {
    try {
      if (mode === "solo") {
        await api.post("/api/teams/create", { 
          eventId: selectedEvent.id, 
          teamName: data.teamName,
          isSolo: true 
        })
        window.location.reload()
      } else if (mode === "create") {
        await api.post("/api/teams/create", { 
          eventId: selectedEvent.id, 
          teamName: data.teamName 
        })
        window.location.reload()
      } else if (mode === "join") {
        await api.post("/api/teams/join", { 
          inviteCode: data.inviteCode 
        })
        window.location.reload()
      } else if (mode === "find") {
        // Join AI matchmaking pool — don't reload, return status to modal
        try {
          const res = await api.post("/api/teams/find-ai-team", { eventId: selectedEvent.id })
          return res.data // { status: 'SEARCHING', poolDeadline }
        } catch (findErr) {
          // If already in pool, treat it as success (show searching state)
          if (findErr.response?.data?.error?.includes('already in the matchmaking pool')) {
            const statusRes = await api.get(`/api/teams/ai-match/status/${selectedEvent.id}`)
            return statusRes.data
          }
          throw findErr
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message)
    }
  }

  const filteredEvents = events.filter(e => {
    const isJoined = registeredEventIds.includes(e.id);
    const isJoinable = e.status !== "LIVE" && e.status !== "ENDED" && !isJoined;
    
    // Hide events if we are only showing open registrations and the event isn't joinable
    if (!showAll && !isJoinable) return false;

    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
                          (e.tagline && e.tagline.toLowerCase().includes(search.toLowerCase()));
                          
    return matchesSearch;
  })

  if (loading) return <div className="py-12 text-center text-slate-400">Loading events...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input 
            className="pl-10 h-12 bg-[#1a1a2e]/50 border-white/10" 
            placeholder="Search hackathons by name, theme, or tech..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center p-1 bg-[#1a1a2e]/50 border border-white/10 rounded-lg w-full md:w-auto">
          <button
            onClick={() => setShowAll(false)}
            className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-md transition-colors ${!showAll ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}
          >
            Open for Registration
          </button>
          <button
            onClick={() => setShowAll(true)}
            className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-md transition-colors ${showAll ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}
          >
            All Events
          </button>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="py-12 text-center text-slate-400 border border-dashed border-white/10 rounded-xl">
          No hackathons found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(event => {
            const isJoined = registeredEventIds.includes(event.id);
            return (
              <EventCard 
                key={event.id} 
                event={event} 
                actionLabel={isJoined ? "Enter Event Room" : "Join Event"}
                onJoin={isJoined ? () => window.location.href=`/event/${event.id}` : setSelectedEvent} 
              />
            )
          })}
        </div>
      )}

      {selectedEvent && (
        <JoinEventModal 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)}
          onJoin={handleJoinAction}
        />
      )}
    </div>
  )
}
