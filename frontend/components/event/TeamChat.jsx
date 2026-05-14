import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, MessageSquare } from "lucide-react"

export default function TeamChat({ teamId, user }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    fetchMessages()
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel(`team-chat-${teamId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'team_messages',
        filter: `team_id=eq.${teamId}`
      }, (payload) => {
        // Fetch user data for the new message to get the name
        fetchUserForMessage(payload.new)
      })
      .subscribe()
      
    return () => {
      supabase.removeChannel(channel)
    }
  }, [teamId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("team_messages")
        .select(`
          *,
          users(name, profile_picture_url)
        `)
        .eq("team_id", teamId)
        .order("created_at", { ascending: true })
        
      if (error) throw error
      setMessages(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserForMessage = async (message) => {
    const { data } = await supabase
      .from("users")
      .select("name, profile_picture_url")
      .eq("id", message.user_id)
      .single()
      
    setMessages(prev => [...prev, { ...message, users: data }])
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !user) return
    
    const content = newMessage.trim()
    setNewMessage("") // optimistic clear
    
    try {
      const { error } = await supabase
        .from("team_messages")
        .insert({
          team_id: teamId,
          user_id: user.id,
          content: content
        })
        
      if (error) throw error
    } catch (err) {
      console.error("Error sending message:", err)
      setNewMessage(content) // restore on error
    }
  }

  if (loading) return <div className="py-12 text-center text-slate-400">Loading chat...</div>

  return (
    <div className="max-w-4xl mx-auto h-[600px] flex flex-col bg-[#1a1a2e]/50 border border-white/10 rounded-xl overflow-hidden">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center gap-3">
        <MessageSquare className="h-5 w-5 text-violet-400" />
        <h2 className="text-lg font-semibold text-white">Team Chat</h2>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
            <MessageSquare className="h-12 w-12 mb-4" />
            <p>Start the conversation with your team!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.user_id === user?.id
            const showName = idx === 0 || messages[idx-1].user_id !== msg.user_id
            
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {showName && !isMe && (
                  <span className="text-xs text-slate-400 ml-10 mb-1">{msg.users?.name || 'Unknown'}</span>
                )}
                <div className={`flex gap-2 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isMe && showName ? (
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-violet-900/50 flex items-center justify-center text-xs text-white border border-white/10">
                      {msg.users?.profile_picture_url ? (
                        <img src={msg.users.profile_picture_url} alt={msg.users.name} className="w-full h-full object-cover" />
                      ) : (
                        msg.users?.name?.charAt(0) || '?'
                      )}
                    </div>
                  ) : (
                    <div className="w-8 flex-shrink-0" /> // Spacer
                  )}
                  
                  <div 
                    className={`px-4 py-2 rounded-2xl ${
                      isMe 
                        ? 'bg-violet-600 text-white rounded-tr-sm' 
                        : 'bg-white/10 text-slate-200 rounded-tl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${isMe ? 'text-violet-300 text-right' : 'text-slate-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div className="p-4 bg-white/5 border-t border-white/10">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-black/20"
          />
          <Button type="submit" disabled={!newMessage.trim()} size="icon" className="bg-violet-600 hover:bg-violet-700">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
