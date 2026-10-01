"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { apiClient, type QuoteTrackerData } from "@/lib/api-client"
import {
  Phone,
  Mail,
  Zap,
  Calendar,
  Clock,
  History,
  AlertTriangle,
  CheckCircle2,
  FileText,
  User,
  ExternalLink,
  ShieldCheck,
} from "lucide-react"

interface QuoteTrackerDetailsDialogProps {
  quoteId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRecordContact: (quote: QuoteTrackerData) => void
}

export function QuoteTrackerDetailsDialog({
  quoteId,
  open,
  onOpenChange,
  onRecordContact,
}: QuoteTrackerDetailsDialogProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["quote-tracker-detail", quoteId],
    queryFn: () => (quoteId ? apiClient.getQuoteTrackerDetail(quoteId) : null),
    enabled: !!quoteId && open,
  })

  if (!quoteId) return null

  const quote = data?.quote
  const history = quote?.follow_up_history || []
  const linkedQuoteDoc = data?.linked_quote_doc
  const linkedLoaDoc = data?.linked_loa_doc

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "follow_up_due":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-semibold">Follow-up Due</Badge>
      case "waiting_for_response":
        return <Badge variant="outline" className="border-blue-400 text-blue-600 dark:text-blue-400">Waiting for Response</Badge>
      case "customer_considering":
        return <Badge className="bg-indigo-600 text-white">Customer Considering</Badge>
      case "callback_requested":
        return <Badge className="bg-purple-600 text-white">Callback Requested</Badge>
      case "requote_needed":
        return <Badge className="bg-orange-500 text-white">Needs Re-quote</Badge>
      case "paperwork_sent":
        return <Badge className="bg-teal-600 text-white">Paperwork Sent</Badge>
      case "signed_submitted":
        return <Badge className="bg-emerald-600 text-white">Closed - Won (Signed)</Badge>
      case "lost":
        return <Badge variant="destructive">Closed - Lost</Badge>
      case "quote_expired":
        return <Badge variant="outline" className="text-muted-foreground">Quote Expired</Badge>
      default:
        return <Badge variant="secondary">{status || "Open"}</Badge>
    }
  }

  const formatOutcomeLabel = (outcome?: string) => {
    if (!outcome) return "Initial Quote Sent"
    return outcome.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-xl font-bold">{quote?.quote_reference || "Quote Details"}</DialogTitle>
              {getStatusBadge(quote?.status)}
            </div>
            {quote && (
              <Button
                size="sm"
                className="gap-1.5 h-8 text-xs self-start sm:self-auto"
                onClick={() => {
                  onRecordContact(quote)
                }}
              >
                <Phone className="h-3.5 w-3.5" />
                Record Contact Attempt
              </Button>
            )}
          </div>
          <DialogDescription>
            {quote?.business_name} &bull; {quote?.contact_name} ({quote?.contact_email})
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading quote history...</div>
        ) : !quote ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Quote not found.</div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Overdue alert if applicable */}
            {quote.is_overdue && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start gap-2.5 text-amber-900 dark:text-amber-200 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Follow-up Due</p>
                  <p className="mt-0.5">
                    {quote.overdue_message ||
                      `Quote #${quote.quote_reference} was sent on ${new Date(quote.quote_sent_at || quote.created_at).toLocaleDateString()}. No recent outcome recorded.`}
                  </p>
                </div>
              </div>
            )}

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg border bg-muted/20">
                <span className="text-muted-foreground block">Utility</span>
                <span className="font-semibold text-foreground capitalize flex items-center gap-1 mt-0.5">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  {quote.utility_type}
                </span>
              </div>
              <div className="p-3 rounded-lg border bg-muted/20">
                <span className="text-muted-foreground block">Attempt Counter</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {quote.follow_up_attempt_count === 0 ? "Initial (0)" : `${quote.follow_up_attempt_count}${quote.follow_up_attempt_count === 1 ? "st" : quote.follow_up_attempt_count === 2 ? "nd" : quote.follow_up_attempt_count === 3 ? "rd" : "th"} Attempt`}
                </span>
              </div>
              <div className="p-3 rounded-lg border bg-muted/20">
                <span className="text-muted-foreground block">Assigned Adviser</span>
                <span className="font-semibold text-foreground truncate mt-0.5 block">
                  {quote.assigned_adviser_name || "Unassigned"}
                </span>
              </div>
              <div className="p-3 rounded-lg border bg-muted/20">
                <span className="text-muted-foreground block">Next Follow-Up</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {quote.next_action_at ? new Date(quote.next_action_at).toLocaleDateString() : "—"}
                </span>
              </div>
            </div>

            {/* Linked Documents (Quote PDF & LOA) */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Linked Documents</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {linkedQuoteDoc ? (
                  <div className="p-3 rounded-lg border bg-card flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-xs font-semibold">{linkedQuoteDoc.document_name}</p>
                        <p className="text-[10px] text-muted-foreground">Quote Document PDF</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={async () => {
                        const res = await apiClient.getDocumentDownloadUrl(linkedQuoteDoc.id, "view")
                        if (res.download_url) window.open(res.download_url, "_blank")
                      }}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border border-dashed text-xs text-muted-foreground">
                    No quote PDF file linked yet.
                  </div>
                )}

                {linkedLoaDoc ? (
                  <div className="p-3 rounded-lg border bg-card flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <div>
                        <p className="text-xs font-semibold">{linkedLoaDoc.document_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          LOA &bull; Expires: {linkedLoaDoc.expiry_date ? new Date(linkedLoaDoc.expiry_date).toLocaleDateString() : "Active"}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={async () => {
                        const res = await apiClient.getDocumentDownloadUrl(linkedLoaDoc.id, "view")
                        if (res.download_url) window.open(res.download_url, "_blank")
                      }}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border border-dashed text-xs text-muted-foreground">
                    No signed LOA attached.
                  </div>
                )}
              </div>
            </div>

            {/* Notes if present */}
            {quote.adviser_notes && (
              <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground block">Adviser Notes</span>
                <p className="text-xs text-foreground whitespace-pre-wrap">{quote.adviser_notes}</p>
              </div>
            )}

            {/* Follow-Up Contact History Timeline */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  Follow-Up History &amp; Contact Log ({history.length})
                </h4>
              </div>

              {history.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border rounded-lg border-dashed">
                  No contact attempts recorded yet. Click &quot;Record Contact Attempt&quot; above to log the first follow-up call, email, or message.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {history.map((h, idx) => (
                    <div key={h.id || idx} className="p-3 rounded-lg border bg-card space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {formatOutcomeLabel(h.outcome)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            by {h.adviser_name || "Adviser"}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {new Date(h.date).toLocaleString()}
                        </span>
                      </div>
                      {h.notes && (
                        <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                          {h.notes}
                        </p>
                      )}
                      {h.next_action_at && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Next action scheduled: {new Date(h.next_action_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
