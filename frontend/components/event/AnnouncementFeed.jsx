import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Bell, AlertTriangle, Info, AlertOctagon } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export default function AnnouncementFeed({ eventId }) {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnnouncements()
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('announcements')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'announcements',
        filter: `event_id=eq.${eventId}`
      }, (payload) => {
        setAnnouncements(prev => [payload.new, ...prev])
      })
      .subscribe()
      
    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("event_id", eventId)
        .order("sent_at", { ascending: false })
        
      if (error) throw error
      setAnnouncements(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getUrgencyIcon = (urgency) => {
    switch (urgency) {
      case 'CRITICAL': return <AlertOctagon className="h-5 w-5 text-red-400" />
      case 'WARNING': return <AlertTriangle className="h-5 w-5 text-yellow-400" />
      default: return <Info className="h-5 w-5 text-blue-400" />
    }
  }

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'CRITICAL': return "bg-red-500/20 text-red-400 border border-red-500/30"
      case 'WARNING': return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
      default: return "bg-blue-500/20 text-blue-400 border border-blue-500/30"
    }
  }

  if (loading) return <div className="py-12 text-center text-slate-400">Loading announcements...</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="h-6 w-6 text-violet-400" />
        <h2 className="text-2xl font-bold text-white">Announcements</h2>
      </div>
      
      {announcements.length === 0 ? (
        <div className="py-16 text-center text-slate-400 border border-dashed border-white/10 rounded-xl bg-white/5">
          <Bell className="h-12 w-12 mx-auto text-slate-500 mb-4 opacity-50" />
          <p>No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
          {announcements.map((ann, i) => (
            <div key={ann.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#0A0A0F] bg-[#1a1a2e] text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2`}>
                {getUrgencyIcon(ann.urgency)}
              </div>
              <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 bg-[#1a1a2e]/80 border-white/10 hover:border-violet-500/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${getUrgencyBadge(ann.urgency)}`}>
                    {ann.urgency}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatDistanceToNow(new Date(ann.sent_at), { addSuffix: true })}
                  </span>
                </div>
                <h3 className="font-bold text-white text-lg mb-2">{ann.title}</h3>
                <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{ann.body}</p>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
