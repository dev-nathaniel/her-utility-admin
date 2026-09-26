"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Zap, Clock, CheckCircle2, XCircle, FileText, Send } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"

interface QuoteDetailsDialogProps {
  quote: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuoteDetailsDialog({ quote, open, onOpenChange }: QuoteDetailsDialogProps) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState(quote?.status || "pending")
  const [brokerNotes, setBrokerNotes] = useState(quote?.notes || "")

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: string) =>
      apiClient.updateQuoteStatus(quote.id || quote._id, newStatus, brokerNotes),
    onSuccess: () => {
      toast.success("Quote status updated")
      queryClient.invalidateQueries({ queryKey: ["quotes"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to update quote status")
    },
  })

  if (!quote) return null

  const getStatusBadge = (s: string) => {
    switch (s?.toLowerCase()) {
      case "quoted":
        return <Badge className="bg-emerald-600 text-white font-semibold">Quoted</Badge>
      case "accepted":
        return <Badge className="bg-purple-600 text-white font-semibold">Accepted</Badge>
      case "rejected":
        return <Badge variant="destructive" className="font-semibold">Rejected</Badge>
      default:
        return <Badge variant="outline" className="border-amber-500 text-amber-600 font-semibold">Pending Review</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                <span>Quote Enquiry Details</span>
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                Submitted on {new Date(quote.created_at || quote.submittedDate || Date.now()).toLocaleString()}
              </DialogDescription>
            </div>
            {getStatusBadge(quote.status)}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Company & Utility Overview */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-lg border bg-muted/20">
              <span className="text-xs text-muted-foreground block mb-1">Company / Requester</span>
              <p className="font-semibold text-foreground">{quote.company_name || quote.customer || "Client"}</p>
              <p className="text-xs text-muted-foreground">{quote.user_email || ""}</p>
            </div>

            <div className="p-3 rounded-lg border bg-muted/20">
              <span className="text-xs text-muted-foreground block mb-1">Requested Utility</span>
              <p className="font-semibold text-foreground capitalize flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-purple-600" />
                {quote.utility_type || "Electricity"}
              </p>
            </div>
          </div>

          {/* Current Spend & Requirements */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Client Requirements &amp; Spend
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Current Monthly Spend</span>
                  <p className="font-bold text-sm">
                    {quote.current_spend ? `£${quote.current_spend}` : "Not stated"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Site Address</span>
                  <p className="font-medium text-xs">
                    {quote.property_address || "Default registered site"}
                  </p>
                </div>
              </div>

              {quote.notes && (
                <div className="pt-2 border-t">
                  <span className="text-xs text-muted-foreground block mb-1">Client Notes</span>
                  <p className="text-xs text-foreground bg-muted/30 p-2.5 rounded-lg">{quote.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Update & Broker Response */}
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
                placeholder="Internal broker notes or quote rate details..."
                value={brokerNotes}
                onChange={(e) => setBrokerNotes(e.target.value)}
                className="text-xs min-h-[70px]"
              />
              <Button
                size="sm"
                onClick={() => updateStatusMutation.mutate(status)}
                disabled={updateStatusMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 mt-2"
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
