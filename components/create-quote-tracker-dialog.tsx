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
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import { Zap, Calendar, User, Building2, Phone, Mail, FileText } from "lucide-react"

interface CreateQuoteTrackerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateQuoteTrackerDialog({ open, onOpenChange }: CreateQuoteTrackerDialogProps) {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const generateRef = () => `PB-Q26-${Math.floor(1000 + Math.random() * 9000)}`

  const [quoteReference, setQuoteReference] = useState(generateRef())
  const [businessName, setBusinessName] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [utilityType, setUtilityType] = useState("electricity")
  const [quoteSentAt, setQuoteSentAt] = useState(() => new Date().toISOString().split("T")[0])
  const [nextActionAt, setNextActionAt] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    return d.toISOString().split("T")[0]
  })
  const [assignedAdviserName, setAssignedAdviserName] = useState(
    user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "Energy Adviser"
  )
  const [notes, setNotes] = useState("")

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!contactName.trim() || !contactEmail.trim() || !businessName.trim()) {
        throw new Error("Business name, contact name, and contact email are required")
      }
      return apiClient.createQuoteTracker({
        quote_reference: quoteReference.trim() || generateRef(),
        business_name: businessName.trim(),
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim().toLowerCase(),
        contact_phone: contactPhone.trim(),
        utility_type: utilityType,
        quote_sent_at: quoteSentAt ? new Date(quoteSentAt).toISOString() : new Date().toISOString(),
        next_action_at: nextActionAt ? new Date(nextActionAt).toISOString() : undefined,
        assigned_adviser_name: assignedAdviserName.trim() || "Energy Adviser",
        assigned_adviser_id: user?.id || "broker_adviser",
        adviser_notes: notes.trim() || undefined,
      })
    },
    onSuccess: () => {
      toast.success("Outbound quote follow-up tracker created successfully")
      queryClient.invalidateQueries({ queryKey: ["quote-tracker"] })
      queryClient.invalidateQueries({ queryKey: ["quote-tracker-kpis"] })
      onOpenChange(false)
      // Reset
      setQuoteReference(generateRef())
      setBusinessName("")
      setContactName("")
      setContactEmail("")
      setContactPhone("")
      setNotes("")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to create quote tracker")
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Track New Outbound Quote
          </DialogTitle>
          <DialogDescription>
            Register a quote sent to a customer to initiate the internal follow-up cadence, overdue alerts, and concierge auto-linking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Reference & Utility */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Quote Reference *</Label>
              <Input
                value={quoteReference}
                onChange={(e) => setQuoteReference(e.target.value)}
                placeholder="PB-Q26-8801"
                className="h-9 font-mono text-xs uppercase"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Utility Type *</Label>
              <Select value={utilityType} onValueChange={setUtilityType}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="electricity">Electricity</SelectItem>
                  <SelectItem value="gas">Gas</SelectItem>
                  <SelectItem value="water">Water</SelectItem>
                  <SelectItem value="dual_fuel">Dual Fuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Business & Customer */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold">Company / Business Name *</Label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Apex Hospitality Ltd"
              className="h-9 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Customer Contact Name *</Label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                className="h-9 text-xs"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Contact Email *</Label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="sarah@apex.co.uk"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Contact Phone</Label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="07700 900123"
                className="h-9 text-xs"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Assigned Adviser</Label>
              <Input
                value={assignedAdviserName}
                onChange={(e) => setAssignedAdviserName(e.target.value)}
                placeholder="Adviser name"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Date Quote Sent *</Label>
              <Input
                type="date"
                value={quoteSentAt}
                onChange={(e) => setQuoteSentAt(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Follow-Up Due Date *</Label>
              <Input
                type="date"
                value={nextActionAt}
                onChange={(e) => setNextActionAt(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Initial Notes */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold">Initial Quote Notes (Tariffs, rates, terms)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Sent British Gas Lite 24m fixed @ 22.4p/kWh, 48p/day standing charge. Est annual £3,850."
              className="min-h-[70px] text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !businessName.trim() || !contactName.trim()}
          >
            {createMutation.isPending ? "Creating..." : "Start Tracking Quote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
