"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Menu, X, LogOut, User as UserIcon } from "lucide-react"

export default function Navbar({ role }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single()
        setUser(profile)
      }
    }
    fetchUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
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
            <div className="ml-4 flex items-center md:ml-6 gap-4">
              {user && (
                <div className="relative">
                  <button 
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-3 focus:outline-none hover:opacity-80 transition-opacity"
                  >
                    <span className="text-sm text-slate-300">{user.name}</span>
                    {user.profile_picture_url ? (
                      <img src={user.profile_picture_url} alt="Profile" className="h-8 w-8 rounded-full border border-white/20 object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-violet-600 flex items-center justify-center text-sm font-medium border border-white/20">
                        {user.name?.charAt(0)}
                      </div>
                    )}
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-[#11111A] border border-white/10 rounded-md shadow-xl py-1 z-50">
                      <Link 
                        href={`/dashboard/${role}/profile`}
                        onClick={() => setDropdownOpen(false)}
                        className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                      >
                        Edit Profile
                      </Link>
                      <Link 
                        href={`/dashboard/${role}/invites`}
                        onClick={() => setDropdownOpen(false)}
                        className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                      >
                        Team Invites
                      </Link>
                      <button 
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 border-t border-white/10 mt-1 pt-2"
                      >
                        Logout
                      </button>
                    </div>
                  )}
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
            <div className="flex items-center gap-3 px-3 py-2 text-slate-300">
              <UserIcon className="h-5 w-5" />
              <span>{user?.name || "Profile"}</span>
            </div>
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
  )
}
