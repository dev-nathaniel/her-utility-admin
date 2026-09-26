"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin, Calendar, Zap, Clock, Edit2, Check, ShieldAlert } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"

interface ContractDetailsDialogProps {
  contract: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContractDetailsDialog({ contract, open, onOpenChange }: ContractDetailsDialogProps) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    supplier_name: contract?.supplier_name || "",
    meter_number: contract?.meter_number || "",
    account_number: contract?.account_number || "",
    end_date: contract?.end_date || contract?.contract_end_date || "",
    unit_rate: contract?.unit_rate || "",
    standing_charge: contract?.standing_charge || "",
    annual_spend: contract?.annual_spend || "",
  })

  // Sync state on contract change
  useState(() => {
    if (contract) {
      setFormData({
        supplier_name: contract.supplier_name || "",
        meter_number: contract.meter_number || "",
        account_number: contract.account_number || "",
        end_date: contract.end_date || contract.contract_end_date || "",
        unit_rate: contract.unit_rate || "",
        standing_charge: contract.standing_charge || "",
        annual_spend: contract.annual_spend || "",
      })
    }
  })

  const updateMutation = useMutation({
    mutationFn: () => apiClient.updateContract(contract.id || contract._id, formData),
    onSuccess: () => {
      toast.success("Contract updated successfully")
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: ["contracts"] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to update contract")
    },
  })

  if (!contract) return null

  const getUrgencyBadge = (level: string) => {
    switch (level?.toLowerCase()) {
      case "critical":
        return <Badge variant="destructive">Critical (&lt;30 days)</Badge>
      case "high":
        return <Badge className="bg-amber-500 text-white">High (&lt;60 days)</Badge>
      case "medium":
        return <Badge className="bg-yellow-500 text-white">Medium (&lt;90 days)</Badge>
      case "renewable":
        return <Badge className="bg-blue-500 text-white">Renewable Now</Badge>
      case "expired":
        return <Badge variant="destructive">Expired</Badge>
      default:
        return <Badge variant="secondary">Normal</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <span className="capitalize">{contract.utility_type || "Utility"} Contract</span>
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                {contract.user_company || contract.customer || "Company"} &bull;{" "}
                {contract.property_name || contract.property_address || contract.site || "Site"}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {getUrgencyBadge(contract.urgency_level)}
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (isEditing) {
                    updateMutation.mutate()
                  } else {
                    setIsEditing(true)
                  }
                }}
                disabled={updateMutation.isPending}
                className="gap-1.5 h-8 text-xs"
              >
                {isEditing ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>{updateMutation.isPending ? "Saving..." : "Save"}</span>
                  </>
                ) : (
                  <>
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Edit Tariff</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Key Identifiers */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-muted/20">
              <Label className="text-xs text-muted-foreground block mb-1">Supplier</Label>
              {isEditing ? (
                <Input
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  placeholder="e.g. British Gas, EDF"
                  className="h-8 text-xs"
                />
              ) : (
                <p className="font-semibold text-sm">{contract.supplier_name || "—"}</p>
              )}
            </div>

            <div className="p-3 rounded-lg border bg-muted/20">
              <Label className="text-xs text-muted-foreground block mb-1">
                Meter / MPAN / MPRN
              </Label>
              {isEditing ? (
                <Input
                  value={formData.meter_number}
                  onChange={(e) => setFormData({ ...formData, meter_number: e.target.value })}
                  placeholder="e.g. 1200000000000"
                  className="h-8 text-xs"
                />
              ) : (
                <p className="font-semibold text-sm font-mono">{contract.meter_number || contract.account_number || "—"}</p>
              )}
            </div>
          </div>

          {/* Dates & Urgency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-muted/20">
              <Label className="text-xs text-muted-foreground block mb-1">Contract End Date</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={formData.end_date?.substring(0, 10)}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="h-8 text-xs"
                />
              ) : (
                <p className="font-semibold text-sm">
                  {contract.end_date || contract.contract_end_date
                    ? new Date(contract.end_date || contract.contract_end_date).toLocaleDateString()
                    : "Not specified"}
                </p>
              )}
            </div>

            <div className="p-3 rounded-lg border bg-muted/20">
              <span className="text-xs text-muted-foreground block mb-1">Renewal Countdown</span>
              <p className="font-semibold text-sm">
                {contract.days_until_expiry != null
                  ? contract.days_until_expiry < 0
                    ? `Expired (${Math.abs(contract.days_until_expiry)} days ago)`
                    : `${contract.days_until_expiry} days remaining`
                  : "No date set"}
              </p>
            </div>
          </div>

          {/* Tariffs & Rates */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tariff Rates &amp; Commercial Details
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground block mb-1">Unit Rate (p/kWh)</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.unit_rate}
                      onChange={(e) => setFormData({ ...formData, unit_rate: e.target.value })}
                      className="h-8 text-xs"
                    />
                  ) : (
                    <p className="font-bold text-sm">
                      {contract.unit_rate ? `${contract.unit_rate} p/kWh` : "—"}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground block mb-1">Standing Charge (p/day)</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.standing_charge}
                      onChange={(e) => setFormData({ ...formData, standing_charge: e.target.value })}
                      className="h-8 text-xs"
                    />
                  ) : (
                    <p className="font-bold text-sm">
                      {contract.standing_charge ? `${contract.standing_charge} p/day` : "—"}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground block mb-1">Est. Annual Spend (£)</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="1"
                      value={formData.annual_spend}
                      onChange={(e) => setFormData({ ...formData, annual_spend: e.target.value })}
                      className="h-8 text-xs"
                    />
                  ) : (
                    <p className="font-bold text-sm">
                      {contract.annual_spend ? `£${Number(contract.annual_spend).toLocaleString()}` : "—"}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location & Account */}
          <div className="p-3 rounded-lg border text-xs space-y-1">
            <p className="font-semibold text-foreground">Site Address:</p>
            <p className="text-muted-foreground">
              {contract.property_address || contract.site || "No address specified"}
              {contract.property_postcode && ` (${contract.property_postcode})`}
            </p>
            <p className="text-muted-foreground pt-1">
              Registered Client: <span className="text-foreground font-medium">{contract.user_email}</span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
