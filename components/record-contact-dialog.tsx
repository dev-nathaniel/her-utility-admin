"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { apiClient, type QuoteTrackerData } from "@/lib/api-client"
import { toast } from "sonner"
import { Phone, Mail, MessageSquare, Send, Calendar, Clock, AlertTriangle, CheckCircle2 } from "lucide-react"

interface RecordContactDialogProps {
  quote: QuoteTrackerData | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const OUTCOMES = [
  { value: "no_answer", label: "No answer / Left voicemail", group: "Attempted" },
  { value: "customer_considering", label: "Customer considering options", group: "In Discussion" },
  { value: "wants_different_quote", label: "Customer wants different tariff / term", group: "In Discussion" },
  { value: "callback_booked", label: "Callback requested (with date/time)", group: "In Discussion" },
  { value: "paperwork_sent", label: "Paperwork sent to customer", group: "Closing" },
  { value: "signed_submitted", label: "Signed and submitted to supplier", group: "Closed - Won" },
  { value: "not_proceeding", label: "Not proceeding - too expensive", group: "Closed - Lost" },
  { value: "staying_with_current", label: "Not proceeding - staying with current supplier", group: "Closed - Lost" },
  { value: "went_elsewhere", label: "Not proceeding - went with competitor", group: "Closed - Lost" },
  { value: "requote_needed", label: "Re-quote needed", group: "Action Required" },
  { value: "quote_expired", label: "Quote expired", group: "Expired" },
]

export function RecordContactDialog({ quote, open, onOpenChange }: RecordContactDialogProps) {
  const queryClient = useQueryClient()
  const [method, setMethod] = useState<string>("phone")
  const [outcome, setOutcome] = useState<string>("customer_considering")
  const [notes, setNotes] = useState<string>("")
  const [nextActionDate, setNextActionDate] = useState<string>(() => {
    // Default to 2 days from now in YYYY-MM-DD
    const d = new Date()
    d.setDate(d.getDate() + 2)
    return d.toISOString().split("T")[0]
  })
  const [callbackDateTime, setCallbackDateTime] = useState<string>("")
  const [lostReason, setLostReason] = useState<string>("")

  const recordMutation = useMutation({
    mutationFn: async () => {
      if (!quote) return
      let combinedNotes = notes.trim()
      if (outcome === "callback_booked" && callbackDateTime) {
        combinedNotes = `[Callback requested for ${callbackDateTime}] ${combinedNotes}`
      }
      return apiClient.recordQuoteTrackerContact(quote.id || (quote as any)._id, {
        outcome,
        notes: combinedNotes || `Logged via ${method.toUpperCase()}`,
        next_action_at: nextActionDate ? new Date(nextActionDate).toISOString() : undefined,
        lost_reason: lostReason || undefined,
      })
    },
    onSuccess: () => {
      toast.success("Contact attempt and outcome recorded successfully")
      queryClient.invalidateQueries({ queryKey: ["quote-tracker"] })
      queryClient.invalidateQueries({ queryKey: ["quote-tracker-kpis"] })
      onOpenChange(false)
      setNotes("")
      setLostReason("")
      setCallbackDateTime("")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to record contact outcome")
    },
  })

  if (!quote) return null

  const isLostOutcome = ["not_proceeding", "staying_with_current", "went_elsewhere"].includes(outcome)
  const isWonOutcome = outcome === "signed_submitted"
  const isCallback = outcome === "callback_booked"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">Record Contact / Follow-Up</DialogTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {quote.quote_reference}
            </Badge>
          </div>
          <DialogDescription>
            Log a follow-up attempt for <strong>{quote.contact_name}</strong> ({quote.business_name}). This will advance the attempt counter ({quote.follow_up_attempt_count + 1} attempt) and update pipeline status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Contact Details Reminder */}
          <div className="p-3 rounded-lg bg-muted/40 border text-xs grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground block">Customer:</span>
              <span className="font-medium text-foreground">{quote.contact_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Phone:</span>
              <span className="font-medium text-foreground">{quote.contact_phone || "Not recorded"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Email:</span>
              <span className="font-medium text-foreground">{quote.contact_email || "Not recorded"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Utility:</span>
              <span className="font-medium capitalize text-foreground">{quote.utility_type}</span>
            </div>
          </div>

          {/* Contact Method */}
          <div className="grid gap-2">
            <Label className="text-xs font-semibold">Contact Method</Label>
            <div className="grid grid-cols-4 gap-2">
              <Button
                type="button"
                variant={method === "phone" ? "default" : "outline"}
                size="sm"
                className="h-9 gap-1.5 text-xs"
                onClick={() => setMethod("phone")}
              >
                <Phone className="h-3.5 w-3.5" />
                Phone
              </Button>
              <Button
                type="button"
                variant={method === "email" ? "default" : "outline"}
                size="sm"
                className="h-9 gap-1.5 text-xs"
                onClick={() => setMethod("email")}
              >
                <Mail className="h-3.5 w-3.5" />
                Email
              </Button>
              <Button
                type="button"
                variant={method === "whatsapp" ? "default" : "outline"}
                size="sm"
                className="h-9 gap-1.5 text-xs"
                onClick={() => setMethod("whatsapp")}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                WhatsApp
              </Button>
              <Button
                type="button"
                variant={method === "sms" ? "default" : "outline"}
                size="sm"
                className="h-9 gap-1.5 text-xs"
                onClick={() => setMethod("sms")}
              >
                <Send className="h-3.5 w-3.5" />
                SMS
              </Button>
            </div>
          </div>

          {/* Standard Outcome (Required) */}
          <div className="grid gap-2">
            <Label className="text-xs font-semibold">Contact Outcome *</Label>
            <Select value={outcome} onValueChange={(val) => {
              setOutcome(val)
              // Update default next action based on outcome
              const d = new Date()
              if (val === "no_answer") {
                d.setDate(d.getDate() + 1) // next day
                setNextActionDate(d.toISOString().split("T")[0])
              } else if (val === "customer_considering") {
                d.setDate(d.getDate() + 3) // 3 days
                setNextActionDate(d.toISOString().split("T")[0])
              } else if (val === "paperwork_sent") {
                d.setDate(d.getDate() + 2)
                setNextActionDate(d.toISOString().split("T")[0])
              } else if (["signed_submitted", "not_proceeding", "staying_with_current", "went_elsewhere", "quote_expired"].includes(val)) {
                setNextActionDate("") // No next follow-up required
              }
            }}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                {OUTCOMES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    <span className="text-xs text-muted-foreground mr-1.5">[{o.group}]</span>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Special outcome details: Callback date/time */}
          {isCallback && (
            <div className="grid gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-blue-900 dark:text-blue-200">
                <Clock className="h-3.5 w-3.5" />
                Requested Callback Date &amp; Time *
              </Label>
              <Input
                type="datetime-local"
                value={callbackDateTime}
                onChange={(e) => {
                  setCallbackDateTime(e.target.value)
                  if (e.target.value) {
                    setNextActionDate(e.target.value.split("T")[0])
                  }
                }}
                className="bg-background"
              />
            </div>
          )}

          {/* Special outcome details: Lost reason */}
          {isLostOutcome && (
            <div className="grid gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-rose-900 dark:text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                Reason for Not Proceeding (Competitor price / reason)
              </Label>
              <Input
                placeholder="e.g. Competitor offered 21.2p/kWh or client renewing existing supplier"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                className="bg-background text-xs"
              />
            </div>
          )}

          {/* Won banner */}
          {isWonOutcome && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Great job! This quote will be marked as Closed - Won (Signed &amp; Submitted).</span>
            </div>
          )}

          {/* Next Action Date */}
          {!["signed_submitted", "not_proceeding", "staying_with_current", "went_elsewhere", "quote_expired"].includes(outcome) && (
            <div className="grid gap-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Next Follow-Up Due Date
              </Label>
              <Input
                type="date"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          )}

          {/* Follow-up Notes */}
          <div className="grid gap-2">
            <Label className="text-xs font-semibold">Adviser Notes / Conversation Details</Label>
            <Textarea
              placeholder="e.g. Spoke to Jane, discussed 24m vs 36m options. She prefers the fixed standing charge option..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[85px] text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => recordMutation.mutate()}
            disabled={recordMutation.isPending || !outcome}
          >
            {recordMutation.isPending ? "Saving..." : "Record & Update Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
