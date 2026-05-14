'use client'
import { useState } from "react"
import axios from "axios"
import { User, Briefcase, Mail, ArrowRight, Loader2, Sun, Moon } from "lucide-react"

export default function JudgeRegistration({ eventId, eventName, inviteToken, onComplete, theme, toggleTheme }) {
  const [form, setForm] = useState({ name: "", email: "", profession: "", expertise: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const dark = theme === "dark"
  const bg = dark ? "bg-black" : "bg-white"
  const card = dark ? "bg-[#111] border-gray-800" : "bg-gray-50 border-gray-200"
  const text = dark ? "text-white" : "text-black"
  const sub = dark ? "text-gray-400" : "text-gray-500"
  const inputCls = dark
    ? "bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-600 focus:border-gray-400"
    : "bg-white border-gray-300 text-black placeholder:text-gray-400 focus:border-gray-600"
  const labelCls = dark ? "text-gray-400" : "text-gray-500"
  const iconCls = dark ? "text-gray-600" : "text-gray-400"

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.profession) { setError("Please fill in all required fields."); return }
    setError(""); setLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
      const { data } = await axios.post(`${backendUrl}/api/judging/register-judge`, { ...form, eventId, inviteToken })
      localStorage.setItem(`judge_session_${eventId}`, JSON.stringify({ judgeId: data.judgeId, name: form.name, email: form.email, profession: form.profession }))
      onComplete({ judgeId: data.judgeId, name: form.name })
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.")
    } finally { setLoading(false) }
  }

  return (
    <div className={`min-h-screen ${bg} flex items-center justify-center p-4 transition-colors duration-300`}>
      {/* Theme toggle */}
      <button onClick={toggleTheme} className={`fixed top-5 right-5 p-2.5 rounded-full border transition-all ${dark ? "border-gray-700 bg-[#111] text-gray-300 hover:text-white" : "border-gray-200 bg-white text-gray-500 hover:text-black"} shadow-sm`}>
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 border ${dark ? "bg-[#111] border-gray-800" : "bg-gray-100 border-gray-200"}`}>
            <span className={`text-lg font-black ${text}`}>N</span>
          </div>
          <h1 className={`text-2xl font-black mb-1 ${text}`}>NexusHack</h1>
          <p className={`text-sm ${sub}`}>You've been invited to judge</p>
          {eventName && <p className={`font-semibold mt-1 ${text}`}>{eventName}</p>}
        </div>

        {/* Card */}
        <div className={`border rounded-2xl p-8 ${card}`}>
          <h2 className={`text-lg font-bold mb-1 ${text}`}>Judge Registration</h2>
          <p className={`text-sm mb-6 ${sub}`}>No account or password required.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { name: "name", label: "Full Name *", placeholder: "Dr. Jane Smith", Icon: User, type: "text" },
              { name: "email", label: "Email Address *", placeholder: "judge@company.com", Icon: Mail, type: "email" },
              { name: "profession", label: "Profession / Role *", placeholder: "e.g. Software Engineer, VC, Professor", Icon: Briefcase, type: "text" },
            ].map(({ name, label, placeholder, Icon, type }) => (
              <div key={name} className="space-y-1.5">
                <label className={`text-xs font-semibold uppercase tracking-wider ${labelCls}`}>{label}</label>
                <div className="relative">
                  <Icon className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconCls}`} />
                  <input name={name} type={type} value={form[name]} onChange={e => setForm({ ...form, [name]: e.target.value })} placeholder={placeholder} required={label.includes("*")}
                    className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none transition-colors ${inputCls}`} />
                </div>
              </div>
            ))}

            <div className="space-y-1.5">
              <label className={`text-xs font-semibold uppercase tracking-wider ${labelCls}`}>Area of Expertise <span className="normal-case font-normal">(optional)</span></label>
              <input name="expertise" value={form.expertise} onChange={e => setForm({ ...form, expertise: e.target.value })} placeholder="e.g. AI/ML, Web3, HealthTech"
                className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none transition-colors ${inputCls}`} />
            </div>

            {error && <div className={`p-3 rounded-lg text-sm border ${dark ? "bg-red-950/50 border-red-900 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}>{error}</div>}

            <button type="submit" disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all mt-2 disabled:opacity-50 ${dark ? "bg-white text-black hover:bg-gray-100" : "bg-black text-white hover:bg-gray-900"}`}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Setting up...</> : <>Enter Judging Panel <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
        </div>

        <p className={`text-center text-xs mt-5 ${dark ? "text-gray-700" : "text-gray-400"}`}>
          By entering, you agree to evaluate projects fairly and confidentially.
        </p>
      </div>
    </div>
  )
}
