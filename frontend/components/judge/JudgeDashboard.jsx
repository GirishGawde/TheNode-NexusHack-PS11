'use client'
import { useState, useEffect, useMemo } from "react"
import axios from "axios"
import { supabase } from "@/lib/supabase"
import {
  Trophy, Code, ExternalLink, CheckCircle2, Clock, X, Star,
  MessageSquare, Loader2, LogOut, Search, ChevronRight, FileText,
  Users, Lightbulb, Zap, Sun, Moon, Pencil
} from "lucide-react"

const api = (path) => `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}${path}`

export default function JudgeDashboard({ eventId, judgeId, judgeName, onLogout, theme, toggleTheme }) {
  const [event, setEvent] = useState(null)
  const [teams, setTeams] = useState([])
  const [rubric, setRubric] = useState([])
  const [myScores, setMyScores] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [scores, setScores] = useState({})
  const [feedback, setFeedback] = useState("")
  const [privateNotes, setPrivateNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [editProfile, setEditProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: judgeName, profession: "", expertise: "" })
  const [savingProfile, setSavingProfile] = useState(false)
  const [aiScoring, setAiScoring] = useState(false)
  const [plagiarism, setPlagiarism] = useState(null) // { overallRisk, suspiciousMatches }
  const [checkingPlagiarism, setCheckingPlagiarism] = useState(false)

  const dark = theme === "dark"

  // Theme tokens
  const bg = dark ? "bg-black" : "bg-white"
  const surface = dark ? "bg-[#111]" : "bg-gray-50"
  const card = dark ? "bg-[#111] border-gray-800" : "bg-white border-gray-200"
  const text = dark ? "text-white" : "text-black"
  const sub = dark ? "text-gray-400" : "text-gray-500"
  const muted = dark ? "text-gray-600" : "text-gray-400"
  const border = dark ? "border-gray-800" : "border-gray-200"
  const inputCls = dark
    ? "bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-600 focus:border-gray-500"
    : "bg-white border-gray-300 text-black placeholder:text-gray-400 focus:border-gray-500"
  const hoverRow = dark ? "hover:bg-[#1a1a1a]" : "hover:bg-gray-50"
  const activeRow = dark ? "bg-[#1a1a1a] border-gray-600" : "bg-gray-100 border-gray-400"
  const scoredRow = dark ? "bg-[#0f1a0f] border-gray-700" : "bg-green-50 border-green-200"
  const btnPrimary = dark ? "bg-white text-black hover:bg-gray-100" : "bg-black text-white hover:bg-gray-900"
  const btnSecondary = dark ? "bg-[#1a1a1a] text-gray-300 border-gray-700 hover:bg-[#222]" : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"

  useEffect(() => { 
    fetchAll() 

    // Auto-refresh when teams or submissions change
    const channel = supabase.channel(`judge-dashboard-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `event_id=eq.${eventId}` }, () => {
        axios.get(api(`/api/judging/teams/${eventId}`)).then(res => setTeams(res.data.teams || []))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions', filter: `event_id=eq.${eventId}` }, () => {
        axios.get(api(`/api/judging/teams/${eventId}`)).then(res => setTeams(res.data.teams || []))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [eventId, judgeId])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [evtRes, teamsRes, rubricRes, scoresRes] = await Promise.all([
        axios.get(api(`/api/judging/event/${eventId}`)),
        axios.get(api(`/api/judging/teams/${eventId}`)),
        axios.get(api(`/api/judging/rubric/${eventId}`)),
        axios.get(api(`/api/judging/my-scores/${judgeId}/${eventId}`)),
      ])
      setEvent(evtRes.data.event)
      setTeams(teamsRes.data.teams || [])
      setRubric(rubricRes.data.criteria || [])
      setMyScores(scoresRes.data.scores || {})
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    return teams.filter(t =>
      t.name?.toLowerCase().includes(s) ||
      t.submissions?.[0]?.project_name?.toLowerCase().includes(s) ||
      t.track?.toLowerCase().includes(s)
    )
  }, [teams, search])

  const openTeam = (team) => {
    setSelectedTeam(team); setActiveTab("overview")
    setPlagiarism(null) // reset plagiarism result when switching teams
    const ex = myScores[team.id]
    if (ex) { setScores(ex.criteria_scores || {}); setFeedback(ex.raw_feedback_text || ""); setPrivateNotes(ex.private_notes || "") }
    else { const init = {}; rubric.forEach(c => { init[c.id] = 5 }); setScores(init); setFeedback(""); setPrivateNotes("") }
  }

  const weightedTotal = useMemo(() => {
    let t = 0; rubric.forEach(c => { t += ((scores[c.id] || 0) / 10) * c.weight }); return t.toFixed(1)
  }, [scores, rubric])

  const checkPlagiarism = async () => {
    const sub0 = selectedTeam?.submissions?.[0]
    if (!sub0?.id) return
    setCheckingPlagiarism(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const { data } = await axios.post(`${backendUrl}/api/ai/check-plagiarism`, {
        submissionId: sub0.id,
        eventId,
      })
      setPlagiarism(data)
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to check plagiarism.')
    } finally {
      setCheckingPlagiarism(false)
    }
  }


  const convertFeedbackToScores = async () => {
    if (!feedback.trim() || rubric.length === 0) return
    setAiScoring(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const { data } = await axios.post(`${backendUrl}/api/ai/score-from-feedback`, {
        feedback,
        criteria: rubric.map(c => ({ id: c.id, name: c.name, description: c.description, weight: c.weight })),
        submission: { project_name: sub0?.project_name, tagline: sub0?.tagline }
      })
      if (data.scores) {
        setScores(prev => {
          const updated = { ...prev }
          data.scores.forEach(({ criteriaId, score }) => { updated[criteriaId] = score })
          return updated
        })
        setSuccessMsg('AI adjusted scores based on your feedback!')
        setTimeout(() => setSuccessMsg(''), 3000)
      }
    } catch (err) {
      alert(err.response?.data?.error || 'AI scoring failed. Please try again.')
    } finally {
      setAiScoring(false)
    }
  }

  const submitScore = async () => {
    setSubmitting(true)
    try {
      await axios.post(api("/api/judging/submit-score"), { judgeId, teamId: selectedTeam.id, eventId, criteriaScores: scores, feedback, privateNotes })
      setMyScores(p => ({ ...p, [selectedTeam.id]: { criteria_scores: scores, raw_feedback_text: feedback, private_notes: privateNotes } }))
      setSuccessMsg(`Score saved for ${selectedTeam.name}!`)
      setTimeout(() => setSuccessMsg(""), 3000)
      setSelectedTeam(null)
    } catch (err) { alert(err.response?.data?.error || "Failed to submit.") }
    finally { setSubmitting(false) }
  }

  const saveProfile = async () => {
    if (!profileForm.name || !profileForm.profession) return
    setSavingProfile(true)
    try {
      await axios.put(api(`/api/judging/update-judge/${judgeId}`), profileForm)
      // update localStorage session
      const stored = JSON.parse(localStorage.getItem(`judge_session_${eventId}`) || '{}')
      const updated = { ...stored, name: profileForm.name, profession: profileForm.profession }
      localStorage.setItem(`judge_session_${eventId}`, JSON.stringify(updated))
      setSuccessMsg('Profile updated!')
      setTimeout(() => setSuccessMsg(''), 3000)
      setEditProfile(false)
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  const openEditProfile = () => {
    const stored = JSON.parse(localStorage.getItem(`judge_session_${eventId}`) || '{}')
    setProfileForm({ name: stored.name || judgeName, profession: stored.profession || '', expertise: stored.expertise || '' })
    setEditProfile(true)
  }

  const scored = Object.keys(myScores).length
  const sub0 = selectedTeam?.submissions?.[0]

  if (loading) return (
    <div className={`min-h-screen ${bg} flex items-center justify-center transition-colors`}>
      <div className="text-center">
        <Loader2 className={`h-8 w-8 animate-spin mx-auto mb-3 ${dark ? "text-gray-400" : "text-gray-600"}`} />
        <p className={`text-sm ${sub}`}>Loading judging panel...</p>
      </div>
    </div>
  )

  return (
    <div className={`min-h-screen ${bg} ${text} flex flex-col transition-colors duration-300`}>

      {/* Header */}
      <header className={`sticky top-0 z-20 border-b ${border} ${dark ? "bg-black/95" : "bg-white/95"} backdrop-blur-sm px-6 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs border ${dark ? "border-gray-700 bg-[#111] text-white" : "border-gray-200 bg-gray-100 text-black"}`}>N</div>
          <div>
            <span className={`font-bold text-sm ${text}`}>{event?.name || "NexusHack"}</span>
            {event?.tagline && <p className={`text-xs ${muted}`}>{event.tagline}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Score progress */}
          <div className={`hidden sm:flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border ${dark ? "border-gray-800 bg-[#111]" : "border-gray-200 bg-gray-50"}`}>
            <span className={sub}>{scored}/{teams.length} scored</span>
          </div>

          {/* Judge avatar - clickable to edit */}
          <div className="hidden sm:flex items-center gap-2 cursor-pointer group" onClick={openEditProfile} title="Edit profile">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border transition-all group-hover:ring-2 ${dark ? 'bg-[#222] border-gray-700 text-white group-hover:ring-gray-500' : 'bg-gray-100 border-gray-300 text-black group-hover:ring-gray-400'}`}>
              {judgeName.charAt(0).toUpperCase()}
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <p className={`text-sm font-semibold ${text}`}>{judgeName}</p>
                <Pencil className={`h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ${muted}`} />
              </div>
              <p className={`text-xs ${muted}`}>Judge</p>
            </div>
          </div>

          {/* Theme toggle */}
          <button onClick={toggleTheme} className={`p-2 rounded-lg border transition-all ${dark ? "border-gray-700 bg-[#111] text-gray-400 hover:text-white" : "border-gray-200 bg-gray-50 text-gray-500 hover:text-black"}`} title="Toggle theme">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Logout */}
          <button onClick={onLogout} className={`p-2 rounded-lg border transition-all ${dark ? "border-gray-700 bg-[#111] text-gray-400 hover:text-white" : "border-gray-200 bg-gray-50 text-gray-500 hover:text-black"}`} title="Switch judge">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Thin progress bar */}
      <div className={`h-0.5 ${dark ? "bg-gray-900" : "bg-gray-100"}`}>
        <div className={`h-full transition-all duration-500 ${dark ? "bg-white" : "bg-black"}`} style={{ width: `${teams.length ? (scored / teams.length) * 100 : 0}%` }} />
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-5 flex gap-5 overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>

        {/* Left Sidebar: Teams */}
        <aside className={`w-64 shrink-0 flex flex-col gap-3 border-r ${border} pr-4`}>
          {/* Search */}
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${muted}`} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search teams..."
              className={`w-full pl-8 pr-3 py-2 text-sm rounded-lg border focus:outline-none transition-colors ${inputCls}`} />
          </div>

          {/* Stats row */}
          <div className={`flex items-center justify-between text-xs ${muted} px-0.5`}>
            <span>{filtered.length} teams</span>
            <span className={`${dark ? "text-gray-500" : "text-gray-400"}`}>{teams.length - scored} pending</span>
          </div>

          {/* Team list */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
            {filtered.length === 0 ? (
              <p className={`text-sm text-center py-8 ${muted}`}>No teams found</p>
            ) : filtered.map(team => {
              const isScored = !!myScores[team.id]
              const isActive = selectedTeam?.id === team.id
              return (
                <button key={team.id} onClick={() => openTeam(team)}
                  className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all text-sm ${isActive ? activeRow : isScored ? scoredRow : `border-transparent ${hoverRow}`}`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold truncate ${text}`}>{team.name}</span>
                    {isScored
                      ? <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${dark ? "text-gray-400" : "text-green-600"}`} />
                      : <Clock className={`h-3.5 w-3.5 shrink-0 ${muted}`} />}
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${muted}`}>{team.submissions?.[0]?.project_name || "No submission"}</p>
                  {team.track && <span className={`text-[10px] px-1.5 py-0.5 rounded-full mt-1 inline-block border ${dark ? "border-gray-700 text-gray-400 bg-[#1a1a1a]" : "border-gray-200 text-gray-500 bg-gray-100"}`}>{team.track}</span>}
                </button>
              )
            })}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {!selectedTeam ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Trophy className={`h-14 w-14 mb-4 ${muted}`} />
              <h2 className={`text-xl font-bold mb-1 ${text}`}>Select a Team to Begin</h2>
              <p className={`text-sm mb-8 ${sub}`}>Choose any team from the list on the left to review their submission and submit your score.</p>
              <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
                {[{ label: "Total Teams", val: teams.length }, { label: "Scored", val: scored }, { label: "Remaining", val: teams.length - scored }].map(({ label, val }) => (
                  <div key={label} className={`rounded-xl p-4 text-center border ${card}`}>
                    <p className={`text-2xl font-black ${text}`}>{val}</p>
                    <p className={`text-xs ${muted}`}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-6">
              {/* Team header */}
              <div className={`flex items-start justify-between pb-4 border-b ${border}`}>
                <div>
                  <h2 className={`text-2xl font-black ${text}`}>{selectedTeam.name}</h2>
                  {sub0?.project_name && <p className={`font-medium mt-0.5 ${sub}`}>{sub0.project_name}</p>}
                </div>
                <button onClick={() => setSelectedTeam(null)} className={`p-1.5 rounded-lg transition-colors ${dark ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-black"}`}><X className="h-5 w-5" /></button>
              </div>

              {/* Tabs */}
              <div className={`flex gap-1 rounded-xl p-1 border w-fit ${dark ? "bg-[#111] border-gray-800" : "bg-gray-100 border-gray-200"}`}>
                {[["overview", "📋 Submission"], ["score", "⭐ Score"]].map(([tab, label]) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === tab ? `border ${dark ? "bg-[#1a1a1a] text-white border-gray-700" : "bg-white text-black border-gray-300 shadow-sm"}` : `${sub} hover:${text}`}`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Submission Tab */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  {!sub0 ? (
                    <div className={`p-8 text-center rounded-2xl border ${card} ${muted}`}>No submission found yet.</div>
                  ) : (
                    <>
                      {sub0.tagline && (
                        <div className={`p-4 rounded-xl border ${card}`}>
                          <p className={`italic ${sub}`}>"{sub0.tagline}"</p>
                        </div>
                      )}

                      {[
                        { icon: FileText, label: "Problem Statement", content: sub0.problem_statement },
                        { icon: Lightbulb, label: "What Makes It Unique", content: sub0.what_makes_unique },
                        { icon: Zap, label: "Challenges Faced", content: sub0.challenges_faced },
                      ].filter(s => s.content).map(({ icon: Icon, label, content }) => (
                        <div key={label} className={`rounded-xl border p-5 ${card}`}>
                          <div className={`flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider ${muted}`}>
                            <Icon className="h-3.5 w-3.5" />{label}
                          </div>
                          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${sub}`}>{content}</p>
                        </div>
                      ))}

                      {selectedTeam.team_members?.length > 0 && (
                        <div className={`rounded-xl border p-5 ${card}`}>
                          <div className={`flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider ${muted}`}><Users className="h-3.5 w-3.5" />Team Members</div>
                          <div className="flex flex-wrap gap-2">
                            {selectedTeam.team_members.map((m, i) => (
                              <span key={i} className={`text-xs border px-3 py-1 rounded-full ${dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"}`}>{m.users?.name || "Member"}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {sub0.tech_stack?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {sub0.tech_stack.map((t, i) => (
                            <span key={i} className={`text-xs border px-3 py-1 rounded-full ${dark ? "border-gray-700 text-gray-400" : "border-gray-200 text-gray-500"}`}>{t}</span>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {sub0.github_repo_url && <a href={sub0.github_repo_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-sm border px-4 py-2 rounded-xl transition-colors ${btnSecondary}`}><Code className="h-4 w-4" />Source Code</a>}
                        {sub0.demo_link && <a href={sub0.demo_link} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-sm border px-4 py-2 rounded-xl transition-colors ${btnSecondary}`}><ExternalLink className="h-4 w-4" />Demo</a>}
                        {sub0.ppt_url && <a href={sub0.ppt_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-sm border px-4 py-2 rounded-xl transition-colors ${btnSecondary}`}><FileText className="h-4 w-4" />Slides</a>}
                      </div>

                      {/* AI Plagiarism Check */}
                      <div className={`rounded-xl border p-4 ${card}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className={`flex items-center gap-2 text-sm font-bold ${text}`}>
                            🔍 AI Plagiarism Check
                          </div>
                          {sub0?.id && (
                            <button
                              onClick={checkPlagiarism}
                              disabled={checkingPlagiarism}
                              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${btnSecondary}`}
                            >
                              {checkingPlagiarism ? <><Loader2 className="h-3 w-3 animate-spin" />Analyzing...</> : "Run Check"}
                            </button>
                          )}
                        </div>

                        {!plagiarism && !checkingPlagiarism && (
                          <p className={`text-xs ${muted}`}>Click "Run Check" to compare this submission against all other teams using AI.</p>
                        )}

                        {checkingPlagiarism && (
                          <div className={`flex items-center gap-2 text-xs ${muted} py-2`}>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            AI is analyzing submissions for similarity...
                          </div>
                        )}

                        {plagiarism && !checkingPlagiarism && (
                          <div className="space-y-3">
                            {/* Risk badge */}
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border ${
                              plagiarism.overallRisk === 'RED'    ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                              plagiarism.overallRisk === 'YELLOW' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                                                                    'bg-green-500/10 border-green-500/30 text-green-400'
                            }`}>
                              {plagiarism.overallRisk === 'RED' ? '🚨 High Risk' : plagiarism.overallRisk === 'YELLOW' ? '⚠️ Moderate Risk' : '✅ Low Risk'}
                              &nbsp;— {plagiarism.overallRisk}
                            </div>

                            {/* Matches */}
                            {plagiarism.suspiciousMatches?.length > 0 ? (
                              <div className="space-y-2">
                                {plagiarism.suspiciousMatches.map((m, i) => (
                                  <div key={i} className={`p-3 rounded-lg border text-xs space-y-1 ${dark ? 'border-gray-700 bg-[#1a1a1a]' : 'border-gray-200 bg-gray-50'}`}>
                                    <div className="flex items-center justify-between">
                                      <span className={`font-semibold ${text}`}>Match with submission</span>
                                      <span className={`font-black ${m.similarityScore > 70 ? 'text-red-400' : m.similarityScore > 40 ? 'text-yellow-400' : 'text-green-400'}`}>
                                        {m.similarityScore}% similar
                                      </span>
                                    </div>
                                    <p className={muted}>{m.reasoning}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className={`text-xs ${muted}`}>No suspicious matches found.</p>
                            )}
                          </div>
                        )}
                      </div>

                      <button onClick={() => setActiveTab("score")} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors ${btnPrimary}`}>
                        Go to Scoring <ChevronRight className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Score Tab */}
              {activeTab === "score" && (
                <div className="space-y-4">
                  {/* Rubric */}
                  <div className={`rounded-2xl border p-5 space-y-5 ${card}`}>
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center gap-2 text-sm font-bold ${text}`}><Star className="h-4 w-4" />Scoring Rubric</div>
                      <div className={`px-4 py-1.5 rounded-xl border text-center ${dark ? "border-gray-700 bg-[#1a1a1a]" : "border-gray-200 bg-gray-50"}`}>
                        <span className={`text-2xl font-black ${text}`}>{weightedTotal}</span><span className={`text-sm ${muted}`}>/100</span>
                      </div>
                    </div>

                    {rubric.length === 0 ? (
                      <p className={`text-sm ${dark ? "text-yellow-600" : "text-yellow-700"}`}>No rubric criteria found. Contact the organiser.</p>
                    ) : rubric.map(c => (
                      <div key={c.id} className="space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className={`font-semibold text-sm ${text}`}>{c.name}
                              <span className={`ml-2 text-xs font-normal border px-2 py-0.5 rounded-full ${dark ? "border-gray-700 text-gray-500" : "border-gray-200 text-gray-400"}`}>{c.weight}% weight</span>
                            </div>
                            {c.description && <p className={`text-xs mt-0.5 ${muted}`}>{c.description}</p>}
                          </div>
                          <span className={`text-2xl font-black tabular-nums w-8 text-right shrink-0 ${text}`}>{scores[c.id] ?? 5}</span>
                        </div>
                        <input type="range" min="0" max="10" step="0.5" value={scores[c.id] ?? 5}
                          onChange={e => setScores(p => ({ ...p, [c.id]: parseFloat(e.target.value) }))}
                          className={`w-full cursor-pointer ${dark ? "accent-white" : "accent-black"}`} />
                        <div className={`flex justify-between text-xs ${muted}`}><span>0 — Poor</span><span>5 — Average</span><span>10 — Excellent</span></div>
                      </div>
                    ))}
                  </div>

                  {/* Feedback */}
                  <div className={`rounded-2xl border p-5 space-y-2 ${card}`}>
                    <div className={`flex items-center gap-2 text-sm font-bold ${text}`}><MessageSquare className="h-4 w-4" />Feedback for Team <span className={`font-normal text-xs ${muted}`}>(team will see this)</span></div>
                      <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={3}
                        placeholder="e.g. Great problem statement! The technical implementation was solid..."
                        className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none transition-colors resize-none ${inputCls}`} />
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={convertFeedbackToScores}
                          disabled={aiScoring || !feedback.trim() || rubric.length === 0}
                          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                            dark ? "bg-violet-500/10 text-violet-400 border-violet-500/30 hover:bg-violet-500/20" : "bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100"
                          }`}
                        >
                          {aiScoring ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Analyzing...</> : <><Zap className="h-3.5 w-3.5" />Auto-Score with AI</>}
                        </button>
                      </div>
                    </div>

                  {/* Private Notes */}
                  <div className={`rounded-2xl border p-5 space-y-2 ${card}`}>
                    <div className={`flex items-center gap-2 text-sm font-bold ${text}`}>
                      <span className={`text-xs border px-2 py-0.5 rounded-full ${dark ? "border-gray-700 text-gray-500" : "border-gray-200 text-gray-400"}`}>Private</span>
                      Private Notes <span className={`font-normal text-xs ${muted}`}>(only you see this)</span>
                    </div>
                    <textarea value={privateNotes} onChange={e => setPrivateNotes(e.target.value)} rows={2}
                      placeholder="Internal notes..."
                      className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none transition-colors resize-none ${inputCls}`} />
                  </div>

                  <button onClick={submitScore} disabled={submitting || rubric.length === 0}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${btnPrimary}`}>
                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : <><CheckCircle2 className="h-4 w-4" />Submit Score</>}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Success toast */}
      {successMsg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl border text-sm font-semibold ${dark ? "bg-[#111] border-gray-700 text-white" : "bg-white border-gray-200 text-black shadow-lg"}`}>
          <CheckCircle2 className="h-4 w-4 text-green-500" />{successMsg}
        </div>
      )}
      {/* Edit Profile Modal */}
      {editProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-2xl border shadow-2xl ${card}`}>
            <div className={`flex items-center justify-between p-5 border-b ${border}`}>
              <h3 className={`font-bold ${text}`}>Edit Profile</h3>
              <button onClick={() => setEditProfile(false)} className={`p-1.5 rounded-lg ${dark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black'}`}><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { key: 'name', label: 'Full Name *', placeholder: 'Your name' },
                { key: 'profession', label: 'Profession / Role *', placeholder: 'e.g. Software Engineer' },
                { key: 'expertise', label: 'Area of Expertise', placeholder: 'e.g. AI/ML, Web3' },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <label className={`text-xs font-semibold uppercase tracking-wider ${muted}`}>{label}</label>
                  <input
                    value={profileForm[key]}
                    onChange={e => setProfileForm(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none transition-colors ${inputCls}`}
                  />
                </div>
              ))}
              <button
                onClick={saveProfile}
                disabled={savingProfile || !profileForm.name || !profileForm.profession}
                className={`w-full py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${btnPrimary}`}
              >
                {savingProfile ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : <><CheckCircle2 className="h-4 w-4" />Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
