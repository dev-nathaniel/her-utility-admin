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
import { Switch } from "@/components/ui/switch"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Users, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"

interface ComposeEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ComposeEmailDialog({ open, onOpenChange }: ComposeEmailDialogProps) {
  const queryClient = useQueryClient()
  const [scheduleEmail, setScheduleEmail] = useState(false)
  const [scheduledDate, setScheduledDate] = useState<Date>()
  const [recipientGroup, setRecipientGroup] = useState<string>("all")
  const [selectedTemplate, setSelectedTemplate] = useState<string>("none")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({})
  

  const { data: templatesResponse, isLoading: templatesLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: () => apiClient.getTemplates(),
  })
  const templates = (((templatesResponse as any)?.data?.templates) || []) as any[]

  const sendEmailMutation = useMutation({
    mutationFn: (data: any) => apiClient.sendEmail(data),
    onSuccess: () => {
      toast.success("Email sent successfully!")
      queryClient.invalidateQueries({ queryKey: ["sent-emails"] })
      onOpenChange(false)
    },
    onError: () => {
      toast.error("Failed to send email")
    },
  })

  const scheduleEmailMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient.scheduleEmail(data),
    onSuccess: () => {
      toast.success("Email scheduled successfully!")
      queryClient.invalidateQueries({ queryKey: ["scheduled-emails"] })
      onOpenChange(false)
    },
    onError: () => {
      toast.error("Failed to schedule email")
    },
  })

  useEffect(() => {
    if (selectedTemplate !== "none") {
      const template = templates.find((t: any) => (t._id || t.id) === selectedTemplate)
      if (template) {
        setSubject(template.subject)
        setMessage("")
        const vars: Record<string, string> = {}
        if (Array.isArray(template.variables)) {
          template.variables.forEach((varName: string) => {
            vars[varName] = ""
          })
        }
        setTemplateVariables(vars)
      }
    } else {
      setTemplateVariables({})
    }
  }, [selectedTemplate, templates])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const emailData: Record<string, any> = {
      subject,
      recipientGroup,
    }
    if (selectedTemplate !== "none") {
      emailData.templateId = selectedTemplate
      emailData.templateVariables = templateVariables
    } else {
      emailData.message = message
    }

    if (scheduleEmail) {
      scheduleEmailMutation.mutate({
        ...emailData,
        scheduledAt: scheduledDate?.toISOString() || new Date().toISOString(),
      })
    } else {
      sendEmailMutation.mutate(emailData)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
          <DialogDescription>Send an email to specific customers or all customers</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="recipients">Recipients</Label>
              <Select value={recipientGroup} onValueChange={setRecipientGroup}>
                <SelectTrigger id="recipients">
                  <SelectValue placeholder="Select recipient group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      All Users
                    </div>
                  </SelectItem>
                  <SelectItem value="admins">Admins</SelectItem>
                  {/* <SelectItem value="active">Admins (1,180)</SelectItem> */}
                  {/* <SelectItem value="pending">Pending Customers (68)</SelectItem> */}
                  {/* <SelectItem value="enterprise">Enterprise Customers (89)</SelectItem> */}
                  {/* <SelectItem value="expiring">Customers with Expiring Contracts (45)</SelectItem> */}
                  {/* <SelectItem value="new">New Customers (12)</SelectItem> */}
                  {/* <SelectItem value="custom">Custom Selection...</SelectItem> */}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="template">Email Template (Optional)</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate} disabled={templatesLoading}>
                <SelectTrigger id="template">
                  <SelectValue
                    placeholder={templatesLoading ? "Loading templates..." : "Choose a template or start from scratch"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Template</SelectItem>
                  {templates.map((template: any) => (
                    <SelectItem key={template._id || template.id} value={template._id || template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
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

            {(() => {
              const template = templates.find((t: any) => (t._id || t.id) === selectedTemplate)
              const vars = template?.variables as string[] | undefined
              return selectedTemplate !== "none" && vars && vars.length > 0 ? (
                <div className="space-y-4">
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <p className="text-sm font-medium mb-3">Template Variables</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Fill in the variables below. They will replace the placeholders in your email.
                    </p>
                    <div className="grid gap-3">
                      {vars.map((varName: string) => (
                        <div key={varName} className="grid gap-2">
                          <Label htmlFor={`var-${varName}`} className="text-sm">
                            {varName.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                          </Label>
                          <Input
                            id={`var-${varName}`}
                            value={templateVariables[varName] || ""}
                            onChange={(e) =>
                              setTemplateVariables((prev) => ({ ...prev, [varName]: e.target.value }))
                            }
                            placeholder={`Enter ${varName.replace(/_/g, " ")}...`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : selectedTemplate !== "none" ? (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">
                    Template selected (no variables to fill).
                  </p>
                </div>
              ) : (
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
              )
            })()}

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="schedule">Schedule Email</Label>
                <p className="text-sm text-muted-foreground">Send this email at a specific date and time</p>
              </div>
              <Switch id="schedule" checked={scheduleEmail} onCheckedChange={setScheduleEmail} />
            </div>

            {scheduleEmail && (
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
                  <Input id="time" type="time" defaultValue="09:00" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {/* <Button type="button" variant="outline">
              Save as Draft
            </Button> */}
            <Button type="submit" disabled={sendEmailMutation.isPending || scheduleEmailMutation.isPending}>
              {(sendEmailMutation.isPending || scheduleEmailMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {scheduleEmail ? "Schedule Email" : "Send Now"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
