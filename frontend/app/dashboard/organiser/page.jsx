"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import Navbar from "@/components/shared/Navbar"
import EventCard from "@/components/dashboard/organiser/EventCard"
import CreateEventModal from "@/components/dashboard/organiser/CreateEventModal"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function OrganiserDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/login/organiser")
        return
      }

      setUser(session.user)
      fetchEvents(session.user.id)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const fetchEvents = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*, event_registrations(count)")
        .eq("organiser_id", userId)
        .order("created_at", { ascending: false })
        
      if (error) throw error
      setEvents(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const navigateToManage = (event) => {
    router.push(`/organiser/event/${event.id}`)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <Navbar role="organiser" />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Organiser Dashboard</h1>
            <p className="text-slate-400">Manage your hackathons and technical events.</p>
          </div>
          
          <Button 
            onClick={() => setShowCreateModal(true)} 
            className="bg-cyan-600 hover:bg-cyan-700 gap-2 w-full sm:w-auto"
          >
            <Plus className="h-5 w-5" /> Create New Event
          </Button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">Loading events...</div>
        ) : (
          <div className="space-y-6">
            {events.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-white/10 rounded-xl bg-white/5 flex flex-col items-center">
                <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mb-4">
                  <Plus className="h-8 w-8 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Events Yet</h3>
                <p className="text-slate-400 max-w-md mb-6">
                  You haven't created any events yet. Host your first hackathon by creating a new event.
                </p>
                <Button onClick={() => setShowCreateModal(true)} className="bg-cyan-600 hover:bg-cyan-700">
                  Create Your First Event
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map(event => (
                  <EventCard 
                    key={event.id} 
                    event={event} 
                    onManage={navigateToManage} 
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {showCreateModal && (
        <CreateEventModal 
          onClose={() => setShowCreateModal(false)} 
          onCreated={() => {
            setShowCreateModal(false)
            fetchEvents(user.id)
          }} 
        />
      )}
    </div>
  )
}
