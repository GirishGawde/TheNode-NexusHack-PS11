import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import api from "@/lib/axios"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, RefreshCw, Eye, EyeOff } from "lucide-react"

export default function LeaderboardControl({ eventId }) {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [isPublished, setIsPublished] = useState(false)

  useEffect(() => {
    fetchLeaderboard()
  }, [eventId])

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("leaderboard")
        .select(`
          id,
          rank,
          total_score,
          is_published,
          teams(id, name)
        `)
        .eq("event_id", eventId)
        .order("rank", { ascending: true })
        
      if (error) throw error
      
      setLeaderboard(data || [])
      if (data && data.length > 0) {
        setIsPublished(data[0].is_published)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCalculate = async () => {
    setCalculating(true)
    try {
      // In a real app, this calls an API that aggregates scores and updates the leaderboard table
      await api.post("/api/judging/calculate-leaderboard", { eventId })
      await fetchLeaderboard()
      alert("Leaderboard calculated successfully!")
    } catch (err) {
      alert("Error calculating leaderboard: " + (err.response?.data?.error || err.message))
    } finally {
      setCalculating(false)
    }
  }

  const togglePublish = async () => {
    try {
      const newStatus = !isPublished
      const { error } = await supabase
        .from("leaderboard")
        .update({ is_published: newStatus })
        .eq("event_id", eventId)
        
      if (error) throw error
      
      setIsPublished(newStatus)
      // Update local state
      setLeaderboard(leaderboard.map(l => ({ ...l, is_published: newStatus })))
    } catch (err) {
      alert("Failed to change publish status: " + err.message)
    }
  }

  return (
    <Card className="bg-[#1a1a2e]/50 border-white/10">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-white/10">
        <div>
          <CardTitle className="text-xl flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" /> Leaderboard Management
          </CardTitle>
          <p className="text-sm text-slate-400 mt-1">Calculate final scores and publish results to participants.</p>
        </div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <Button 
            variant="outline" 
            onClick={handleCalculate} 
            disabled={calculating}
            className="gap-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-900/20"
          >
            <RefreshCw className={`h-4 w-4 ${calculating ? 'animate-spin' : ''}`} />
            {calculating ? "Calculating..." : "Calculate Scores"}
          </Button>
          
          <Button 
            onClick={togglePublish}
            className={`gap-2 ${isPublished ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {isPublished ? (
              <><EyeOff className="h-4 w-4" /> Unpublish Results</>
            ) : (
              <><Eye className="h-4 w-4" /> Publish to Participants</>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading leaderboard...</div>
        ) : leaderboard.length === 0 ? (
          <div className="py-16 text-center border-b border-white/10 flex flex-col items-center">
            <Trophy className="h-12 w-12 text-slate-500 mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-white mb-2">No Results Yet</h3>
            <p className="text-slate-400 max-w-md">
              Calculate scores once judging is complete to generate the leaderboard.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-black/20 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 font-medium w-20 text-center">Rank</th>
                  <th className="px-6 py-4 font-medium">Team Name</th>
                  <th className="px-6 py-4 font-medium w-32 text-right">Total Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr key={entry.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mx-auto ${
                        entry.rank === 1 ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50" :
                        entry.rank === 2 ? "bg-slate-300/20 text-slate-300 border border-slate-300/50" :
                        entry.rank === 3 ? "bg-amber-600/20 text-amber-500 border border-amber-600/50" :
                        "bg-white/5 text-slate-400"
                      }`}>
                        {entry.rank}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-white text-lg">
                      {entry.teams.name}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-cyan-400 text-right text-lg">
                      {entry.total_score.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="p-4 bg-black/20 text-xs text-slate-400 flex items-center justify-between">
          <span>Status: <strong className={isPublished ? "text-green-400" : "text-yellow-400"}>{isPublished ? "PUBLISHED (Visible to participants)" : "DRAFT (Hidden from participants)"}</strong></span>
          <span>{leaderboard.length} teams ranked</span>
        </div>
      </CardContent>
    </Card>
  )
}
