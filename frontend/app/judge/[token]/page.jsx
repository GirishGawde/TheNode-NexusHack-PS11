"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import api from "@/lib/axios"
import Navbar from "@/components/shared/Navbar"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ExternalLink, CheckCircle2, ChevronRight, Search, FileCode2, Sparkles, UserPlus } from "lucide-react"

export default function JudgeInterface({ params }) {
  const { token } = params
  const [event, setEvent] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [rubric, setRubric] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [isRegistered, setIsRegistered] = useState(false)
  const [activeSubmission, setActiveSubmission] = useState(null)
  const [scores, setScores] = useState({})
  const [feedback, setFeedback] = useState("")
  const [savingScore, setSavingScore] = useState(false)
  const [search, setSearch] = useState("")
  const [completedJudging, setCompletedJudging] = useState([])

  useEffect(() => {
    verifyAndLoad()
  }, [token])

  const verifyAndLoad = async () => {
    try {
      setLoading(true)
      
      // Parse token (in real app, this would be an API call to verify the invite token)
      let eventId
      try {
        const decoded = JSON.parse(atob(token))
        eventId = decoded.eventId
      } catch (e) {
        throw new Error("Invalid or expired invite link")
      }

      // Check user session
      const { data: { session } } = await supabase.auth.getSession()
      
      // Fetch Event Data
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single()
        
      if (eventError) throw eventError
      setEvent(eventData)

      // Fetch Rubric
      const { data: rubricData } = await supabase
        .from("rubric_criteria")
        .select("*")
        .eq("event_id", eventId)
        .order("order_index")
        
      if (rubricData) setRubric(rubricData)

      if (session) {
        setUser(session.user)
        // Check if already registered as judge
        const { data: judgeData } = await supabase
          .from("judge_assignments")
          .select("*")
          .eq("event_id", eventId)
          .eq("user_id", session.user.id)
          .single()
          
        if (judgeData) {
          setIsRegistered(true)
          loadJudgeDashboard(eventId, session.user.id)
        }
      }
    } catch (err) {
      console.error(err)
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadJudgeDashboard = async (eventId, userId) => {
    // Fetch submissions
    const { data: subData } = await supabase
      .from("submissions")
      .select("*, teams(name)")
      .eq("event_id", eventId)
      .eq("status", "SUBMITTED")
      
    if (subData) setSubmissions(subData)

    // Fetch existing scores for this judge
    const { data: scoreData } = await supabase
      .from("scores")
      .select("submission_id")
      .eq("judge_id", userId)
      
    if (scoreData) {
      const completedIds = [...new Set(scoreData.map(s => s.submission_id))]
      setCompletedJudging(completedIds)
    }
  }

  const handleRegisterAsJudge = async () => {
    try {
      // Create user if not logged in (simplified for this demo - normally would redirect to login/register)
      if (!user) {
        alert("Please login first to accept this invitation.")
        window.location.href = `/login/participant?redirect=/judge/${token}` // Reuse login for simplicity
        return
      }

      // Add to judge_assignments
      const { error } = await supabase
        .from("judge_assignments")
        .insert({
          event_id: event.id,
          user_id: user.id
        })
        
      if (error) {
        // If already exists, just proceed
        if (error.code !== '23505') throw error
      }
      
      // Update role to judge if they were just a participant
      await supabase.from("users").update({ role: "judge" }).eq("id", user.id)

      setIsRegistered(true)
      loadJudgeDashboard(event.id, user.id)
      alert("Successfully registered as a judge!")
    } catch (err) {
      alert("Failed to register: " + err.message)
    }
  }

  const handleScoreChange = (criteriaId, value) => {
    setScores({ ...scores, [criteriaId]: Number(value) })
  }

  const submitScore = async () => {
    // Validate all criteria scored
    const missing = rubric.filter(r => scores[r.id] === undefined)
    if (missing.length > 0) {
      alert("Please score all criteria before submitting.")
      return
    }

    setSavingScore(true)
    try {
      const scoreRows = rubric.map(r => ({
        submission_id: activeSubmission.id,
        judge_id: user.id,
        criteria_id: r.id,
        score: scores[r.id],
        feedback: feedback
      }))

      const { error } = await supabase.from("scores").insert(scoreRows)
      if (error) throw error

      setCompletedJudging([...completedJudging, activeSubmission.id])
      setActiveSubmission(null)
      setScores({})
      setFeedback("")
      alert("Score submitted successfully!")
    } catch (err) {
      alert("Failed to submit score: " + err.message)
    } finally {
      setSavingScore(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-[#0A0A0F] text-white flex items-center justify-center">Loading...</div>
  if (!event) return <div className="min-h-screen bg-[#0A0A0F] text-white flex items-center justify-center">Invalid Link</div>

  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] text-white flex items-center justify-center p-6 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-[#0A0A0F] to-emerald-900/20 z-0 pointer-events-none" />
        
        <Card className="z-10 w-full max-w-md border-emerald-900/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 border border-emerald-500/30">
              <UserPlus className="h-8 w-8 text-emerald-400" />
            </div>
            <CardTitle className="text-2xl text-emerald-400">Judge Invitation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-slate-300">
              You have been invited to judge the hackathon:
            </p>
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <h3 className="font-bold text-xl text-white mb-1">{event.name}</h3>
              <p className="text-sm text-slate-400">{new Date(event.start_date).toLocaleDateString()}</p>
            </div>
            <Button 
              onClick={handleRegisterAsJudge} 
              className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg"
            >
              Accept Invitation
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const filteredSubmissions = submissions.filter(s => 
    s.project_name.toLowerCase().includes(search.toLowerCase()) || 
    s.teams?.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col">
      <Navbar role="judge" />
      
      <div className="bg-[#1a1a2e] border-b border-white/10 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-emerald-400">Judging Panel</h1>
            <p className="text-sm text-slate-400">{event.name}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{completedJudging.length} <span className="text-sm font-normal text-slate-400">/ {submissions.length}</span></p>
            <p className="text-xs text-emerald-400 uppercase tracking-widest font-bold">Judged</p>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col md:flex-row gap-8">
        
        {/* Submissions List */}
        <div className={`w-full md:w-1/3 shrink-0 space-y-4 ${activeSubmission ? 'hidden md:block' : 'block'}`}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              className="pl-9 bg-black/20 border-white/10" 
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="space-y-2 h-[calc(100vh-250px)] overflow-y-auto pr-2 pb-10">
            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-10 text-slate-500">No submissions found.</div>
            ) : (
              filteredSubmissions.map((sub) => {
                const isCompleted = completedJudging.includes(sub.id)
                const isActive = activeSubmission?.id === sub.id
                
                return (
                  <button
                    key={sub.id}
                    onClick={() => {
                      if (!isCompleted) {
                        setActiveSubmission(sub)
                        setScores({})
                        setFeedback("")
                      }
                    }}
                    disabled={isCompleted}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isActive 
                        ? "bg-emerald-600/20 border-emerald-500/50" 
                        : isCompleted 
                          ? "bg-white/5 border-transparent opacity-60 cursor-not-allowed" 
                          : "bg-[#1a1a2e]/50 border-white/10 hover:border-emerald-500/30 hover:bg-[#1a1a2e]"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-white line-clamp-1">{sub.project_name}</h3>
                      {isCompleted && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-400 mb-2 font-mono">{sub.teams?.name}</p>
                    <div className="flex flex-wrap gap-1">
                      {sub.tech_stack?.slice(0, 3).map((tech, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-sm bg-white/10 text-slate-300">
                          {tech}
                        </span>
                      ))}
                      {sub.tech_stack?.length > 3 && <span className="text-[10px] px-1.5 py-0.5 text-slate-500">+{sub.tech_stack.length - 3}</span>}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Judging Area */}
        <div className={`flex-1 min-w-0 ${!activeSubmission ? 'hidden md:flex items-center justify-center' : 'block'}`}>
          {!activeSubmission ? (
            <div className="text-center text-slate-500 flex flex-col items-center">
              <FileCode2 className="h-16 w-16 mb-4 opacity-20" />
              <p>Select a submission from the list to start judging.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Back button on mobile */}
              <button 
                className="md:hidden text-emerald-400 flex items-center gap-1 text-sm font-bold mb-4"
                onClick={() => setActiveSubmission(null)}
              >
                <ChevronRight className="h-4 w-4 rotate-180" /> Back to list
              </button>

              <Card className="bg-[#1a1a2e]/50 border-white/10 overflow-hidden">
                <div className="h-2 w-full bg-gradient-to-r from-emerald-500 to-cyan-500" />
                <CardHeader>
                  <CardTitle className="text-3xl text-white">{activeSubmission.project_name}</CardTitle>
                  <p className="text-slate-400">by <strong className="text-white">{activeSubmission.teams?.name}</strong></p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Tagline</h4>
                    <p className="text-lg text-emerald-100">{activeSubmission.tagline}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Problem Statement</h4>
                    <p className="text-slate-300 whitespace-pre-wrap bg-black/20 p-4 rounded-lg border border-white/5 leading-relaxed">
                      {activeSubmission.problem_statement}
                    </p>
                  </div>

                  {activeSubmission.what_makes_unique && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-yellow-400" /> Unique Value
                      </h4>
                      <p className="text-slate-300 whitespace-pre-wrap bg-yellow-900/10 p-4 rounded-lg border border-yellow-500/10 leading-relaxed">
                        {activeSubmission.what_makes_unique}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button variant="outline" asChild className="justify-start gap-3 h-14 bg-white/5 hover:bg-white/10">
                      <a href={activeSubmission.github_repo_url} target="_blank" rel="noopener noreferrer">
                        <FileCode2 className="h-5 w-5 text-slate-400" />
                        <div className="text-left">
                          <div className="text-sm font-bold">GitHub Repository</div>
                          <div className="text-xs text-slate-400 truncate w-40">{activeSubmission.github_repo_url}</div>
                        </div>
                        <ExternalLink className="h-4 w-4 ml-auto text-slate-500" />
                      </a>
                    </Button>
                    <Button variant="outline" asChild className="justify-start gap-3 h-14 bg-white/5 hover:bg-white/10">
                      <a href={activeSubmission.demo_link} target="_blank" rel="noopener noreferrer">
                        <Play className="h-5 w-5 text-emerald-400" />
                        <div className="text-left">
                          <div className="text-sm font-bold">Live Demo / Video</div>
                          <div className="text-xs text-slate-400 truncate w-40">{activeSubmission.demo_link}</div>
                        </div>
                        <ExternalLink className="h-4 w-4 ml-auto text-slate-500" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Rubric Evaluation */}
              <Card className="bg-[#1a1a2e]/50 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.05)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full -mr-4 -mt-4" />
                <CardHeader>
                  <CardTitle className="text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" /> Evaluation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {rubric.map((r) => (
                    <div key={r.id} className="space-y-3 pb-6 border-b border-white/5 last:border-0 last:pb-0">
                      <div className="flex justify-between items-end">
                        <div>
                          <Label className="text-base text-white">{r.name}</Label>
                          <p className="text-xs text-slate-400 mt-1">{r.description}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-mono font-bold text-emerald-400">{scores[r.id] || 0}</span>
                          <span className="text-slate-500 text-sm"> / {r.weight}</span>
                        </div>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max={r.weight} 
                        value={scores[r.id] || 0} 
                        onChange={(e) => handleScoreChange(r.id, e.target.value)}
                        className="w-full accent-emerald-500 h-2 bg-black/40 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>0</span>
                        <span>{r.weight}</span>
                      </div>
                    </div>
                  ))}

                  <div className="pt-4">
                    <Label className="mb-2 block">Judge's Feedback (Optional, sent to team)</Label>
                    <textarea 
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="w-full h-24 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 resize-none"
                      placeholder="Great job on the technical implementation! However..."
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="text-slate-300">
                      Total Score: <span className="text-2xl font-bold text-white ml-2">
                        {Object.values(scores).reduce((a, b) => a + b, 0)}
                      </span>
                      <span className="text-slate-500 text-sm"> / 100</span>
                    </div>
                    <Button 
                      onClick={submitScore} 
                      disabled={savingScore}
                      className="bg-emerald-600 hover:bg-emerald-700 w-40 h-12 text-lg font-bold shadow-lg shadow-emerald-900/50"
                    >
                      {savingScore ? "Saving..." : "Submit Score"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
