"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import Navbar from "@/components/shared/Navbar"
import CountdownTimer from "@/components/event/CountdownTimer"
import GeneralInfo from "@/components/event/GeneralInfo"
import AnnouncementFeed from "@/components/event/AnnouncementFeed"
import TeamChat from "@/components/event/TeamChat"
import Leaderboard from "@/components/event/Leaderboard"
import SubmissionVault from "@/components/event/SubmissionVault"

export default function EventRoom({ params }) {
  const { eventId } = params
  const [event, setEvent] = useState(null)
  const [user, setUser] = useState(null)
  const [team, setTeam] = useState(null)
  const [activeTab, setActiveTab] = useState("general")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [eventId])

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
      }

      // Fetch Event Data
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*, rubric_criteria(*)")
        .eq("id", eventId)
        .single()
        
      if (eventError) throw eventError
      setEvent(eventData)

      // Fetch Team Data
      if (session) {
        const { data: regData } = await supabase
          .from("event_registrations")
          .select(`
            team_id, 
            teams(
              *,
              team_members(
                *,
                users(
                  id,
                  name,
                  email,
                  profile_picture_url
                )
              )
            )
          `)
          .eq("event_id", eventId)
          .eq("user_id", session.user.id)
          .single()
          
        if (regData?.teams) {
          setTeam(regData.teams)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-[#0A0A0F] text-white flex items-center justify-center">Loading event room...</div>
  }

  if (!event) {
    return <div className="min-h-screen bg-[#0A0A0F] text-white flex items-center justify-center">Event not found.</div>
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col">
      <Navbar role="participant" />
      
      {/* Event Header */}
      <div 
        className="h-48 md:h-64 relative bg-cover bg-center border-b border-white/10"
        style={{ 
          backgroundImage: event.banner_url ? `url(${event.banner_url})` : "linear-gradient(to right, #4c1d95, #06b6d4)",
          backgroundColor: event.primary_color || "#7C3AED" 
        }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center gap-6">
            {event.logo_url && (
              <div className="h-24 w-24 md:h-32 md:w-32 rounded-xl border-4 border-[#0A0A0F] overflow-hidden bg-[#0A0A0F] shadow-2xl flex-shrink-0">
                <img src={event.logo_url} alt={event.name} className="h-full w-full object-cover" />
              </div>
            )}
            <div>
              <div className="inline-block px-3 py-1 bg-[rgba(255,255,255,0.1)] backdrop-blur-md rounded-full text-xs font-semibold mb-2 text-[#ffffff]">
                {event.status}
              </div>
              <h1 className="text-3xl md:text-5xl font-bold text-[#ffffff] mb-2">{event.name}</h1>
              <p className="text-lg text-[#cbd5e1] line-clamp-2 max-w-3xl">{event.tagline}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Countdown Bar */}
      <div className="bg-[#1a1a2e] border-b border-white/10 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center md:justify-end">
          <CountdownTimer startDate={event.start_date} endDate={event.end_date} />
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto no-scrollbar border-b border-white/10 space-x-8 mb-8">
          {["general", "announcements", "chat", "leaderboard", "submission"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-sm font-medium transition-colors whitespace-nowrap relative ${
                activeTab === tab ? "text-violet-400" : "text-slate-400 hover:text-slate-300"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-400 rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[500px]">
          {activeTab === "general" && <GeneralInfo event={event} team={team} user={user} />}
          {activeTab === "announcements" && <AnnouncementFeed eventId={event.id} />}
          {activeTab === "chat" && (
            team ? <TeamChat team={team} user={user} /> : 
            <div className="text-center py-20 text-slate-400 border border-dashed border-white/10 rounded-xl">
              You need to be in a team to access chat.
            </div>
          )}
          {activeTab === "leaderboard" && <Leaderboard eventId={event.id} teamId={team?.id} />}
          {activeTab === "submission" && (
            team ? <SubmissionVault event={event} team={team} /> :
            <div className="text-center py-20 text-slate-400 border border-dashed border-white/10 rounded-xl">
              You need to form a team to submit your project.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
