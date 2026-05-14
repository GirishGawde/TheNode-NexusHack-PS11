import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Award, Download } from "lucide-react"

export default function HistoryTab() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Fetch completed events and certificates
      const { data, error } = await supabase
        .from("event_registrations")
        .select(`
          *,
          events(*),
          teams(
            leaderboard(rank)
          )
        `)
        .eq("user_id", session.user.id)
      
      if (error) throw error
      
      const pastEvents = (data || []).filter(reg => reg.events?.status === "ENDED")
      
      // Fetch certificates for these events
      const { data: certs } = await supabase
        .from("certificates")
        .select("*")
        .eq("user_id", session.user.id)
        
      const enrichedHistory = pastEvents.map(reg => {
        const cert = certs?.find(c => c.event_id === reg.event_id)
        const rank = reg.teams?.leaderboard?.[0]?.rank
        return { ...reg, certificate: cert, rank }
      })
      
      setHistory(enrichedHistory)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="py-12 text-center text-slate-400">Loading history...</div>

  if (history.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400 border border-dashed border-white/10 rounded-xl">
        You haven't participated in any hackathons that have ended yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {history.map((item) => (
        <Card key={item.id} className="bg-[#1a1a2e]/50 border-white/10">
          <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                {item.events.logo_url ? (
                  <img src={item.events.logo_url} alt={item.events.name} className="w-full h-full object-cover" />
                ) : (
                  <Award className="h-8 w-8 text-violet-400" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{item.events.name}</h3>
                <p className="text-sm text-slate-400">
                  {new Date(item.events.end_date).toLocaleDateString()}
                </p>
                {item.rank && (
                  <p className="text-sm font-medium text-violet-400 mt-1">
                    Rank: #{item.rank}
                  </p>
                )}
              </div>
            </div>
            
            <div>
              {item.certificate ? (
                <Button asChild variant="outline" className="gap-2">
                  <a href={item.certificate.certificate_url} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" /> Download Certificate
                  </a>
                </Button>
              ) : (
                <span className="text-xs px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400">
                  Certificate Pending
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
