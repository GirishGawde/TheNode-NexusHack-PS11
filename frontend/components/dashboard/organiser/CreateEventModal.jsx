import { useState } from "react"
import { supabase } from "@/lib/supabase"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Sparkles, Plus, Trash2 } from "lucide-react"
import { toast } from "react-hot-toast"

export default function CreateEventModal({ onClose, onCreated }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  
  const [eventData, setEventData] = useState({
    name: "",
    tagline: "",
    description: "",
    start_date: "",
    end_date: "",
    registration_deadline: "",
    submission_deadline: "",
    max_participants: 500,
    min_team_size: 1,
    max_team_size: 4,
    allow_solo: true,
    venue_name: "",
    primary_color: "#7C3AED",
    secondary_color: "#06B6D4",
    judging_mode: "HYBRID",
    two_phase_judging: false,
  })
  
  const [tracks, setTracks] = useState([""])
  const [prizes, setPrizes] = useState({ "1st_place": "", "2nd_place": "", "3rd_place": "" })
  const [rubric, setRubric] = useState([
    { name: "Innovation", weight: 25, description: "How unique is the idea?" },
    { name: "Technical Implementation", weight: 25, description: "How well is it built?" },
    { name: "UI/UX", weight: 25, description: "Is the design user-friendly?" },
    { name: "Business Value", weight: 25, description: "Does it solve a real problem?" }
  ])
  
  const [logoFile, setLogoFile] = useState(null)
  const [bannerFile, setBannerFile] = useState(null)

  const handleChange = (e) => {
    setEventData({ ...eventData, [e.target.name]: e.target.value })
  }

  const handlePrizeChange = (e) => {
    setPrizes({ ...prizes, [e.target.name]: e.target.value })
  }

  const handleTrackChange = (index, value) => {
    const newTracks = [...tracks]
    newTracks[index] = value
    setTracks(newTracks)
  }

  const addTrack = () => setTracks([...tracks, ""])
  
  const removeTrack = (index) => {
    const newTracks = tracks.filter((_, i) => i !== index)
    setTracks(newTracks)
  }

  const handleRubricChange = (index, field, value) => {
    const newRubric = [...rubric]
    newRubric[index][field] = field === 'weight' ? Number(value) : value
    setRubric(newRubric)
  }
  
  const addRubricCriteria = () => {
    setRubric([...rubric, { name: "", weight: 0, description: "" }])
  }
  
  const removeRubricCriteria = (index) => {
    setRubric(rubric.filter((_, i) => i !== index))
  }

  const suggestRubric = async () => {
    setAiLoading(true)
    try {
      const { data } = await api.post("/api/ai/suggest-rubric", {
        eventName: eventData.name,
        tracks: tracks.filter(Boolean),
        description: eventData.description
      })
      if (data.criteria && data.criteria.length > 0) {
        setRubric(data.criteria)
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to get AI suggestions")
    } finally {
      setAiLoading(false)
    }
  }

  const uploadFile = async (file, path) => {
    const { data, error } = await supabase.storage
      .from("events")
      .upload(path, file, { upsert: true })
    if (error) throw error
    
    const { data: { publicUrl } } = supabase.storage
      .from("events")
      .getPublicUrl(path)
      
    return publicUrl
  }

  const handlePublish = async (e) => {
    e.preventDefault()
    
    // Validate rubric weights
    const totalWeight = rubric.reduce((sum, c) => sum + c.weight, 0)
    if (totalWeight !== 100) {
      toast.error(`Rubric weights must sum to 100. Current sum: ${totalWeight}`)
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const eventId = crypto.randomUUID()
      
      let logoUrl = null
      let bannerUrl = null
      
      if (logoFile) logoUrl = await uploadFile(logoFile, `${eventId}/logo.png`)
      if (bannerFile) bannerUrl = await uploadFile(bannerFile, `${eventId}/banner.jpg`)

      const cleanedTracks = tracks.filter(t => t.trim() !== "")
      const cleanedPrizes = Object.fromEntries(Object.entries(prizes).filter(([_, v]) => v.trim() !== ""))

      // Insert Event
      const { error: eventError } = await supabase.from("events").insert({
        id: eventId,
        organiser_id: session.user.id,
        ...eventData,
        tracks: cleanedTracks,
        prizes: cleanedPrizes,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        status: "PUBLISHED"
      })
      
      if (eventError) throw eventError

      // Insert Rubric
      if (rubric.length > 0) {
        const rubricRows = rubric.map((r, i) => ({
          id: crypto.randomUUID(),
          event_id: eventId,
          name: r.name,
          weight: r.weight,
          description: r.description,
          order_index: i
        }))
        
        const { error: rubricError } = await supabase.from("rubric_criteria").insert(rubricRows)
        if (rubricError) throw rubricError
      }

      onCreated()
      toast.success("Event created successfully!")
    } catch (err) {
      console.error(err)
      toast.error("Error creating event: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0A0A0F] border border-white/10 rounded-xl w-full max-w-4xl shadow-2xl relative flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white z-10">
          <X className="h-6 w-6" />
        </button>
        
        <div className="p-6 border-b border-white/10 flex items-center gap-4 shrink-0">
          <h2 className="text-2xl font-bold text-white">Create New Event</h2>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
            <span className={step >= 1 ? "text-cyan-400" : ""}>1. Details</span>
            <span>&rarr;</span>
            <span className={step >= 2 ? "text-cyan-400" : ""}>2. Branding</span>
            <span>&rarr;</span>
            <span className={step >= 3 ? "text-cyan-400" : ""}>3. Judging</span>
          </div>
        </div>

        <div className="p-6 overflow-y-auto">
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Event Name *</Label>
                  <Input name="name" value={eventData.name} onChange={handleChange} required />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Tagline</Label>
                  <Input name="tagline" value={eventData.tagline} onChange={handleChange} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <textarea 
                    name="description"
                    value={eventData.description}
                    onChange={handleChange}
                    className="w-full h-32 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 resize-none"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Start Date & Time *</Label>
                  <Input type="datetime-local" name="start_date" value={eventData.start_date} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label>End Date & Time *</Label>
                  <Input type="datetime-local" name="end_date" value={eventData.end_date} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Registration Deadline *</Label>
                  <Input type="datetime-local" name="registration_deadline" value={eventData.registration_deadline} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Submission Deadline *</Label>
                  <Input type="datetime-local" name="submission_deadline" value={eventData.submission_deadline} onChange={handleChange} required />
                </div>

                <div className="space-y-2">
                  <Label>Max Participants</Label>
                  <Input type="number" name="max_participants" value={eventData.max_participants} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>Team Size (Min - Max)</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" name="min_team_size" value={eventData.min_team_size} onChange={handleChange} className="w-20" min="1" />
                    <span>-</span>
                    <Input type="number" name="max_team_size" value={eventData.max_team_size} onChange={handleChange} className="w-20" min="1" />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Tracks / Themes</Label>
                  {tracks.map((track, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <Input value={track} onChange={(e) => handleTrackChange(i, e.target.value)} placeholder={`Track ${i + 1}`} />
                      <Button variant="ghost" size="icon" onClick={() => removeTrack(i)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addTrack} className="gap-2 text-cyan-400 border-cyan-900/50 hover:bg-cyan-900/20">
                    <Plus className="h-4 w-4" /> Add Track
                  </Button>
                </div>
                
                <div className="space-y-4 md:col-span-2 p-4 bg-white/5 border border-white/10 rounded-xl">
                  <Label className="text-lg text-yellow-400">Prizes</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>1st Place</Label>
                      <Input name="1st_place" value={prizes["1st_place"]} onChange={handlePrizeChange} placeholder="e.g. $5000" />
                    </div>
                    <div className="space-y-2">
                      <Label>2nd Place</Label>
                      <Input name="2nd_place" value={prizes["2nd_place"]} onChange={handlePrizeChange} placeholder="e.g. $3000" />
                    </div>
                    <div className="space-y-2">
                      <Label>3rd Place</Label>
                      <Input name="3rd_place" value={prizes["3rd_place"]} onChange={handlePrizeChange} placeholder="e.g. $1000" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} className="bg-cyan-600 hover:bg-cyan-700 w-32">Next Step</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Venue Name / Location</Label>
                <Input name="venue_name" value={eventData.venue_name} onChange={handleChange} placeholder="e.g. College Auditorium (or Online)" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Event Logo (Square)</Label>
                  <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} />
                </div>
                <div className="space-y-2">
                  <Label>Event Banner (16:9)</Label>
                  <Input type="file" accept="image/*" onChange={(e) => setBannerFile(e.target.files[0])} />
                </div>
                
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input type="color" name="primary_color" value={eventData.primary_color} onChange={handleChange} className="w-16 h-10 p-1" />
                    <Input value={eventData.primary_color} onChange={handleChange} name="primary_color" className="flex-1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input type="color" name="secondary_color" value={eventData.secondary_color} onChange={handleChange} className="w-16 h-10 p-1" />
                    <Input value={eventData.secondary_color} onChange={handleChange} name="secondary_color" className="flex-1" />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)} className="bg-cyan-600 hover:bg-cyan-700 w-32">Next Step</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Judging Rubric</h3>
                  <p className="text-sm text-slate-400">Total weight must equal 100%</p>
                </div>
                <Button 
                  onClick={suggestRubric} 
                  variant="outline" 
                  disabled={aiLoading}
                  className="gap-2 border-violet-500/50 text-violet-400 hover:bg-violet-900/20"
                >
                  <Sparkles className="h-4 w-4" />
                  {aiLoading ? "Generating..." : "Suggest with AI"}
                </Button>
              </div>

              <div className="space-y-3">
                {rubric.map((criteria, i) => (
                  <div key={i} className="flex flex-col md:flex-row items-start md:items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg">
                    <div className="w-full md:w-1/4">
                      <Label className="text-xs mb-1 block">Criteria Name</Label>
                      <Input value={criteria.name} onChange={(e) => handleRubricChange(i, 'name', e.target.value)} />
                    </div>
                    <div className="w-full md:w-1/2">
                      <Label className="text-xs mb-1 block">Description</Label>
                      <Input value={criteria.description} onChange={(e) => handleRubricChange(i, 'description', e.target.value)} />
                    </div>
                    <div className="w-full md:w-24">
                      <Label className="text-xs mb-1 block">Weight (%)</Label>
                      <Input type="number" value={criteria.weight} onChange={(e) => handleRubricChange(i, 'weight', e.target.value)} min="1" max="100" />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeRubricCriteria(i)} className="text-red-400 hover:text-red-300 md:mt-5">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <div className="flex items-center justify-between mt-4">
                  <Button variant="ghost" onClick={addRubricCriteria} className="text-cyan-400">
                    <Plus className="h-4 w-4 mr-2" /> Add Criteria
                  </Button>
                  <div className="text-slate-300 font-medium">
                    Total: <span className={rubric.reduce((s, c) => s + c.weight, 0) === 100 ? "text-green-400" : "text-red-400"}>
                      {rubric.reduce((s, c) => s + c.weight, 0)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/10">
                <div className="space-y-2">
                  <Label>Judging Mode</Label>
                  <select 
                    name="judging_mode" 
                    value={eventData.judging_mode} 
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"
                  >
                    <option value="HYBRID">Hybrid (Score + Labels + AI)</option>
                    <option value="NUMERICAL">Numerical Scores Only</option>
                    <option value="LABEL">Labels Only (Good, Bad, etc)</option>
                  </select>
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                  <label className="flex items-center gap-3 cursor-pointer p-2 border border-white/10 rounded-md bg-white/5 h-10">
                    <input 
                      type="checkbox" 
                      name="two_phase_judging"
                      checked={eventData.two_phase_judging}
                      onChange={(e) => setEventData({ ...eventData, two_phase_judging: e.target.checked })}
                      className="accent-cyan-500"
                    />
                    <span className="text-sm">Enable Two-Phase Judging</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={handlePublish} disabled={loading} className="bg-cyan-600 hover:bg-cyan-700 w-40">
                  {loading ? "Publishing..." : "Publish Event"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
