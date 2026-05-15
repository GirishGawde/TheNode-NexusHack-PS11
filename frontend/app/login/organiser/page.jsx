"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

export default function OrganiserLogin() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (signInError) throw signInError
      
      // Verify role
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .single()
        
      if (profile?.role !== "organiser") {
        await supabase.auth.signOut()
        throw new Error("You do not have organiser access.")
      }
      
      router.push("/dashboard/organiser")
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex items-center justify-center p-6 relative overflow-hidden">
      
      <Card className="z-10 w-full max-w-md border-cyan-900/50">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-cyan-400">Organiser Portal</CardTitle>
          <CardDescription className="text-center">
            Login to manage your NexusHack events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Work Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            {error && <p className="text-sm text-red-500">{error}</p>}
            
            <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700" disabled={loading}>
              {loading ? "Authenticating..." : "Login"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-slate-400">
          Want to host an event?{" "}
          <Link href="/register/organiser" className="ml-1 text-cyan-400 hover:text-cyan-300">
            Register here
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
