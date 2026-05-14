"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import Navbar from "@/components/shared/Navbar"
import ParticipantTable from "@/components/organiser/ParticipantTable"
import JudgingPanel from "@/components/organiser/JudgingPanel"
import AnnouncementComposer from "@/components/organiser/AnnouncementComposer"
import AnalyticsDashboard from "@/components/organiser/AnalyticsDashboard"
import LeaderboardControl from "@/components/organiser/LeaderboardControl"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play, Square, Users, Trophy, Bell, LineChart, ShieldAlert } from "lucide-react"

export default function OrganiserEventControl({ params }) {
  const { eventId } = params
  const [event, setEvent] = useState(null)
  const [stats, setStats] = useState({ registered: 0, teams: 0, submitted: 0, judged: 0 })
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()

    // Realtime stats
    const channel = supabase.channel(`event-stats-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_registrations', filter: `event_id=eq.${eventId}` }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `event_id=eq.${eventId}` }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions', filter: `event_id=eq.${eventId}` }, fetchData)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [eventId])

  const fetchData = async () => {
    try {
      const { data: eventData, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single()
        
      if (error) throw error
      setEvent(eventData)

      // Fetch Stats
      const [regRes, teamsRes, subRes] = await Promise.all([
        supabase.from("event_registrations").select("id", { count: 'exact' }).eq("event_id", eventId),
        supabase.from("teams").select("id", { count: 'exact' }).eq("event_id", eventId),
        supabase.from("submissions").select("id", { count: 'exact' }).eq("event_id", eventId).eq("status", "SUBMITTED")
      ])

      setStats({
        registered: regRes.count || 0,
        teams: teamsRes.count || 0,
        submitted: subRes.count || 0,
        judged: 0 // Will implement later with judging assignments
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      const { error } = await supabase
        .from("events")
        .update({ status: newStatus })
        .eq("id", eventId)
        
      if (error) throw error
      setEvent({ ...event, status: newStatus })
    } catch (err) {
      alert("Error changing status: " + err.message)
    }
  }

  if (loading) return <div className="min-h-screen bg-[#0A0A0F] text-white flex items-center justify-center">Loading control panel...</div>
  if (!event) return <div className="min-h-screen bg-[#0A0A0F] text-white flex items-center justify-center">Event not found.</div>

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col">
      <Navbar role="organiser" />
      
      {/* Control Header */}
      <div className="bg-[#1a1a2e] border-b border-white/10 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              {event.name}
              <span className={`px-2 py-1 text-xs uppercase font-bold rounded-full ${
                event.status === 'PUBLISHED' ? 'bg-blue-500/20 text-blue-400' :
                event.status === 'LIVE' ? 'bg-green-500/20 text-green-400' :
                'bg-slate-600/20 text-slate-500'
              }`}>
                {event.status}
              </span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            {event.status === 'PUBLISHED' && (
              <Button onClick={() => handleStatusChange('LIVE')} className="bg-green-600 hover:bg-green-700 gap-2">
                <Play className="h-4 w-4" /> Start Event
              </Button>
            )}
            {event.status === 'LIVE' && (
              <Button onClick={() => handleStatusChange('ENDED')} className="bg-red-600 hover:bg-red-700 gap-2">
                <Square className="h-4 w-4" /> End Event
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0 space-y-2">
          <button 
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'overview' ? 'bg-cyan-600 text-white' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
          >
            <LineChart className="h-5 w-5" /> Overview & Analytics
          </button>
          <button 
            onClick={() => setActiveTab("participants")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'participants' ? 'bg-cyan-600 text-white' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
          >
            <Users className="h-5 w-5" /> Participants & Teams
          </button>
          <button 
            onClick={() => setActiveTab("announcements")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'announcements' ? 'bg-cyan-600 text-white' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
          >
            <Bell className="h-5 w-5" /> Announcements
          </button>
          <button 
            onClick={() => setActiveTab("judging")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'judging' ? 'bg-cyan-600 text-white' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
          >
            <ShieldAlert className="h-5 w-5" /> Judging Panel
          </button>
          <button 
            onClick={() => setActiveTab("leaderboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'leaderboard' ? 'bg-cyan-600 text-white' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
          >
            <Trophy className="h-5 w-5" /> Leaderboard
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-[#1a1a2e]/50 border-white/10">
                  <CardContent className="p-6">
                    <p className="text-sm font-medium text-slate-400 mb-1">Registered</p>
                    <p className="text-3xl font-bold text-white">{stats.registered}</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#1a1a2e]/50 border-white/10">
                  <CardContent className="p-6">
                    <p className="text-sm font-medium text-slate-400 mb-1">Teams Formed</p>
                    <p className="text-3xl font-bold text-cyan-400">{stats.teams}</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#1a1a2e]/50 border-white/10">
                  <CardContent className="p-6">
                    <p className="text-sm font-medium text-slate-400 mb-1">Submitted</p>
                    <p className="text-3xl font-bold text-violet-400">{stats.submitted}</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#1a1a2e]/50 border-white/10">
                  <CardContent className="p-6">
                    <p className="text-sm font-medium text-slate-400 mb-1">Judged</p>
                    <p className="text-3xl font-bold text-yellow-400">{stats.judged}</p>
                  </CardContent>
                </Card>
              </div>
              <AnalyticsDashboard eventId={eventId} />
            </div>
          )}
          {activeTab === "participants" && <ParticipantTable eventId={eventId} />}
          {activeTab === "announcements" && <AnnouncementComposer eventId={eventId} />}
          {activeTab === "judging" && <JudgingPanel eventId={eventId} />}
          {activeTab === "leaderboard" && <LeaderboardControl eventId={eventId} />}
        </div>
      </div>
    </div>
  )
}
