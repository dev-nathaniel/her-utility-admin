"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Calendar, DollarSign, Zap, TrendingUp, FileText } from "lucide-react"
import { Separator } from "@/components/ui/separator"

interface ContractDetailsDialogProps {
  contract: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContractDetailsDialog({ contract, open, onOpenChange }: ContractDetailsDialogProps) {
  const [editMode, setEditMode] = useState(false)
  const queryClient = useQueryClient()

  const viewDocumentsMutation = useMutation({
    mutationFn: async (contractId: number) => {
      // return await apiClient.getContractDocuments(contractId)
      console.log("[v0] Fetching documents for contract:", contractId)
      alert("View Documents feature coming soon")
    },
  })

  const usageHistoryMutation = useMutation({
    mutationFn: async (contractId: number) => {
      // return await apiClient.getContractUsageHistory(contractId)
      console.log("[v0] Fetching usage history for contract:", contractId)
      alert("Usage History feature coming soon")
    },
  })

  const billingDetailsMutation = useMutation({
    mutationFn: async (contractId: number) => {
      // return await apiClient.getContractBillingDetails(contractId)
      console.log("[v0] Fetching billing details for contract:", contractId)
      alert("Billing Details feature coming soon")
    },
  })

  const renewContractMutation = useMutation({
    mutationFn: async (contractId: number) => {
      // return await apiClient.renewContract(contractId)
      console.log("[v0] Renewing contract:", contractId)
      alert("Renew Contract feature coming soon")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] })
    },
  })

  if (!contract) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">{contract.contractNumber}</DialogTitle>
              <DialogDescription className="mt-1">{contract.customer}</DialogDescription>
            </div>
            <Badge
              variant={
                contract.status === "Active"
                  ? "default"
                  : contract.status === "Expiring Soon"
                    ? "destructive"
                    : "secondary"
              }
            >
              {contract.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Contract Overview */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Site Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span className="font-medium">{contract.site}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Utility Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <span className="font-medium">{contract.type}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contract Details */}
          <Card>
            <CardHeader>
              <CardTitle>Contract Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Provider</p>
                  <p className="text-base font-medium">{contract.provider}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Annual Value</p>
                  <p className="text-base font-medium">{contract.annualValue}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="text-base font-medium">{new Date(contract.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="text-base font-medium">{new Date(contract.endDate).toLocaleDateString()}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Estimated Usage</p>
                  <p className="text-base font-medium">{contract.usage}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Contract duration:{" "}
                  {Math.round(
                    (new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime()) /
                      (1000 * 60 * 60 * 24 * 365),
                  )}{" "}
                  years
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Contract Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  variant="outline"
                  onClick={() => viewDocumentsMutation.mutate(contract.id)}
                  disabled={viewDocumentsMutation.isPending}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View Documents
                </Button>
                <Button
                  variant="outline"
                  onClick={() => usageHistoryMutation.mutate(contract.id)}
                  disabled={usageHistoryMutation.isPending}
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Usage History
                </Button>
                <Button
                  variant="outline"
                  onClick={() => billingDetailsMutation.mutate(contract.id)}
                  disabled={billingDetailsMutation.isPending}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Billing Details
                </Button>
                <Button
                  variant="outline"
                  onClick={() => renewContractMutation.mutate(contract.id)}
                  disabled={renewContractMutation.isPending}
                >
                  Renew Contract
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
            onClick={() => {
              setEditMode(true)
              alert("Edit Contract feature coming soon")
            }}
          >
            Edit Contract
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
