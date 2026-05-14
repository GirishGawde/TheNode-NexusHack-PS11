"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import api from "@/lib/axios"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, MessageSquare, Trash2, AlertTriangle } from "lucide-react"

export default function TeamChat({ team, user }) {
  const teamId = team?.id;
  const myMembership = team?.team_members?.find(m => m.user_id === user?.id);
  const joinedAt = myMembership?.joined_at;

  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [showClearModal, setShowClearModal] = useState(false)
  const [clearLoading, setClearLoading] = useState(false)
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
        fetchUserForMessage(payload.new)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'team_messages',
        filter: `team_id=eq.${teamId}`
      }, (payload) => {
        // Update message in-place (soft delete / edit)
        setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m))
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
      let query = supabase
        .from("team_messages")
        .select(`*, users(name, profile_picture_url)`)
        .eq("team_id", teamId)
        
      // Only show messages from after the user joined the team
      if (joinedAt) {
        query = query.gte("created_at", joinedAt)
      }
        
      const { data, error } = await query.order("created_at", { ascending: true })
        
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
      
    setMessages(prev => {
      if (prev.some(m => m.id === message.id)) return prev;
      return [...prev, { ...message, users: data }];
    });
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !user) return
    
    const content = newMessage.trim()
    setNewMessage("") // optimistic clear
    
    try {
      const { data, error } = await supabase
        .from("team_messages")
        .insert({ team_id: teamId, user_id: user.id, content })
        .select()
        .single()
        
      if (error) throw error

      if (data) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, { ...data, users: { name: user.user_metadata?.name || user.name, profile_picture_url: user.user_metadata?.profile_picture_url || user.profile_picture_url } }];
        });
      }
    } catch (err) {
      console.error("Error sending message:", err)
      setNewMessage(content) // restore on error
    }
  }

  const handleDeleteMessage = async (messageId) => {
    // Optimistic soft-delete: replace content locally
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: '<DELETED_MESSAGE>', is_deleted: true } : m));
    try {
      await api.delete(`/api/teams/${teamId}/messages/${messageId}`);
    } catch (err) {
      console.error("Failed to delete message:", err);
      fetchMessages(); // Restore state
    }
  }

  const handleClearChat = async () => {
    setClearLoading(true)
    try {
      await api.delete(`/api/teams/${teamId}/messages`);
      setMessages([]);
      setShowClearModal(false);
    } catch (err) {
      console.error("Failed to clear chat:", err);
    } finally {
      setClearLoading(false)
    }
  }

  if (loading) return <div className="py-12 text-center text-slate-400">Loading chat...</div>

  return (
    <>
      {/* Clear Chat Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a2e] border border-red-500/30 rounded-xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Clear Chat?</h3>
            </div>
            <p className="text-slate-400 text-sm mb-6">
              This will permanently delete all messages for <span className="text-white font-medium">all team members</span>. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setShowClearModal(false)}
                disabled={clearLoading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleClearChat}
                disabled={clearLoading}
              >
                {clearLoading ? "Clearing..." : "Clear Chat"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto h-[600px] flex flex-col bg-[#1a1a2e]/50 border border-white/10 rounded-xl overflow-hidden">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-white">Team Chat</h2>
          </div>
          {user?.id === team?.leader_id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowClearModal(true)}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-3 text-xs"
            >
              Clear Chat
            </Button>
          )}
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
              const isDeleted = msg.is_deleted || msg.content === '<DELETED_MESSAGE>'
              const showName = idx === 0 || messages[idx-1].user_id !== msg.user_id
              
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {showName && !isMe && (
                    <span className="text-xs text-slate-400 ml-10 mb-1">{msg.users?.name || 'Unknown'}</span>
                  )}
                  <div className={`group relative flex gap-2 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isMe && showName ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-violet-900/50 flex items-center justify-center text-xs text-white border border-white/10">
                        {msg.users?.profile_picture_url ? (
                          <img src={msg.users.profile_picture_url} alt={msg.users.name} className="w-full h-full object-cover" />
                        ) : (
                          msg.users?.name?.charAt(0) || '?'
                        )}
                      </div>
                    ) : (
                      <div className="w-8 flex-shrink-0" />
                    )}
                    
                    {/* Delete button on hover for own non-deleted messages */}
                    {isMe && !isDeleted && (
                      <button 
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="absolute -left-8 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete message"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}

                    <div 
                      className={`px-4 py-2 rounded-2xl ${
                        isDeleted
                          ? 'bg-white/5 border border-white/10'
                          : isMe 
                            ? 'bg-violet-600 text-white rounded-tr-sm' 
                            : 'bg-white/10 text-slate-200 rounded-tl-sm'
                      }`}
                    >
                      {isDeleted ? (
                        <p className="text-slate-500 text-sm italic flex items-center gap-1.5">
                          <Trash2 className="h-3 w-3" />
                          This message was deleted
                        </p>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${isMe ? 'text-violet-300 text-right' : 'text-slate-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </>
                      )}
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
    </>
  )
}
