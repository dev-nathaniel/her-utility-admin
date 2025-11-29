"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { toast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface EditScheduledEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: {
    id: number
    subject: string
    recipients: string
    recipientCount: number
    scheduledDate: string
    body?: string
  } | null
}

export function EditScheduledEmailDialog({ open, onOpenChange, email }: EditScheduledEmailDialogProps) {
  const queryClient = useQueryClient()
  const [scheduledDate, setScheduledDate] = useState<Date>()
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (email) {
      setSubject(email.subject)
      setScheduledDate(new Date(email.scheduledDate))
      setMessage(email.body || "")
    }
  }, [email])

  const updateEmailMutation = useMutation({
    mutationFn: (data: any) => apiClient.updateScheduledEmail(email!.id, data),
    onSuccess: () => {
      toast({ title: "Scheduled email updated successfully!" })
      queryClient.invalidateQueries({ queryKey: ["scheduled-emails"] })
      onOpenChange(false)
    },
    onError: () => {
      toast({ title: "Failed to update email", variant: "destructive" })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateEmailMutation.mutate({
      subject,
      message,
      scheduledDate,
    })
  }

  if (!email) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Scheduled Email</DialogTitle>
          <DialogDescription>Update the email details and scheduled time</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="recipients">Recipients</Label>
              <Select defaultValue={email.recipients}>
                <SelectTrigger id="recipients">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Customers">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      All Customers (1,248)
                    </div>
                  </SelectItem>
                  <SelectItem value="Enterprise Customers">Enterprise Customers (89)</SelectItem>
                  <SelectItem value="Active Customers">Active Customers (1,180)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your email message here..."
                className="min-h-48"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Send Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("justify-start text-left font-normal", !scheduledDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledDate ? scheduledDate.toLocaleDateString() : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={scheduledDate} onSelect={setScheduledDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="time">Send Time</Label>
                <Input
                  id="time"
                  type="time"
                  defaultValue={scheduledDate ? scheduledDate.toTimeString().slice(0, 5) : "09:00"}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateEmailMutation.isPending}>
              {updateEmailMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Scheduled Email
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
