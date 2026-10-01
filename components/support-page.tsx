"use client"

import { useState, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  MessagesSquare,
  Search,
  Send,
  Building2,
  Inbox,
  ChevronLeft,
} from "lucide-react"
import Link from "next/link"
import { apiClient, extractErrorMessage, type ConciergeThread, type ConciergeMessage } from "@/lib/api-client"
import { toast } from "sonner"

export function SupportPage() {
  const queryClient = useQueryClient()
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [replyText, setReplyText] = useState("")
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Fetch all threads
  const { data: rawThreads = [], isLoading: threadsLoading } = useQuery({
    queryKey: ["concierge-threads"],
    queryFn: () => apiClient.getConciergeThreads(),
    refetchInterval: 10000,
  })

  const threads: ConciergeThread[] = Array.isArray(rawThreads)
    ? rawThreads
    : (rawThreads as any)?.threads && Array.isArray((rawThreads as any).threads)
    ? (rawThreads as any).threads
    : []

  // Auto-select first thread if none selected (on larger screens)
  useEffect(() => {
    if (!selectedUserId && threads.length > 0) {
      if (typeof window !== "undefined" && window.innerWidth >= 640) {
        setSelectedUserId(threads[0].user_id)
      }
    }
  }, [threads, selectedUserId])

  // Fetch messages for selected thread
  const { data: rawMessages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["concierge-thread", selectedUserId],
    queryFn: () => (selectedUserId ? apiClient.getConciergeThread(selectedUserId) : []),
    enabled: !!selectedUserId,
    refetchInterval: 5000,
  })

  const messages: ConciergeMessage[] = Array.isArray(rawMessages)
    ? rawMessages
    : (rawMessages as any)?.messages && Array.isArray((rawMessages as any).messages)
    ? (rawMessages as any).messages
    : []

  // Scroll to bottom without scrolling outer window/page
  const scrollToBottom = (smooth = true) => {
    const el = messagesContainerRef.current
    if (!el) return
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    })
  }

  useEffect(() => {
    scrollToBottom(false)
  }, [selectedUserId])

  useEffect(() => {
    scrollToBottom(true)
  }, [messages])

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: () => {
      if (!selectedUserId || !replyText.trim()) throw new Error("Missing message")
      return apiClient.replyConciergeThread(selectedUserId, replyText.trim())
    },
    onSuccess: () => {
      setReplyText("")
      toast.success("Reply sent to customer")
      queryClient.invalidateQueries({ queryKey: ["concierge-thread", selectedUserId] })
      queryClient.invalidateQueries({ queryKey: ["concierge-threads"] })
    },
    onError: (err: any) => {
      toast.error(extractErrorMessage(err, "Failed to send reply"))
    },
  })

  const handleSend = () => {
    if (replyText.trim() && !replyMutation.isPending) {
      replyMutation.mutate()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  const filteredThreads = threads.filter((t: any) => {
    const q = searchQuery.toLowerCase()
    return (
      (t.full_name || "").toLowerCase().includes(q) ||
      (t.company_name || "").toLowerCase().includes(q) ||
      (t.email || "").toLowerCase().includes(q) ||
      (t.last_body || "").toLowerCase().includes(q)
    )
  })

  const selectedThread = threads.find((t: any) => t.user_id === selectedUserId)
  const awaitingReplyCount = threads.filter((t: any) => t.awaiting_reply).length

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] min-h-[550px] space-y-3">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Concierge Support Chat</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Direct two-way messaging with mobile app customers (&quot;Talk to a Human&quot;).
          </p>
        </div>
        {awaitingReplyCount > 0 && (
          <Badge className="bg-amber-500 text-white font-semibold text-xs px-3 py-1 self-start sm:self-auto">
            {awaitingReplyCount} customer{awaitingReplyCount === 1 ? "" : "s"} awaiting reply
          </Badge>
        )}
      </div>

      {/* Main Two-Pane Chat Container */}
      <Card className="flex-1 min-h-0 overflow-hidden border shadow-sm flex flex-col">
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Pane: Customer Threads List */}
          <div
            className={`w-full sm:w-80 md:w-88 lg:w-96 flex-shrink-0 border-r flex flex-col bg-muted/20 min-h-0 ${
              selectedUserId ? "hidden sm:flex" : "flex"
            }`}
          >
            {/* Search Input */}
            <div className="p-3 border-b bg-card flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search customer chats..."
                  className="pl-8 h-8 text-xs bg-muted/30"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Threads List */}
            <div className="flex-1 overflow-y-auto divide-y divide-border min-h-0">
              {threadsLoading ? (
                <div className="py-12 text-center text-xs text-muted-foreground">Loading customer threads...</div>
              ) : filteredThreads.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground px-4">
                  <Inbox className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="font-semibold text-foreground">No active chat threads</p>
                  <p className="mt-1">Messages sent from the mobile app &quot;Support&quot; screen will appear here.</p>
                </div>
              ) : (
                filteredThreads.map((thread: any) => {
                  const isSelected = thread.user_id === selectedUserId
                  const title = thread.company_name || thread.full_name || thread.email || ("Customer " + (thread.user_id || "").slice(0, 8))
                  const initials = title.substring(0, 2).toUpperCase()

                  return (
                    <button
                      key={thread.user_id}
                      onClick={() => setSelectedUserId(thread.user_id)}
                      className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 ${
                        isSelected
                          ? "bg-accent/15 border-l-4 border-l-primary"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {title}
                          </p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {thread.last_at ? new Date(thread.last_at).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {thread.last_body || "No messages"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          {thread.awaiting_reply && (
                            <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0 h-4 font-semibold">
                              Awaiting Reply
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {thread.message_count} msg{thread.message_count === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Pane: Active Conversation */}
          <div
            className={`flex-1 flex flex-col bg-card min-h-0 min-w-0 ${
              selectedUserId ? "flex" : "hidden sm:flex"
            }`}
          >
            {selectedThread ? (
              <>
                {/* Conversation Header */}
                <div className="h-16 border-b px-4 sm:px-5 flex items-center justify-between bg-card flex-shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="sm:hidden h-8 w-8 -ml-1 text-muted-foreground flex-shrink-0"
                      onClick={() => setSelectedUserId(null)}
                      title="Back to all chats"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Avatar className="h-9 w-9 ring-1 ring-border flex-shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                        {(selectedThread.company_name || selectedThread.full_name || "C").substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 truncate">
                        <p className="font-bold text-sm text-foreground truncate">
                          {selectedThread.company_name || selectedThread.full_name || "Customer"}
                        </p>
                        {selectedThread.full_name && selectedThread.company_name && (
                          <span className="text-xs text-muted-foreground hidden md:inline truncate">({selectedThread.full_name})</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{selectedThread.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" asChild className="h-8 text-xs gap-1.5">
                      <Link href={`/dashboard/businesses?open=${selectedThread.user_id}`}>
                        <Building2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Company Record</span>
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Message Stream */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-muted/10 min-h-0"
                >
                  {messagesLoading ? (
                    <div className="py-12 text-center text-xs text-muted-foreground">Loading conversation...</div>
                  ) : messages.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      No messages recorded in this conversation yet.
                    </div>
                  ) : (
                    messages.map((msg: any) => {
                      const isBroker = msg.sender === "broker"
                      return (
                        <div
                          key={msg.id || msg._id}
                          className={`flex flex-col ${isBroker ? "items-end" : "items-start"}`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            <span className="text-[10px] font-semibold text-muted-foreground">
                              {isBroker ? (msg.broker_name || "Price Buddy Desk") : (selectedThread.full_name || "Customer")}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                            </span>
                          </div>
                          <div
                            className={`max-w-md rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                              isBroker
                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                : "bg-card border text-foreground rounded-tl-none"
                            }`}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Reply Input Bar */}
                <div className="p-3 border-t bg-card flex-shrink-0 space-y-2">
                  <div className="relative">
                    <Textarea
                      placeholder="Type your reply to the customer... (Ctrl+Enter to send)"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="min-h-[75px] max-h-32 pr-12 text-sm resize-none bg-muted/20"
                    />
                    <Button
                      size="icon"
                      onClick={handleSend}
                      disabled={!replyText.trim() || replyMutation.isPending}
                      className="absolute right-2.5 bottom-2.5 h-8 w-8"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                    <span>Replies send push notifications directly to the customer&apos;s phone.</span>
                    <span className="hidden sm:inline">Press Ctrl+Enter to send</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <MessagesSquare className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <h3 className="font-semibold text-foreground text-sm">Select a Conversation</h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  Choose a customer chat thread from the left pane to view conversation history and send replies.
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
