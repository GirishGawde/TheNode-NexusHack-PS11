"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

export default function OrganiserRegister() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    college: "", // Organization
    city: "",
    password: "",
    confirmPassword: ""
  })

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { role: 'organiser', name: formData.name }
        }
      })
      
      if (authError) throw authError
      
      const { error: dbError } = await supabase.from("users").insert({
        id: authData.user.id,
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        college: formData.college, // Using college field for organization
        city: formData.city,
        role: "organiser"
      })
      
      if (dbError) throw dbError
      
      router.push("/dashboard/organiser")
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex items-center justify-center p-6 relative overflow-hidden">
      
      <Card className="z-10 w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-cyan-400">Organiser Registration</CardTitle>
          <CardDescription className="text-center">
            Create an account to host and manage events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label>Work Email *</Label>
                <Input type="email" name="email" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label>Organization/College *</Label>
                <Input name="college" value={formData.college} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input name="mobile" value={formData.mobile} onChange={handleChange} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>City</Label>
                <Input name="city" value={formData.city} onChange={handleChange} />
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
            
            {error && <p className="text-sm text-red-500">{error}</p>}
            
            <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700" disabled={loading}>
              {loading ? "Creating account..." : "Register as Organiser"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login/organiser" className="ml-1 text-cyan-400 hover:text-cyan-300">
            Login here
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
