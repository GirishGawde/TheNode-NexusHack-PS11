import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function ParticipantTable({ eventId }) {
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetchParticipants()
  }, [eventId])

  const fetchParticipants = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("event_registrations")
        .select(`
          registered_at,
          users(name, email, college, role),
          teams(name, invite_code)
        `)
        .eq("event_id", eventId)
        
      if (error) throw error
      setParticipants(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = participants.filter(p => {
    const s = search.toLowerCase()
    return (
      p.users?.name?.toLowerCase().includes(s) ||
      p.users?.email?.toLowerCase().includes(s) ||
      p.teams?.name?.toLowerCase().includes(s)
    )
  })

  if (loading) return <div className="py-12 text-center text-slate-400">Loading participants...</div>

  return (
    <Card className="bg-[#1a1a2e]/50 border-white/10">
      <CardContent className="p-0">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Participants</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              className="pl-9 bg-black/20 border-white/10 h-9" 
              placeholder="Search by name, email, team..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-black/20 border-b border-white/10">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">College</th>
                <th className="px-6 py-3 font-medium">Team</th>
                <th className="px-6 py-3 font-medium">Registration Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400">
                    No participants found.
                  </td>
                </tr>
              ) : (
                filtered.map((p, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{p.users?.name || "Unknown"}</td>
                    <td className="px-6 py-4 text-slate-300">{p.users?.email || "N/A"}</td>
                    <td className="px-6 py-4 text-slate-300">{p.users?.college || "N/A"}</td>
                    <td className="px-6 py-4">
                      {p.teams ? (
                        <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-md text-xs font-semibold">
                          {p.teams.name}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs italic">Solo / Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(p.registered_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
