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
import { CalendarIcon, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { toast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface ComposeEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const mockTemplates = [
  {
    id: "welcome",
    name: "Welcome Email",
    subject: "Welcome to {{company_name}}",
    body: "Dear {{customer_name}},\n\nWelcome to {{company_name}}! We're excited to have you on board.\n\nYour account has been successfully created with the email {{email}}.\n\nBest regards,\nThe Team",
    variables: ["customer_name", "company_name", "email"],
  },
  {
    id: "renewal",
    name: "Contract Renewal",
    subject: "Contract Renewal Reminder - {{customer_name}}",
    body: "Dear {{customer_name}},\n\nThis is a friendly reminder that your contract is due for renewal on {{renewal_date}}.\n\nYou currently have {{contract_count}} active contracts with a total value of {{total_value}}.\n\nPlease contact us to discuss renewal options.\n\nBest regards,\nThe Team",
    variables: ["customer_name", "renewal_date", "contract_count", "total_value"],
  },
  {
    id: "newsletter",
    name: "Monthly Newsletter",
    subject: "{{company_name}} - Monthly Newsletter",
    body: "Dear {{customer_name}},\n\nHere's what's new this month at {{company_name}}!\n\n[Newsletter content goes here]\n\nBest regards,\nThe Team",
    variables: ["customer_name", "company_name"],
  },
]

export function ComposeEmailDialog({ open, onOpenChange }: ComposeEmailDialogProps) {
  const queryClient = useQueryClient()
  const [scheduleEmail, setScheduleEmail] = useState(false)
  const [scheduledDate, setScheduledDate] = useState<Date>()
  const [selectedTemplate, setSelectedTemplate] = useState<string>("none")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({})

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: () => apiClient.getEmailTemplates(),
    // Mock data as fallback
    placeholderData: mockTemplates,
  })

  const { data: recipients } = useQuery({
    queryKey: ["email-recipients"],
    queryFn: () => apiClient.getEmailRecipients(),
  })

  const sendEmailMutation = useMutation({
    mutationFn: (data: any) => apiClient.sendEmail(data),
    onSuccess: () => {
      toast({ title: "Email sent successfully!" })
      queryClient.invalidateQueries({ queryKey: ["sent-emails"] })
      onOpenChange(false)
    },
    onError: () => {
      toast({ title: "Failed to send email", variant: "destructive" })
    },
  })

  const scheduleEmailMutation = useMutation({
    mutationFn: (data: any) => apiClient.scheduleEmail(data),
    onSuccess: () => {
      toast({ title: "Email scheduled successfully!" })
      queryClient.invalidateQueries({ queryKey: ["scheduled-emails"] })
      onOpenChange(false)
    },
    onError: () => {
      toast({ title: "Failed to schedule email", variant: "destructive" })
    },
  })

  useEffect(() => {
    if (selectedTemplate !== "none") {
      const template = templates.find((t: any) => t.id === selectedTemplate)
      if (template) {
        setSubject(template.subject)
        setMessage(template.body)
        // Initialize variables with empty strings
        const vars: Record<string, string> = {}
        template.variables.forEach((varName: string) => {
          vars[varName] = ""
        })
        setTemplateVariables(vars)
      }
    } else {
      setTemplateVariables({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate]) // Removed templates from dependencies

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const emailData = {
      subject,
      message,
      variables: templateVariables,
      templateId: selectedTemplate !== "none" ? selectedTemplate : null,
      scheduledDate: scheduleEmail ? scheduledDate : null,
    }

    if (scheduleEmail) {
      scheduleEmailMutation.mutate(emailData)
    } else {
      sendEmailMutation.mutate(emailData)
    }
  }

  const currentTemplate = templates.find((t: any) => t.id === selectedTemplate)
  const hasVariables = currentTemplate && currentTemplate.variables.length > 0

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
              <Select>
                <SelectTrigger id="recipients">
                  <SelectValue placeholder="Select recipient group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      All Customers (1,248)
                    </div>
                  </SelectItem>
                  <SelectItem value="active">Active Customers (1,180)</SelectItem>
                  <SelectItem value="pending">Pending Customers (68)</SelectItem>
                  <SelectItem value="enterprise">Enterprise Customers (89)</SelectItem>
                  <SelectItem value="expiring">Customers with Expiring Contracts (45)</SelectItem>
                  <SelectItem value="new">New Customers (12)</SelectItem>
                  <SelectItem value="custom">Custom Selection...</SelectItem>
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
                    <SelectItem key={template.id} value={template.id}>
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

            {hasVariables ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="text-sm font-medium mb-3">Template Variables</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Fill in the variables below. They will replace the placeholders in your email.
                  </p>
                  <div className="grid gap-3">
                    {currentTemplate.variables.map((varName: string) => (
                      <div key={varName} className="grid gap-2">
                        <Label htmlFor={varName} className="text-sm">
                          {varName
                            .split("_")
                            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(" ")}
                        </Label>
                        <Input
                          id={varName}
                          value={templateVariables[varName] || ""}
                          onChange={(e) =>
                            setTemplateVariables((prev) => ({
                              ...prev,
                              [varName]: e.target.value,
                            }))
                          }
                          placeholder={`Enter ${varName.replace(/_/g, " ")}...`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Show preview of the template */}
                <div className="grid gap-2">
                  <Label>Email Preview</Label>
                  <div className="rounded-lg border bg-muted/50 p-4 text-sm whitespace-pre-wrap">{message}</div>
                </div>
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
                <p className="text-xs text-muted-foreground">
                  Use variables: {"{customer_name}"}, {"{contract_count}"}, {"{total_value}"}
                </p>
              </div>
            )}

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
            <Button type="button" variant="outline">
              Save as Draft
            </Button>
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
