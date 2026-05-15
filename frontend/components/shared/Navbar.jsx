"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Menu, X, LogOut, User as UserIcon, Pencil, Loader2, CheckCircle2, ChevronLeft } from "lucide-react"
import { toast } from "react-hot-toast"

export default function Navbar({ role }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
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
      toast.error("Failed to update profile: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  const initials = user?.name?.charAt(0)?.toUpperCase() || "?"

  const navStyle = {
    background: "var(--nav-bg)",
    borderBottom: "1px solid var(--border)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
  }

  return (
    <>
      <nav className="sticky top-0 z-50" style={navStyle}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo and Back Button */}
            <div className="flex items-center gap-2">
              {pathname !== `/dashboard/${role}` && pathname !== '/' && (
                <button 
                  onClick={() => router.back()} 
                  className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  title="Go back"
                >
                  <ChevronLeft className="h-5 w-5" style={{ color: "var(--text-secondary)" }} />
                </button>
              )}
              <Link href={`/dashboard/${role}`} className="flex-shrink-0">
                <span className="text-xl font-bold" style={{ color: "var(--accent)", letterSpacing: "-0.02em" }}>
                  Nexus<span style={{ color: "var(--text-secondary)" }}>Hack</span>
                </span>
              </Link>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-4">
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-3 focus:outline-none hover:opacity-80 transition-opacity"
                  >
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{user.name}</span>
                    {user.profile_picture_url ? (
                      <img src={user.profile_picture_url} alt="Profile" className="h-8 w-8 rounded-full object-cover" style={{ border: "2px solid var(--accent)" }} />
                    ) : (
                      <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "var(--accent)", color: "var(--text-on-accent)" }}>
                        {initials}
                      </div>
                    )}
                  </button>

                  {dropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-48 rounded-xl py-1 shadow-2xl z-50"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                    >
                      {role === 'participant' ? (
                        <Link
                          href={`/dashboard/participant/profile`}
                          onClick={() => setDropdownOpen(false)}
                          className="block w-full text-left px-4 py-2 text-sm transition-colors hover:opacity-80"
                          style={{ color: "var(--text-primary)" }}
                        >
                          Edit Profile
                        </Link>
                      ) : (
                        <button
                          onClick={() => { setDropdownOpen(false); setEditOpen(true); }}
                          className="block w-full text-left px-4 py-2 text-sm transition-colors hover:opacity-80"
                          style={{ color: "var(--text-primary)" }}
                        >
                          Edit Profile
                        </button>
                      )}
                      {role === 'participant' && (
                        <Link
                          href={`/dashboard/participant/invites`}
                          onClick={() => setDropdownOpen(false)}
                          className="block w-full text-left px-4 py-2 text-sm transition-colors hover:opacity-80"
                          style={{ color: "var(--text-primary)" }}
                        >
                          Team Invites
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm transition-colors hover:opacity-80"
                        style={{ color: "#ef4444", borderTop: "1px solid var(--border)", marginTop: "4px", paddingTop: "8px" }}
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="-mr-2 flex md:hidden">
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card)" }}>
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {role === 'participant' ? (
                <Link
                  href={`/dashboard/participant/profile`}
                  onClick={() => setIsOpen(false)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:opacity-80"
                  style={{ color: "var(--text-primary)" }}
                >
                  <UserIcon className="h-5 w-5" style={{ color: "var(--accent)" }} />
                  <span>{user?.name || "Edit Profile"}</span>
                  <Pencil className="h-3.5 w-3.5 ml-auto" style={{ color: "var(--text-muted)" }} />
                </Link>
              ) : (
                <button
                  onClick={() => { setIsOpen(false); setEditOpen(true) }}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:opacity-80"
                  style={{ color: "var(--text-primary)" }}
                >
                  <UserIcon className="h-5 w-5" style={{ color: "var(--accent)" }} />
                  <span>{user?.name || "Edit Profile"}</span>
                  <Pencil className="h-3.5 w-3.5 ml-auto" style={{ color: "var(--text-muted)" }} />
                </button>
              )}
              {role === 'participant' && (
                <Link
                  href={`/dashboard/participant/invites`}
                  onClick={() => setIsOpen(false)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:opacity-80"
                  style={{ color: "var(--text-primary)" }}
                >
                  <UserIcon className="h-5 w-5" style={{ color: "var(--accent)" }} />
                  <span>Team Invites</span>
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md transition-colors"
                style={{ color: "#ef4444" }}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
          <div className="w-full max-w-sm rounded-2xl shadow-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            {/* Header */}
            <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid var(--border)" }}>
              <h3 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>Edit Profile</h3>
              <button onClick={() => setEditOpen(false)} className="p-1.5 rounded-lg transition-colors hover:opacity-70" style={{ color: "var(--text-muted)" }}>
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Avatar */}
            <div className="flex justify-center pt-6 pb-2">
              <div className="h-16 w-16 rounded-full flex items-center justify-center text-2xl font-black" style={{ background: "var(--accent)", color: "var(--text-on-accent)", border: "3px solid var(--bg)" }}>
                {form.name?.charAt(0)?.toUpperCase() || initials}
              </div>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Full Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your full name"
                  className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none transition-colors"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Email <span className="normal-case font-normal">(read-only)</span>
                </label>
                <input
                  value={form.email}
                  readOnly
                  className="w-full px-4 py-2.5 rounded-lg text-sm cursor-not-allowed"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)", opacity: 0.7 }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Bio <span className="normal-case font-normal">(optional)</span>
                </label>
                <textarea
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="A short bio about yourself..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none transition-colors resize-none"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="w-full py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "var(--accent)", color: "var(--text-on-accent)" }}
              >
                {saved ? (
                  <><CheckCircle2 className="h-4 w-4" />Saved!</>
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
