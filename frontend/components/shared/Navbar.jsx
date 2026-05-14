"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Menu, X, LogOut, User as UserIcon, Pencil, Loader2, CheckCircle2 } from "lucide-react"

export default function Navbar({ role }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", bio: "" })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single()
      if (profile) {
        setUser(profile)
        setForm({ name: profile.name || "", email: profile.email || session.user.email || "", bio: profile.bio || "" })
      }
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { error } = await supabase
        .from("users")
        .update({ name: form.name, bio: form.bio })
        .eq("id", session.user.id)
      if (error) throw error
      setUser(u => ({ ...u, name: form.name, bio: form.bio }))
      setSaved(true)
      setTimeout(() => { setSaved(false); setEditOpen(false) }, 1500)
    } catch (err) {
      alert("Failed to update profile: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  const initials = user?.name?.charAt(0)?.toUpperCase() || "?"

  return (
    <>
      <nav className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href={`/dashboard/${role}`} className="flex-shrink-0">
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-cyan-400">
                  NexusHack
                </span>
              </Link>
            </div>

            <div className="hidden md:block">
              <div className="ml-4 flex items-center md:ml-6 gap-3">
                {user && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-300">{user.name}</span>

                    {/* Clickable avatar — opens Edit Profile */}
                    <button
                      onClick={() => setEditOpen(true)}
                      className="group relative h-8 w-8 rounded-full border border-white/20 overflow-hidden hover:ring-2 hover:ring-violet-500/50 transition-all"
                      title="Edit Profile"
                    >
                      {user.profile_picture_url ? (
                        <img src={user.profile_picture_url} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-violet-600 flex items-center justify-center text-sm font-medium">
                          {initials}
                        </div>
                      )}
                      {/* Pencil overlay on hover */}
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Pencil className="h-3 w-3 text-white" />
                      </div>
                    </button>

                    <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                      <LogOut className="h-5 w-5 text-slate-400" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="-mr-2 flex md:hidden">
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#0A0A0F]">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <button
                onClick={() => { setIsOpen(false); setEditOpen(true) }}
                className="w-full text-left flex items-center gap-3 px-3 py-2 text-slate-300 hover:bg-white/5 rounded-md"
              >
                <UserIcon className="h-5 w-5" />
                <span>{user?.name || "Edit Profile"}</span>
                <Pencil className="h-3.5 w-3.5 text-slate-500 ml-auto" />
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-white/5 rounded-md"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Edit Profile Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h3 className="font-bold text-white">Edit Profile</h3>
              <button onClick={() => setEditOpen(false)} className="p-1.5 text-slate-500 hover:text-white rounded-lg transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Avatar preview */}
            <div className="flex justify-center pt-6 pb-2">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-violet-600 flex items-center justify-center text-2xl font-black text-white border-2 border-white/10">
                  {form.name?.charAt(0)?.toUpperCase() || initials}
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Full Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your full name"
                  className="w-full px-4 py-2.5 rounded-lg bg-[#1a1a1a] border border-gray-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email <span className="normal-case font-normal text-gray-600">(read-only)</span></label>
                <input
                  value={form.email}
                  readOnly
                  className="w-full px-4 py-2.5 rounded-lg bg-[#0d0d0d] border border-gray-800 text-gray-500 text-sm cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bio <span className="normal-case font-normal text-gray-600">(optional)</span></label>
                <textarea
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="A short bio about yourself..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg bg-[#1a1a1a] border border-gray-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-gray-500 transition-colors resize-none"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="w-full py-2.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saved ? (
                  <><CheckCircle2 className="h-4 w-4 text-green-600" />Saved!</>
                ) : saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
