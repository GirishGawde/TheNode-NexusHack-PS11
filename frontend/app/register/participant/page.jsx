"use client"

import { useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import SignatureCanvas from "react-signature-canvas"
import { useTheme } from "@/lib/ThemeProvider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

export default function ParticipantRegister() {
  const router = useRouter()
  const sigCanvas = useRef(null)
  const { theme } = useTheme()
  
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [userAuth, setUserAuth] = useState(null)
  
  // Step 1 Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    college: "",
    city: "",
    state: "",
    year_of_study: "1",
    github_username: "",
    linkedin_url: "",
    password: "",
    confirmPassword: ""
  })
  
  const [profilePic, setProfilePic] = useState(null)
  const [collegeIdPic, setCollegeIdPic] = useState(null)
  const [skills, setSkills] = useState([])
  const [skillInput, setSkillInput] = useState("")

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

  const handleStep1Submit = async (e) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // 1. Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { role: 'participant', name: formData.name }
        }
      })
      
      if (authError) throw authError
      const userId = authData.user.id
      setUserAuth(authData.user)
      
      // 2. Upload Profile Picture if exists
      let profileUrl = null
      if (profilePic) {
        profileUrl = await uploadFile(profilePic, `${userId}/avatar.jpg`)
      }
      
      // 3. Insert into users table
      const { error: dbError } = await supabase.from("users").insert({
        id: userId,
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        college: formData.college,
        city: formData.city,
        state: formData.state,
        year_of_study: parseInt(formData.year_of_study),
        github_username: formData.github_username,
        linkedin_url: formData.linkedin_url,
        skills: skills,
        profile_picture_url: profileUrl,
        role: "participant"
      })
      
      if (dbError) throw dbError
      
      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStep2Submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const userId = userAuth.id
      let collegeIdUrl = null
      let signatureUrl = null
      
      if (collegeIdPic) {
        collegeIdUrl = await uploadFile(collegeIdPic, `${userId}/college_id.jpg`)
      }
      
      if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
        const sigData = sigCanvas.current.getCanvas().toDataURL("image/png")
        // Convert base64 to Blob
        const res = await fetch(sigData)
        const blob = await res.blob()
        signatureUrl = await uploadFile(blob, `${userId}/signature.png`)
      }
      
      const { error: updateError } = await supabase.from("users").update({
        college_id_url: collegeIdUrl,
        signature_url: signatureUrl
      }).eq("id", userId)
      
      if (updateError) throw updateError
      
      router.push("/dashboard/participant")
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex items-center justify-center p-6 relative overflow-hidden">
      
      <Card className="z-10 w-full max-w-2xl my-8">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Participant Registration</CardTitle>
          <CardDescription className="text-center">
            {step === 1 ? "Step 1: Basic Details" : "Step 2: Verification"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-md text-sm">{error}</div>}
          
          {step === 1 ? (
            <form onSubmit={handleStep1Submit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input name="name" value={formData.name} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" name="email" value={formData.email} onChange={handleChange} required />
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
                    className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
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
                    />
                    <Button type="button" variant="secondary" onClick={handleAddSkill}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {skills.map(skill => (
                      <span key={skill} className="px-3 py-1 bg-violet-600/30 border border-violet-500/30 rounded-full text-xs flex items-center gap-1">
                        {skill}
                        <button type="button" onClick={() => handleRemoveSkill(skill)} className="text-violet-300 hover:text-white ml-1">&times;</button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Profile Picture</Label>
                  <Input type="file" accept="image/*" onChange={(e) => setProfilePic(e.target.files[0])} />
                </div>

                <div className="space-y-2">
                  <Label>Password *</Label>
                  <Input type="password" name="password" value={formData.password} onChange={handleChange} required minLength={6} />
                </div>
                <div className="space-y-2">
                  <Label>Confirm Password *</Label>
                  <Input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required minLength={6} />
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Next Step"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleStep2Submit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>College ID Card (Image) *</Label>
                  <Input type="file" accept="image/*" onChange={(e) => setCollegeIdPic(e.target.files[0])} required />
                </div>
                
                <div className="space-y-2">
                  <Label>Digital Signature *</Label>
                  <div className="border border-white/10 rounded-md bg-white/5 overflow-hidden">
                    <SignatureCanvas 
                      ref={sigCanvas}
                      penColor={theme === "light" ? "black" : "white"}
                      canvasProps={{ className: "w-full h-40" }}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => sigCanvas.current?.clear()} className="mt-1">
                    Clear Signature
                  </Button>
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Complete Registration"}
              </Button>
            </form>
          )}
        </CardContent>
        {step === 1 && (
          <CardFooter className="flex justify-center text-sm text-slate-400 border-t border-white/5 pt-4">
            Already have an account?{" "}
            <Link href="/login/participant" className="ml-1 text-violet-400 hover:text-violet-300">
              Login here
            </Link>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
