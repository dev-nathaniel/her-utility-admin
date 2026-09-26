"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Mail, Phone, Calendar, Zap, Building2, Plus, CheckCircle2, AlertCircle, Clock } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"

interface BusinessDetailsDialogProps {
  business: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BusinessDetailsDialog({ business, open, onOpenChange }: BusinessDetailsDialogProps) {
  const queryClient = useQueryClient()
  const [newNote, setNewNote] = useState("")

  const businessId = business?.id || business?._id

  const { data: detail, isLoading } = useQuery({
    queryKey: ["company-detail", businessId],
    queryFn: () => apiClient.getCompany(businessId),
    enabled: !!businessId && open,
  })

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: string) => apiClient.updateCompanyStatus(businessId, newStatus),
    onSuccess: () => {
      toast.success("Pipeline status updated")
      queryClient.invalidateQueries({ queryKey: ["company-detail", businessId] })
      queryClient.invalidateQueries({ queryKey: ["companies"] })
      queryClient.invalidateQueries({ queryKey: ["recent-customers"] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to update status")
    },
  })

  const addNoteMutation = useMutation({
    mutationFn: () => apiClient.addCompanyNote(businessId, newNote),
    onSuccess: () => {
      toast.success("Note added")
      setNewNote("")
      queryClient.invalidateQueries({ queryKey: ["company-detail", businessId] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to add note")
    },
  })

  if (!business) return null

  const comp = detail?.company || business
  const properties = detail?.properties || []
  const contracts = detail?.contracts || []
  const notes = detail?.notes || []
  const tasks = detail?.tasks || []
  const currentStatus = comp.pipeline_status || "new_lead"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-primary/10">
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-base">
                  {(comp.company_name || comp.name || "C").substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-xl font-bold">{comp.company_name || comp.name}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-0.5">
                  <span>{comp.email}</span>
                  {comp.full_name && <span>&bull; {comp.full_name}</span>}
                </DialogDescription>
              </div>
            </div>

            {/* Pipeline Status Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Pipeline:</span>
              <Select
                value={currentStatus}
                onValueChange={(val) => updateStatusMutation.mutate(val)}
                disabled={updateStatusMutation.isPending}
              >
                <SelectTrigger className="w-36 h-8 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_lead">New Lead</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="quote_sent">Quote Sent</SelectItem>
                  <SelectItem value="customer">Active Customer</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading company records...</div>
        ) : (
          <Tabs defaultValue="sites" className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="sites">Sites ({properties.length})</TabsTrigger>
              <TabsTrigger value="contracts">Contracts ({contracts.length})</TabsTrigger>
              <TabsTrigger value="notes">Notes &amp; Activity</TabsTrigger>
              <TabsTrigger value="details">Company Info</TabsTrigger>
            </TabsList>

            {/* Tab: Sites */}
            <TabsContent value="sites" className="space-y-4 mt-4">
              {properties.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No sites/properties registered yet.</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {properties.map((p: any) => (
                    <Card key={p.id || p._id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{p.property_name || "Primary Site"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.address}</p>
                          <p className="text-xs font-mono font-medium text-foreground mt-1">
                            {p.postcode}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab: Contracts */}
            <TabsContent value="contracts" className="space-y-4 mt-4">
              {contracts.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No utility contracts attached yet.</div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Utility</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Urgency</TableHead>
                        <TableHead>Tariff Rates</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contracts.map((c: any) => (
                        <TableRow key={c.id || c._id}>
                          <TableCell className="font-medium capitalize flex items-center gap-2">
                            <Zap className="h-4 w-4 text-muted-foreground" />
                            {c.utility_type}
                          </TableCell>
                          <TableCell>{c.supplier_name || "—"}</TableCell>
                          <TableCell>
                            {c.end_date || c.contract_end_date ? new Date(c.end_date || c.contract_end_date).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={c.urgency_level === "critical" ? "destructive" : "secondary"}
                              className="capitalize text-xs"
                            >
                              {c.urgency_level || "Normal"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {c.unit_rate ? `${c.unit_rate} p/kWh` : "—"} / {c.standing_charge ? `${c.standing_charge} p/day` : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Tab: Notes */}
            <TabsContent value="notes" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a broker note about this client or negotiation..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[80px]"
                />
                <Button
                  size="sm"
                  onClick={() => addNoteMutation.mutate()}
                  disabled={!newNote.trim() || addNoteMutation.isPending}
                >
                  {addNoteMutation.isPending ? "Adding..." : "Add Note"}
                </Button>
              </div>

              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">History</p>
                {notes.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4">No notes recorded yet.</p>
                ) : (
                  notes.map((n: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg border bg-muted/30 space-y-1">
                      <p className="text-xs text-foreground">{n.body || n.note}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Tab: Info */}
            <TabsContent value="details" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg border">
                  <span className="text-xs text-muted-foreground block">Company Name</span>
                  <span className="font-semibold">{comp.company_name || comp.name || "—"}</span>
                </div>
                <div className="p-3 rounded-lg border">
                  <span className="text-xs text-muted-foreground block">Email</span>
                  <span className="font-semibold">{comp.email || "—"}</span>
                </div>
                <div className="p-3 rounded-lg border">
                  <span className="text-xs text-muted-foreground block">Business Type</span>
                  <span className="font-semibold capitalize">{comp.business_type || "Limited Company"}</span>
                </div>
                <div className="p-3 rounded-lg border">
                  <span className="text-xs text-muted-foreground block">Company Number</span>
                  <span className="font-semibold">{comp.company_number || "—"}</span>
                </div>
                <div className="p-3 rounded-lg border">
                  <span className="text-xs text-muted-foreground block">Assigned Broker</span>
                  <span className="font-semibold">{comp.assigned_broker_name || "Unassigned"}</span>
                </div>
                <div className="p-3 rounded-lg border">
                  <span className="text-xs text-muted-foreground block">Joined Date</span>
                  <span className="font-semibold">
                    {comp.created_at ? new Date(comp.created_at).toLocaleDateString() : "—"}
                  </span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
