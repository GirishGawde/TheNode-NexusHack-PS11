"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import Navbar from "@/components/shared/Navbar"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "react-hot-toast"
import { Copy } from "lucide-react"

export default function EditProfile() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [user, setUser] = useState(null)
  
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    college: "",
    city: "",
    state: "",
    year_of_study: "1",
    github_username: "",
    linkedin_url: "",
  })
  
  const [skills, setSkills] = useState([])
  const [skillInput, setSkillInput] = useState("")
  const [profilePic, setProfilePic] = useState(null)

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/login/participant")
        return
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single()
        
      if (error) throw error
      
      setUser(data)
      setFormData({
        name: data.name || "",
        mobile: data.mobile || "",
        college: data.college || "",
        city: data.city || "",
        state: data.state || "",
        year_of_study: data.year_of_study?.toString() || "1",
        github_username: data.github_username || "",
        linkedin_url: data.linkedin_url || "",
      })
      setSkills(data.skills || [])
    } catch (err) {
      console.error(err)
      setError("Failed to load profile data")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleAddSkill = (e) => {
    e.preventDefault()
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()])
      setSkillInput("")
    }
  }

  const handleRemoveSkill = (skill) => {
    setSkills(skills.filter(s => s !== skill))
  }

  const uploadFile = async (file, path) => {
    const { data, error } = await supabase.storage
      .from("profiles")
      .upload(path, file, { upsert: true })
    if (error) throw error
    
    const { data: { publicUrl } } = supabase.storage
      .from("profiles")
      .getPublicUrl(path)
      
    return publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    
    try {
      let profileUrl = user.profile_picture_url
      if (profilePic) {
        profileUrl = await uploadFile(profilePic, `${user.id}/avatar.jpg`)
      }
      
      const { error: dbError } = await supabase.from("users").update({
        name: formData.name,
        mobile: formData.mobile,
        college: formData.college,
        city: formData.city,
        state: formData.state,
        year_of_study: parseInt(formData.year_of_study),
        github_username: formData.github_username,
        linkedin_url: formData.linkedin_url,
        skills: skills,
        profile_picture_url: profileUrl,
      }).eq('id', user.id)
      
      if (dbError) throw dbError
      
      setSuccess("Profile updated successfully!")
      
      // Update local state to reflect new picture if uploaded
      if (profilePic) {
         setUser({...user, profile_picture_url: profileUrl})
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <Navbar role="participant" />
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-slate-400">Loading profile...</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <Navbar role="participant" />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Edit Profile</h1>
          <p className="text-slate-400">Update your personal and professional details.</p>
        </div>

        <div className="bg-[#11111A] border border-white/10 rounded-xl p-6 sm:p-8">
          {error && <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 text-red-400 rounded-md text-sm">{error}</div>}
          {success && <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 text-green-400 rounded-md text-sm">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Profile Picture Section */}
            <div className="flex items-center gap-6 pb-6 border-b border-white/10">
              <div className="shrink-0">
                {profilePic ? (
                  <img src={URL.createObjectURL(profilePic)} alt="New Profile" className="h-24 w-24 rounded-full object-cover border border-white/20" />
                ) : user?.profile_picture_url ? (
                  <img src={user.profile_picture_url} alt="Profile" className="h-24 w-24 rounded-full object-cover border border-white/20" />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-violet-600 flex items-center justify-center text-3xl font-medium border border-white/20">
                    {formData.name?.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <Label className="block mb-2">Change Profile Picture</Label>
                <Input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setProfilePic(e.target.files[0])} 
                  className="max-w-xs"
                />
                <p className="text-xs text-slate-400 mt-2">JPG, GIF or PNG. Max size of 2MB.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label>Email (Read Only)</Label>
                <Input value={user?.email || ""} disabled className="opacity-50" />
              </div>
              <div className="space-y-2 md:col-span-2 mb-4 p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <Label className="flex justify-between items-center text-violet-300">
                  <span>User ID (UUID - Required for Telegram Bot)</span>
                  <button 
                    type="button" 
                    onClick={() => { navigator.clipboard.writeText(user?.id); toast.success("UUID copied to clipboard!"); }}
                    className="flex items-center gap-1 text-xs text-violet-400 hover:text-white transition-colors bg-white/5 px-2 py-1 rounded"
                  >
                    <Copy className="h-3 w-3" /> Copy ID
                  </button>
                </Label>
                <Input value={user?.id || ""} disabled className="opacity-70 font-mono text-sm mt-2 bg-black/40 border-white/10 text-slate-300" />
              </div>
              <div className="space-y-2">
                <Label>Mobile</Label>
                <Input name="mobile" value={formData.mobile} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>College *</Label>
                <Input name="college" value={formData.college} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input name="city" value={formData.city} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input name="state" value={formData.state} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Year of Study</Label>
                <select 
                  name="year_of_study" 
                  value={formData.year_of_study} 
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-white/10 bg-[#0A0A0F] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
                >
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                  <option value="5">Alumni/Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>GitHub Username</Label>
                <Input name="github_username" value={formData.github_username} onChange={handleChange} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>LinkedIn URL</Label>
                <Input name="linkedin_url" value={formData.linkedin_url} onChange={handleChange} />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label>Skills</Label>
                <div className="flex gap-2">
                  <Input 
                    value={skillInput} 
                    onChange={(e) => setSkillInput(e.target.value)} 
                    placeholder="e.g. React, Node.js, Python" 
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSkill(e)}
                  />
                  <Button type="button" variant="secondary" onClick={handleAddSkill}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {skills.map(skill => (
                    <span key={skill} className="px-3 py-1 bg-violet-600/30 border border-violet-500/30 rounded-full text-xs flex items-center gap-1">
                      {skill}
                      <button type="button" onClick={() => handleRemoveSkill(skill)} className="text-violet-300 hover:text-white ml-1">&times;</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-white/10 flex justify-end gap-4">
              <Button type="button" variant="ghost" onClick={() => router.push('/dashboard/participant')}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-700">
                {saving ? "Saving Changes..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
