import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Trophy, Medal, Award } from "lucide-react"

export default function Leaderboard({ eventId, teamId }) {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [isPublished, setIsPublished] = useState(false)

  useEffect(() => {
    fetchLeaderboard()
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('leaderboard')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leaderboard',
        filter: `event_id=eq.${eventId}`
      }, () => {
        fetchLeaderboard()
      })
      .subscribe()
      
    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("leaderboard")
        .select(`
          rank,
          is_published,
          teams(id, name)
        `)
        .eq("event_id", eventId)
        .order("rank", { ascending: true })
        
      if (error) throw error
      
      if (data && data.length > 0) {
        setIsPublished(data[0].is_published)
        if (data[0].is_published) {
          setLeaderboard(data)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="py-12 text-center text-slate-400">Loading leaderboard...</div>

  if (!isPublished) {
    return (
      <div className="py-20 text-center flex flex-col items-center max-w-lg mx-auto">
        <div className="w-20 h-20 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-violet-500/20 animate-pulse" />
          <Trophy className="h-10 w-10 text-violet-400 relative z-10" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Judging in Progress...</h2>
        <p className="text-slate-400">
          The leaderboard is currently hidden while our judges evaluate the submissions. Check back once the results are published!
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-center gap-3 mb-8">
        <Trophy className="h-8 w-8 text-yellow-400" />
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">
          Final Results
        </h2>
      </div>
      
      <div className="space-y-3">
        {leaderboard.map((entry) => {
          const isMyTeam = entry.teams.id === teamId
          const isTop3 = entry.rank <= 3
          
          return (
            <div 
              key={entry.teams.id}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                isMyTeam 
                  ? "bg-violet-600/20 border-violet-500/50 shadow-[0_0_15px_rgba(124,58,237,0.2)]" 
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl shrink-0 ${
                entry.rank === 1 ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50" :
                entry.rank === 2 ? "bg-slate-300/20 text-slate-300 border border-slate-300/50" :
                entry.rank === 3 ? "bg-amber-600/20 text-amber-500 border border-amber-600/50" :
                "bg-white/5 text-slate-400 border border-white/10"
              }`}>
                {entry.rank === 1 ? <Trophy className="h-6 w-6" /> :
                 entry.rank === 2 ? <Medal className="h-6 w-6" /> :
                 entry.rank === 3 ? <Award className="h-6 w-6" /> :
                 `#${entry.rank}`}
              </div>
              
              <div className="flex-1">
                <h3 className={`font-bold text-lg ${isMyTeam ? "text-violet-300" : "text-white"}`}>
                  {entry.teams.name}
                </h3>
                {isMyTeam && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-600/50 text-violet-200 mt-1 inline-block">
                    YOUR TEAM
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
