"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, User } from "lucide-react"

interface TicketDetailsDialogProps {
  ticket: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TicketDetailsDialog({ ticket, open, onOpenChange }: TicketDetailsDialogProps) {
  const [newMessage, setNewMessage] = useState("")
  const queryClient = useQueryClient()

  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => apiClient.addTicketMessage({ id: ticket?.id, message }),
    onSuccess: () => {
      toast.success("Message sent successfully")
      setNewMessage("")
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
    },
    onError: () => {
      toast.error("Failed to send message")
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: string) => apiClient.updateTicket({ id: ticket?.id, data: { status: newStatus } }),
    onSuccess: () => {
      toast.success("Ticket status updated")
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
    },
    onError: () => {
      toast.error("Failed to update ticket status")
    },
  })

  if (!ticket) return null

  const handleSendMessage = () => {
    if (!newMessage.trim()) return
    sendMessageMutation.mutate(newMessage)
  }

  const handleStatusUpdate = (newStatus: string) => {
    updateStatusMutation.mutate(newStatus)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{ticket.id}</DialogTitle>
              <DialogDescription className="mt-1">{ticket.subject}</DialogDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant={ticket.priority === "High" ? "destructive" : "default"}>{ticket.priority}</Badge>
              <Badge variant={ticket.status === "Resolved" ? "secondary" : "default"}>{ticket.status}</Badge>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Ticket Info Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Company</p>
                    <p className="font-medium">{ticket.customer}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{ticket.customerEmail}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground">Category</p>
                    <Badge variant="outline" className="mt-1">
                      {ticket.category}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned To</p>
                    <p className="font-medium">{ticket.assignee}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="font-medium">{new Date(ticket.created).toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Update Ticket</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select defaultValue={ticket.status} onValueChange={handleStatusUpdate}>
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Resolved">Resolved</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select defaultValue={ticket.priority}>
                      <SelectTrigger id="priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="assignee">Assignee</Label>
                    <Select defaultValue={ticket.assignee}>
                      <SelectTrigger id="assignee">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Support Team">Support Team</SelectItem>
                        <SelectItem value="Finance Team">Finance Team</SelectItem>
                        <SelectItem value="Account Manager">Account Manager</SelectItem>
                        <SelectItem value="Tech Support">Tech Support</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Messages */}
            <div className="lg:col-span-2 flex flex-col">
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-sm">Conversation</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="space-y-4">
                    {ticket.messages.map((message: any) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${message.from === "agent" ? "flex-row-reverse" : ""}`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {message.from === "customer" ? (
                              <User className="h-4 w-4" />
                            ) : (
                              message.author.substring(0, 2)
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`flex-1 space-y-1 ${message.from === "agent" ? "text-right" : ""}`}>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{message.author}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(message.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <div
                            className={`rounded-lg p-3 text-sm ${
                              message.from === "agent"
                                ? "bg-primary text-primary-foreground ml-auto max-w-md"
                                : "bg-muted max-w-md"
                            }`}
                          >
                            {message.content}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="reply">Your Response</Label>
                    <Textarea
                      id="reply"
                      placeholder="Type your response to the customer..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="min-h-24"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">
                        Add Internal Note
                      </Button>
                      <Button size="sm" onClick={handleSendMessage}>
                        <Send className="mr-2 h-4 w-4" />
                        Send Reply
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
