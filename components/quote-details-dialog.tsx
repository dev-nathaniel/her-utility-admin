"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mail, MapPin, Zap, DollarSign, FileText, Building2, Loader2 } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient, axiosInstance } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"

interface QuoteDetailsDialogProps {
  quote: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuoteDetailsDialog({ quote, open, onOpenChange }: QuoteDetailsDialogProps) {
  const [quoteAmount, setQuoteAmount] = useState("")
  const [status, setStatus] = useState(quote?.status || "")
  const [response, setResponse] = useState("")
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await axiosInstance.patch(`/quotes/${quote.id}/status`, { status: newStatus })
      return response.data
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Quote status updated successfully" })
      queryClient.invalidateQueries({ queryKey: ["quotes"] })
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update quote status", variant: "destructive" })
    },
  })

  const sendQuoteMutation = useMutation({
    mutationFn: async () => {
      const apiResponse = await axiosInstance.post(`/quotes/${quote.id}/send`, {
        amount: quoteAmount,
        message: response,
      })
      return apiResponse.data
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Quote sent to customer successfully" })
      queryClient.invalidateQueries({ queryKey: ["quotes"] })
      onOpenChange(false)
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send quote", variant: "destructive" })
    },
  })

  const rejectQuoteMutation = useMutation({
    mutationFn: async () => {
      const apiResponse = await axiosInstance.post(`/quotes/${quote.id}/reject`)
      return apiResponse.data
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Quote rejected" })
      queryClient.invalidateQueries({ queryKey: ["quotes"] })
      onOpenChange(false)
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reject quote", variant: "destructive" })
    },
  })

  if (!quote) return null

  const handleStatusUpdate = (newStatus: string) => {
    setStatus(newStatus)
    updateStatusMutation.mutate(newStatus)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{quote.id}</DialogTitle>
              <DialogDescription className="mt-1">
                Submitted on {new Date(quote.submittedDate).toLocaleString()}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              {/* <Badge variant={quote.priority === "High" ? "destructive" : "default"}>{quote.priority} Priority</Badge> */}
              <Badge>{quote.status}</Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{quote.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Company</p>
                    <p className="text-sm font-medium">{quote.customer}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quote Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quote Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Utility Type</p>
                    <p className="text-sm font-medium">{quote.utilityType}</p>
                  </div>
                </div>
                {/* <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Number of Sites</p>
                    <p className="text-sm font-medium">{quote.sites}</p>
                  </div>
                </div> */}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Estimated Value</p>
                    <p className="text-sm font-medium">{quote.estimatedValue}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {quote.siteName && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Site Name</p>
                      <p className="text-sm font-medium">{quote.siteName}</p>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              <div>
                <Label className="text-sm font-medium">Customer Message</Label>
                <p className="mt-2 rounded-lg bg-muted p-3 text-sm">{quote.message}</p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quote Management</CardTitle>
              <CardDescription>Update status and respond to customer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Update Status</Label>
                <Select value={status} onValueChange={handleStatusUpdate} disabled={updateStatusMutation.isPending}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending Review">Pending Review</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Quoted">Quoted</SelectItem>
                    <SelectItem value="Accepted">Accepted</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="quote-amount">Quote Amount</Label>
                <Input
                  id="quote-amount"
                  type="text"
                  placeholder="$0.00"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="response">Response to Customer</Label>
                <Textarea
                  id="response"
                  placeholder="Write your response to the customer..."
                  className="min-h-32"
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => sendQuoteMutation.mutate()}
                  disabled={sendQuoteMutation.isPending}
                >
                  {sendQuoteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Quote
                </Button>
                <Button variant="outline" className="flex-1 bg-transparent">
                  Schedule Follow-up
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            variant="destructive"
            onClick={() => rejectQuoteMutation.mutate()}
            disabled={rejectQuoteMutation.isPending}
          >
            {rejectQuoteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reject Quote
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
