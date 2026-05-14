import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

export default function AnalyticsDashboard({ eventId }) {
  const [loading, setLoading] = useState(true)
  const [registrationData, setRegistrationData] = useState([])
  const [skillData, setSkillData] = useState([])
  const [yearData, setYearData] = useState([])

  useEffect(() => {
    fetchAnalytics()
  }, [eventId])

  const fetchAnalytics = async () => {
    try {
      // Mock data for now since we'd need complex queries for timeline
      // In reality, we'd use RPC or group by queries in Supabase
      setRegistrationData([
        { date: 'Day 1', count: 12 },
        { date: 'Day 2', count: 25 },
        { date: 'Day 3', count: 40 },
        { date: 'Day 4', count: 75 },
        { date: 'Day 5', count: 110 },
      ])

      const { data: users } = await supabase
        .from('event_registrations')
        .select(`
          users(skills, year_of_study)
        `)
        .eq('event_id', eventId)

      if (users) {
        // Process skills
        const skillCounts = {}
        const yearCounts = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }

        users.forEach(reg => {
          const u = reg.users
          if (u) {
            u.skills?.forEach(s => {
              skillCounts[s] = (skillCounts[s] || 0) + 1
            })
            if (u.year_of_study) {
              yearCounts[u.year_of_study] = (yearCounts[u.year_of_study] || 0) + 1
            }
          }
        })

        const topSkills = Object.entries(skillCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, value]) => ({ name, value }))
        
        setSkillData(topSkills)

        setYearData([
          { name: "1st Year", value: yearCounts['1'] },
          { name: "2nd Year", value: yearCounts['2'] },
          { name: "3rd Year", value: yearCounts['3'] },
          { name: "4th Year", value: yearCounts['4'] },
          { name: "Other", value: yearCounts['5'] },
        ].filter(d => d.value > 0))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ['#7C3AED', '#06B6D4', '#F59E0B', '#10B981', '#EC4899']

  if (loading) return <div className="py-12 text-center text-slate-400">Loading analytics...</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="col-span-1 md:col-span-2 bg-[#1a1a2e]/50 border-white/10">
        <CardHeader>
          <CardTitle>Registration Timeline</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={registrationData}>
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} 
              />
              <Bar dataKey="count" fill="#06B6D4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-[#1a1a2e]/50 border-white/10">
        <CardHeader>
          <CardTitle>Top Skills</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {skillData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={skillData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {skillData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">Not enough data</div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#1a1a2e]/50 border-white/10">
        <CardHeader>
          <CardTitle>Participants by Year</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {yearData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearData} layout="vertical">
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" width={80} stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Bar dataKey="value" fill="#7C3AED" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
             <div className="h-full flex items-center justify-center text-slate-400">Not enough data</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
