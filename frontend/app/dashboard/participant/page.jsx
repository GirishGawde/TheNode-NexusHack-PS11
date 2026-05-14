"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import Navbar from "@/components/shared/Navbar"
import EventCard from "@/components/dashboard/participant/EventCard"
import DiscoverEvents from "@/components/dashboard/participant/DiscoverEvents"
import HistoryTab from "@/components/dashboard/participant/HistoryTab"
import AiMatchBanner from "@/components/dashboard/participant/AiMatchBanner"
import { useRouter } from "next/navigation"

export default function ParticipantDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("my-events")
  const [user, setUser] = useState(null)
  const [myEvents, setMyEvents] = useState([])
  const [poolEvents, setPoolEvents] = useState([]) // events user is in AI pool for
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/login/participant")
        return
      }

      setUser(session.user)

      const { data, error } = await supabase
        .from("event_registrations")
        .select("*, events(*)")
        .eq("user_id", session.user.id)
        
      if (error) throw error
      
      // Filter out ENDED events for "My Events" (they go to History)
      const activeEvents = (data || [])
        .map(reg => reg.events)
        .filter(event => event.status !== "ENDED")
        
      setMyEvents(activeEvents)

      // Also fetch any events the user is in the AI matchmaking pool for
      const { data: poolData } = await supabase
        .from('ai_matchmaking_pool')
        .select('event_id, status, events(id, name)')
        .eq('user_id', session.user.id)
        .in('status', ['SEARCHING', 'RECOMMENDATIONS_READY'])

      if (poolData) {
        // Only include pool events not already in myEvents
        const myEventIds = new Set(activeEvents.map(e => e.id))
        const poolOnlyEvents = poolData
          .map(p => p.events)
          .filter(e => e && !myEventIds.has(e.id))
        setPoolEvents(poolOnlyEvents)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const navigateToEvent = (event) => {
    router.push(`/event/${event.id}`)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <Navbar role="participant" />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-6">Participant Dashboard</h1>
          
          <div className="flex border-b border-white/10 space-x-8">
            <button
              onClick={() => setActiveTab("my-events")}
              className={`pb-4 text-sm font-medium transition-colors relative ${
                activeTab === "my-events" ? "text-violet-400" : "text-slate-400 hover:text-slate-300"
              }`}
            >
              My Events
              {activeTab === "my-events" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-400 rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("discover")}
              className={`pb-4 text-sm font-medium transition-colors relative ${
                activeTab === "discover" ? "text-violet-400" : "text-slate-400 hover:text-slate-300"
              }`}
            >
              Discover Events
              {activeTab === "discover" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-400 rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`pb-4 text-sm font-medium transition-colors relative ${
                activeTab === "history" ? "text-violet-400" : "text-slate-400 hover:text-slate-300"
              }`}
            >
              History
              {activeTab === "history" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-400 rounded-t-full" />
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">Loading dashboard...</div>
        ) : (
          <div>
            {activeTab === "my-events" && (
              <div className="space-y-6">
                {/* AI Matchmaking banners — for events in pool (not yet registered) */}
                {poolEvents.map(event => (
                  <AiMatchBanner key={`ai-pool-${event.id}`} eventId={event.id} eventName={event.name} />
                ))}

                {/* AI Matchmaking banners — for already-registered events (in case they re-searched) */}
                {myEvents.map(event => (
                  <AiMatchBanner key={`ai-${event.id}`} eventId={event.id} eventName={event.name} />
                ))}

                {myEvents.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-white/10 rounded-xl bg-white/5">
                    <p className="text-slate-400 mb-4">You haven't joined any active events yet.</p>
                    <button 
                      onClick={() => setActiveTab("discover")}
                      className="text-violet-400 font-medium hover:text-violet-300"
                    >
                      Browse available hackathons →
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myEvents.map(event => (
                      <EventCard 
                        key={event.id} 
                        event={event} 
                        actionLabel="Enter Event Room"
                        onJoin={navigateToEvent} 
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === "discover" && <DiscoverEvents registeredEventIds={myEvents.map(e => e.id)} />}
            
            {activeTab === "history" && <HistoryTab />}
          </div>
        )}
      </main>
    </div>
  )
}
