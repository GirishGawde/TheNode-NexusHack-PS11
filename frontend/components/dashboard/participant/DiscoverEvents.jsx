import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import EventCard from "./EventCard"
import JoinEventModal from "./JoinEventModal"
import api from "@/lib/axios"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function DiscoverEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
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
        .eq("status", "PUBLISHED")
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
          teamName: `Solo-${Math.floor(Math.random()*1000)}`,
          isSolo: true 
        })
      } else if (mode === "create") {
        await api.post("/api/teams/create", { 
          eventId: selectedEvent.id, 
          teamName: data.teamName 
        })
      } else if (mode === "join") {
        await api.post("/api/teams/join", { 
          inviteCode: data.inviteCode 
        })
      } else if (mode === "find") {
        // Will call AI match
        await api.post("/api/teams/find-ai-team", { eventId: selectedEvent.id })
      }
      
      // Refresh page to show in My Events
      window.location.reload()
    } catch (err) {
      alert(err.response?.data?.error || err.message)
    }
  }

  const filteredEvents = events.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.tagline && e.tagline.toLowerCase().includes(search.toLowerCase()))
  )

  if (loading) return <div className="py-12 text-center text-slate-400">Loading events...</div>

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input 
          className="pl-10 h-12 bg-[#1a1a2e]/50 border-white/10" 
          placeholder="Search hackathons by name, theme, or tech..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredEvents.length === 0 ? (
        <div className="py-12 text-center text-slate-400 border border-dashed border-white/10 rounded-xl">
          No hackathons found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(event => (
            <EventCard 
              key={event.id} 
              event={event} 
              actionLabel="Join Event"
              onJoin={setSelectedEvent} 
            />
          ))}
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
