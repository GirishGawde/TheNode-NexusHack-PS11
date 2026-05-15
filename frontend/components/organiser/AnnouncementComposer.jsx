import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Send, AlertTriangle, Info, AlertOctagon } from "lucide-react"
import { toast } from "react-hot-toast"

export default function AnnouncementComposer({ eventId }) {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    body: "",
    urgency: "INFO" // INFO, WARNING, CRITICAL
  })

  useEffect(() => {
    fetchAnnouncements()
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

  const handleSend = async (e) => {
    e.preventDefault()
    setSending(true)
    
    try {
      const { error } = await supabase
        .from("announcements")
        .insert({
          event_id: eventId,
          title: formData.title,
          body: formData.body,
          urgency: formData.urgency
        })
        
      if (error) throw error
      
      setFormData({ title: "", body: "", urgency: "INFO" })
      fetchAnnouncements()
      toast.success("Announcement sent successfully!")
    } catch (err) {
      toast.error("Failed to send announcement: " + err.message)
    } finally {
      setSending(false)
    }
  }

  const getUrgencyIcon = (urgency) => {
    switch (urgency) {
      case 'CRITICAL': return <AlertOctagon className="h-4 w-4 text-red-400" />
      case 'WARNING': return <AlertTriangle className="h-4 w-4 text-yellow-400" />
      default: return <Info className="h-4 w-4 text-blue-400" />
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-[#1a1a2e]/50 border-white/10 h-fit">
        <CardHeader>
          <CardTitle>Compose Announcement</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input 
                value={formData.title} 
                onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                required 
                placeholder="e.g. Submissions closing in 1 hour!"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Message</Label>
              <textarea 
                value={formData.body} 
                onChange={(e) => setFormData({ ...formData, body: e.target.value })} 
                required
                className="w-full h-32 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 resize-none"
                placeholder="Details of the announcement..."
              />
            </div>
            
            <div className="space-y-2">
              <Label>Urgency</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="urgency" 
                    value="INFO" 
                    checked={formData.urgency === "INFO"}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                    className="accent-cyan-500"
                  />
                  <span className="text-blue-400 flex items-center gap-1"><Info className="h-4 w-4" /> Info</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="urgency" 
                    value="WARNING" 
                    checked={formData.urgency === "WARNING"}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                    className="accent-yellow-500"
                  />
                  <span className="text-yellow-400 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Warning</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="urgency" 
                    value="CRITICAL" 
                    checked={formData.urgency === "CRITICAL"}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                    className="accent-red-500"
                  />
                  <span className="text-red-400 flex items-center gap-1"><AlertOctagon className="h-4 w-4" /> Critical</span>
                </label>
              </div>
            </div>
            
            <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 gap-2 mt-4" disabled={sending}>
              <Send className="h-4 w-4" /> {sending ? "Sending..." : "Send Announcement"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-[#1a1a2e]/50 border-white/10">
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-slate-400 py-8">Loading history...</div>
          ) : announcements.length === 0 ? (
            <div className="text-center text-slate-400 py-8 italic border border-dashed border-white/10 rounded-xl">
              No announcements sent yet.
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {announcements.map((ann) => (
                <div key={ann.id} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 font-bold text-white text-sm">
                      {getUrgencyIcon(ann.urgency)}
                      {ann.title}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(ann.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm whitespace-pre-wrap">{ann.body}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
