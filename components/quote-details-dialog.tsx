"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Zap,
  Flame,
  Clock,
  CheckCircle2,
  FileText,
  User,
  Building2,
  MapPin,
  Calendar,
  Hash,
  Mail,
  Phone,
  Droplets,
  Wifi,
  PhoneCall,
  Loader2,
} from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"

interface QuoteDetailsDialogProps {
  quote: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

const WINDOW_LABELS: Record<string, string> = {
  dont_know: "Don't Know",
  out_of_contract: "Out of Contract",
  under_6m: "Under 6 months",
  "6_12m": "6–12 months",
  over_12m: "Over 12 months",
  know_date: "Know date",
}

function formatDate(val?: string) {
  if (!val) return "—"
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return val
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export function QuoteDetailsDialog({ quote, open, onOpenChange }: QuoteDetailsDialogProps) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState(quote?.status || "pending")
  const [brokerNotes, setBrokerNotes] = useState(quote?.notes || "")
  const [trackingLoading, setTrackingLoading] = useState(false)

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: string) =>
      apiClient.updateQuoteStatus(quote.id || quote._id, newStatus, brokerNotes),
    onSuccess: () => {
      toast.success("Quote enquiry status updated")
      queryClient.invalidateQueries({ queryKey: ["quotes"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to update quote status")
    },
  })

  if (!quote) return null

  const customerName = quote.customer_name || quote.contact_name || quote.contact?.name || quote.customer || "Customer"
  const customerEmail = quote.user_email || quote.contact_email || quote.contact?.email || ""
  const customerPhone = quote.contact_phone || quote.contact?.phone || quote.user_phone || ""
  const businessName = quote.business_name || quote.company_name || quote.address?.business_name || "—"
  const supplyAddress = quote.supply_address || quote.property_address || quote.address?.full_address || "—"
  const postcode = quote.postcode || quote.address?.postcode || "—"
  const supplyPostcode = quote.supply_postcode || quote.address?.supply_postcode || ""
  const isDifferentSupply = quote.address && quote.address.is_supply_address === false && supplyPostcode

  const energyMeters: any[] = quote.energy_meters || []
  const hasMeters = energyMeters.length > 0
  const services: string[] = quote.selected_services || [quote.utility_type].filter(Boolean)

  const handleTrackInFollowUp = async () => {
    setTrackingLoading(true)
    try {
      const primaryMeter = energyMeters[0] || {}
      const mpx = quote.mprn || primaryMeter.meter_point_number || ""
      const endDate = quote.end_date || quote.contract_end_date || primaryMeter.end_date || ""
      const utilType = (primaryMeter.utility || quote.utility_type || services[0] || "electricity").toLowerCase()

      await apiClient.createQuoteTracker({
        quote_reference: `PB-INB-${Math.floor(1000 + Math.random() * 9000)}`,
        business_name: businessName !== "—" ? businessName : "Inbound Lead",
        contact_name: customerName,
        contact_email: customerEmail || "unspecified@client.com",
        contact_phone: customerPhone,
        utility_type: utilType === "gas" ? "gas" : "electricity",
        supply_address: supplyAddress !== "—" ? supplyAddress : undefined,
        postcode: postcode !== "—" ? postcode : undefined,
        contract_end_date: endDate || undefined,
        meter_point_number: mpx || undefined,
        inbound_quote_id: quote.id || quote._id,
        adviser_notes: `Created from Inbound Enquiry #${quote.id ? quote.id.slice(0, 8).toUpperCase() : ""}. ${brokerNotes || quote.notes || ""}`.trim(),
      })

      toast.success("Enquiry successfully added to Outbound Follow-Up Tracker!")
      queryClient.invalidateQueries({ queryKey: ["quote-tracker"] })
      queryClient.invalidateQueries({ queryKey: ["quote-tracker-kpis"] })
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to add to tracker")
    } finally {
      setTrackingLoading(false)
    }
  }

  const getStatusBadge = (s: string) => {
    switch (s?.toLowerCase()) {
      case "quoted":
        return <Badge className="bg-emerald-600 text-white font-semibold">Quoted</Badge>
      case "accepted":
        return <Badge className="font-semibold">Accepted</Badge>
      case "rejected":
        return <Badge variant="destructive" className="font-semibold">Rejected</Badge>
      default:
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400 font-semibold gap-1">
            <Clock className="h-3 w-3" />
            Pending Review
          </Badge>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>Inbound Quote Enquiry</span>
                </DialogTitle>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted/60 text-muted-foreground">
                  #{quote.id ? quote.id.slice(0, 8).toUpperCase() : "REF"}
                </span>
              </div>
              <DialogDescription className="mt-0.5">
                Submitted on {new Date(quote.created_at || quote.submittedDate || Date.now()).toLocaleString("en-GB")}
              </DialogDescription>
            </div>
            {getStatusBadge(quote.status)}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Customer & Business Profile Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Customer Contact Card */}
            <Card className="bg-muted/20 border">
              <CardHeader className="py-2.5 px-3.5 border-b bg-muted/40 flex flex-row items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Customer &amp; Requester
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Customer Name</span>
                  <p className="font-bold text-sm text-foreground">{customerName}</p>
                </div>
                {customerEmail && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
                    <span className="text-foreground select-all">{customerEmail}</span>
                  </div>
                )}
                {customerPhone && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
                    <span className="text-foreground">{customerPhone}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Business & Supply Address Card */}
            <Card className="bg-muted/20 border">
              <CardHeader className="py-2.5 px-3.5 border-b bg-muted/40 flex flex-row items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Business &amp; Supply Site
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Business Name</span>
                  <p className="font-bold text-sm text-foreground">{businessName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Supply Address</span>
                  <p className="font-medium text-foreground">{supplyAddress}</p>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Postcode</span>
                    <span className="font-mono font-semibold text-foreground">{postcode}</span>
                  </div>
                  {isDifferentSupply && (
                    <div className="text-right">
                      <span className="text-muted-foreground block text-[11px]">Supply Postcode</span>
                      <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">{supplyPostcode}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Energy Meters & Utilities Section */}
          <Card className="border">
            <CardHeader className="py-2.5 px-3.5 border-b bg-muted/30 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Requested Utilities &amp; Meter Details
                </CardTitle>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {services.map((s) => (
                  <Badge key={s} variant="secondary" className="capitalize text-[11px] font-semibold">
                    {s}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-3.5 space-y-3">
              {hasMeters ? (
                <div className="space-y-3">
                  {energyMeters.map((m, idx) => {
                    const isGas = m.utility === "gas"
                    const mpxLabel = isGas ? "MPRN" : "MPAN"
                    const endDate = m.end_date
                    const endWindow = m.contract_end_window

                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-md ${isGas ? "bg-orange-500/10 text-orange-600" : "bg-amber-500/10 text-amber-600"}`}>
                              {isGas ? <Flame className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                            </div>
                            <span className="font-bold text-sm text-foreground">
                              {isGas ? "Gas Meter" : "Electricity Meter"} {energyMeters.length > 1 ? `#${idx + 1}` : ""}
                            </span>
                            {m.supplier && (
                              <Badge variant="outline" className="font-medium text-xs">
                                {m.supplier}
                              </Badge>
                            )}
                          </div>
                          {m.meter_point_number ? (
                            <p className="text-muted-foreground pl-7 flex items-center gap-1 font-mono">
                              <span className="font-semibold text-foreground/80">{mpxLabel}:</span>
                              <span className="font-bold text-foreground text-xs">{m.meter_point_number}</span>
                            </p>
                          ) : (
                            <p className="text-muted-foreground pl-7 text-[11px]">
                              {mpxLabel}: Not provided (to be looked up by team)
                            </p>
                          )}
                        </div>

                        <div className="text-left sm:text-right pl-7 sm:pl-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                          <span className="text-[11px] text-muted-foreground block">Contract End Date</span>
                          {endDate ? (
                            <div className="flex sm:justify-end items-center gap-1.5 mt-0.5">
                              <span className="font-bold text-xs text-foreground font-mono">
                                {formatDate(endDate)}
                              </span>
                              <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-1.5 font-normal">
                                Exact Date
                              </Badge>
                            </div>
                          ) : endWindow ? (
                            <span className="font-semibold text-foreground text-xs block mt-0.5">
                              {WINDOW_LABELS[endWindow] || endWindow}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs block mt-0.5">—</span>
                          )}
                          {m.days_until_expiry !== undefined && (
                            <span className="text-[10px] text-muted-foreground block mt-0.5">
                              {m.days_until_expiry < 0
                                ? `Ended ${Math.abs(m.days_until_expiry)} days ago`
                                : m.days_until_expiry === 0
                                ? "Ends today"
                                : `Ends in ${m.days_until_expiry} days`}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* Fallback if no energy_meters array (e.g. single utility or legacy format) */
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg border bg-muted/20">
                    <span className="text-muted-foreground block text-[11px]">Contract End Date</span>
                    <p className="font-bold text-xs mt-0.5">
                      {quote.end_date || quote.contract_end_date ? formatDate(quote.end_date || quote.contract_end_date) : quote.contract_end_window ? WINDOW_LABELS[quote.contract_end_window] || quote.contract_end_window : "Not stated"}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-muted/20">
                    <span className="text-muted-foreground block text-[11px]">MPRN / MPAN</span>
                    <p className="font-mono font-bold text-xs mt-0.5">
                      {quote.mprn || quote.meter_point_number || "Not stated"}
                    </p>
                  </div>
                </div>
              )}

              {/* Water & Telecoms Suppliers if present */}
              {(quote.water_supplier || quote.telecoms_supplier) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t text-xs">
                  {quote.water_supplier && (
                    <div className="p-2.5 rounded-lg border bg-muted/20 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Droplets className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">Water Supplier:</span>
                      </div>
                      <span className="font-bold">{quote.water_supplier}</span>
                    </div>
                  )}
                  {quote.telecoms_supplier && (
                    <div className="p-2.5 rounded-lg border bg-muted/20 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Wifi className="h-4 w-4 text-sky-500" />
                        <span className="font-medium">Telecoms Supplier:</span>
                      </div>
                      <span className="font-bold">{quote.telecoms_supplier}</span>
                    </div>
                  )}
                </div>
              )}

              {quote.current_spend && (
                <div className="pt-2 border-t flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Current Monthly Spend:</span>
                  <span className="font-bold text-sm">£{quote.current_spend}</span>
                </div>
              )}

              {quote.notes && (
                <div className="pt-2 border-t">
                  <span className="text-xs font-semibold text-muted-foreground block mb-1">Client Notes:</span>
                  <p className="text-xs text-foreground bg-muted/40 p-2.5 rounded-lg whitespace-pre-wrap">{quote.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Action: Send to Outbound Follow-Up Tracker */}
          <div className="p-3.5 rounded-lg border bg-gradient-to-r from-primary/5 via-primary/10 to-transparent flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <PhoneCall className="h-4 w-4 text-primary" />
                <span>Move to Outbound Follow-Up Tracker</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Automatically create a tracking card to log contact attempts, follow-up deadlines, and won deals.
              </p>
            </div>
            <Button
              size="sm"
              variant="default"
              onClick={handleTrackInFollowUp}
              disabled={trackingLoading}
              className="text-xs h-8 gap-1.5 shrink-0"
            >
              {trackingLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PhoneCall className="h-3.5 w-3.5" />}
              <span>Track in Follow-Up Tracker</span>
            </Button>
          </div>

          {/* Status Update & Broker Response Section */}
          <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
            <Label className="text-xs font-semibold text-foreground">Update Enquiry Status:</Label>
            <div className="flex gap-2">
              <Select
                value={status}
                onValueChange={(val) => {
                  setStatus(val)
                  updateStatusMutation.mutate(val)
                }}
              >
                <SelectTrigger className="w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="quoted">Quoted / Offer Prepared</SelectItem>
                  <SelectItem value="accepted">Accepted by Client</SelectItem>
                  <SelectItem value="rejected">Rejected / Unable to Supply</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 pt-2">
              <Label className="text-xs text-muted-foreground">Broker Quotation / Notes:</Label>
              <Textarea
                placeholder="Internal broker notes, rates, supplier comparison, or quote details..."
                value={brokerNotes}
                onChange={(e) => setBrokerNotes(e.target.value)}
                className="text-xs min-h-[70px]"
              />
              <Button
                size="sm"
                onClick={() => updateStatusMutation.mutate(status)}
                disabled={updateStatusMutation.isPending}
                className="text-xs h-8 mt-2"
              >
                {updateStatusMutation.isPending ? "Saving..." : "Save Notes"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
