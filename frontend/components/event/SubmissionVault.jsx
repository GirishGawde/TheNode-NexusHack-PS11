import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import api from "@/lib/axios"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Lock, UploadCloud, AlertCircle } from "lucide-react"

export default function SubmissionVault({ event, team }) {
  const [submission, setSubmission] = useState({
    project_name: "",
    tagline: "",
    problem_statement: "",
    github_repo_url: "",
    demo_link: "",
    tech_stack: "",
    what_makes_unique: "",
    challenges_faced: ""
  })
  const [githubUsernames, setGithubUsernames] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState("DRAFT")
  const [healthScore, setHealthScore] = useState(0)
  
  const isLeader = team?.leader_id && team?.leader_id !== null // simplified check

  useEffect(() => {
    fetchSubmission()
  }, [team.id])

  useEffect(() => {
    calculateHealthScore()
  }, [submission])

  const fetchSubmission = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .eq("team_id", team.id)
        .single()
        
      if (data) {
        setSubmission({
          project_name: data.project_name || "",
          tagline: data.tagline || "",
          problem_statement: data.problem_statement || "",
          github_repo_url: data.github_repo_url || "",
          demo_link: data.demo_link || "",
          tech_stack: data.tech_stack?.join(", ") || "",
          what_makes_unique: data.what_makes_unique || "",
          challenges_faced: data.challenges_faced || ""
        })
        setGithubUsernames(data.github_usernames?.join(", ") || "")
        setStatus(data.status)
        setHealthScore(data.health_score || 0)
      }
    } catch (err) {
      if (err.code !== 'PGRST116') { // not found is ok
        console.error(err)
      }
    } finally {
      setLoading(false)
    }
  }

  const calculateHealthScore = () => {
    let score = 0
    if (submission.project_name?.trim()) score += 15
    if (submission.tagline?.trim()) score += 10
    if (submission.problem_statement?.trim()) score += 20
    if (submission.github_repo_url?.trim()) score += 20
    if (submission.demo_link?.trim()) score += 20
    if (submission.tech_stack?.trim()) score += 15
    setHealthScore(score)
  }

  const handleChange = (e) => {
    setSubmission({ ...submission, [e.target.name]: e.target.value })
  }

  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from("submissions").upsert({
        team_id: team.id,
        event_id: event.id,
        ...submission,
        tech_stack: submission.tech_stack.split(",").map(s => s.trim()).filter(Boolean),
        github_usernames: githubUsernames.split(",").map(s => s.trim()).filter(Boolean),
        health_score: healthScore,
        status: "DRAFT"
      }, { onConflict: 'team_id, event_id' })
      
      if (error) throw error
      alert("Draft saved successfully!")
    } catch (err) {
      alert("Failed to save draft: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (healthScore < 100) {
      alert("Please fill all mandatory fields before submitting.")
      return
    }
    
    if (!confirm("Are you sure you want to submit? You can still edit until the deadline.")) {
      return
    }
    
    setSubmitting(true)
    try {
      // First save draft
      await handleSaveDraft()
      
      // Call Express API to trigger AI summary and plagiarism check
      await api.post("/api/submissions/submit", {
        teamId: team.id,
        eventId: event.id,
        ...submission,
        tech_stack: submission.tech_stack.split(",").map(s => s.trim()).filter(Boolean),
        github_usernames: githubUsernames.split(",").map(s => s.trim()).filter(Boolean),
      })
      
      setStatus("SUBMITTED")
      alert("Project submitted successfully!")
    } catch (err) {
      alert("Failed to submit: " + (err.response?.data?.error || err.message))
    } finally {
      setSubmitting(false)
    }
  }

  const isLocked = new Date() > new Date(event.submission_deadline)

  if (loading) return <div className="py-12 text-center text-slate-400">Loading vault...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Submission Vault</h2>
          <p className="text-slate-400">Your team's workspace. Auto-locks at deadline.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-4 py-2 rounded-lg">
          <span className="text-sm text-slate-300">Health Score</span>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-black/50 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  healthScore === 100 ? 'bg-green-500' : 
                  healthScore > 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${healthScore}%` }}
              />
            </div>
            <span className="font-mono text-sm font-bold text-white">{healthScore}/100</span>
          </div>
        </div>
      </div>

      {isLocked && (
        <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-start gap-3">
          <Lock className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-400 font-bold">Vault Locked</h3>
            <p className="text-red-300/80 text-sm">The submission deadline has passed. No further edits can be made.</p>
          </div>
        </div>
      )}

      {status === "SUBMITTED" && !isLocked && (
        <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-green-400 font-bold">Successfully Submitted</h3>
            <p className="text-green-300/80 text-sm">Your project is submitted! You can continue updating it until the deadline.</p>
          </div>
        </div>
      )}

      <Card className={`border-white/10 ${isLocked ? 'opacity-70 pointer-events-none' : ''}`}>
        <CardHeader>
          <CardTitle>Mandatory Information</CardTitle>
          <CardDescription>All fields below are required to reach a 100/100 health score.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Project Name <span className="text-red-400">*</span></Label>
              <Input name="project_name" value={submission.project_name} onChange={handleChange} placeholder="NexusHack Platform" />
            </div>
            <div className="space-y-2">
              <Label>Tagline (max 140 chars) <span className="text-red-400">*</span></Label>
              <Input name="tagline" value={submission.tagline} onChange={handleChange} maxLength={140} placeholder="The ultimate hackathon management tool" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Problem Statement <span className="text-red-400">*</span></Label>
            <textarea 
              name="problem_statement"
              value={submission.problem_statement}
              onChange={handleChange}
              className="w-full h-24 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 resize-none"
              placeholder="What problem does your project solve?"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>GitHub Repo URL <span className="text-red-400">*</span></Label>
              <Input name="github_repo_url" value={submission.github_repo_url} onChange={handleChange} placeholder="https://github.com/..." />
            </div>
            <div className="space-y-2">
              <Label>Live Demo Link <span className="text-red-400">*</span></Label>
              <Input name="demo_link" value={submission.demo_link} onChange={handleChange} placeholder="https://..." />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tech Stack (comma separated) <span className="text-red-400">*</span></Label>
              <Input name="tech_stack" value={submission.tech_stack} onChange={handleChange} placeholder="React, Node.js, PostgreSQL" />
            </div>
            <div className="space-y-2">
              <Label>GitHub Usernames (comma separated)</Label>
              <Input value={githubUsernames} onChange={(e) => setGithubUsernames(e.target.value)} placeholder="user1, user2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={`border-white/10 ${isLocked ? 'opacity-70 pointer-events-none' : ''}`}>
        <CardHeader>
          <CardTitle>Additional Details (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>What makes your solution unique?</Label>
            <textarea 
              name="what_makes_unique"
              value={submission.what_makes_unique}
              onChange={handleChange}
              className="w-full h-24 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Challenges Faced</Label>
            <textarea 
              name="challenges_faced"
              value={submission.challenges_faced}
              onChange={handleChange}
              className="w-full h-24 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {!isLocked && (
        <div className="flex flex-col sm:flex-row gap-4 justify-end">
          <Button variant="outline" onClick={handleSaveDraft} disabled={saving || submitting} className="hover:bg-white/5">
            {saving ? "Saving..." : "Save Draft"}
          </Button>
          
          <Button 
            onClick={handleSubmit} 
            disabled={saving || submitting || healthScore < 100} 
            className={`${healthScore === 100 ? 'bg-green-600 hover:bg-green-700' : 'bg-violet-600'}`}
          >
            {submitting ? "Submitting..." : status === "SUBMITTED" ? "Update Submission" : "Final Submit"}
          </Button>
        </div>
      )}
    </div>
  )
}
