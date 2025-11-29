"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Building2, Zap, Plus } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { Loader2 } from "lucide-react"

interface SiteDetailsDialogProps {
  site: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

const mockSiteContracts = [
  {
    id: 1,
    type: "Electricity",
    provider: "ConEd",
    startDate: "2023-01-15",
    endDate: "2025-01-14",
    value: "$45,000",
    status: "Active",
  },
  {
    id: 2,
    type: "Gas",
    provider: "National Grid",
    startDate: "2023-03-01",
    endDate: "2024-12-31",
    value: "$28,000",
    status: "Expiring Soon",
  },
  {
    id: 3,
    type: "Water",
    provider: "NYC Water",
    startDate: "2023-01-01",
    endDate: "2025-01-01",
    value: "$12,000",
    status: "Active",
  },
]

export function SiteDetailsDialog({ site, open, onOpenChange }: SiteDetailsDialogProps) {
  const [editMode, setEditMode] = useState(false)

  const { data: siteDetails, isLoading } = useQuery({
    queryKey: ["site", site?.id],
    queryFn: () => apiClient.getSiteWithContracts(site.id),
    enabled: !!site && open,
    placeholderData: site,
  })

  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ["site-contracts", site?.id],
    queryFn: () => apiClient.getSiteContracts(site.id),
    enabled: !!site && open,
    // Uncomment mock data for development
    // placeholderData: mockSiteContracts,
  })

  if (!site) return null

  const displaySite = siteDetails || site

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl">{displaySite.name}</DialogTitle>
                <DialogDescription className="mt-1">{displaySite.customer}</DialogDescription>
              </div>
            </div>
            <Badge>{displaySite.status}</Badge>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Site Information */}
            <Card>
              <CardHeader>
                <CardTitle>Site Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{displaySite.address}</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Site Type</p>
                    <p className="font-medium">{displaySite.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Size</p>
                    <p className="font-medium">{displaySite.size}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="default">{displaySite.status}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">{displaySite.contracts}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Annual Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{displaySite.totalValue}</div>
                </CardContent>
              </Card>
            </div>

            {/* Contracts at this site */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Utility Contracts</CardTitle>
                    <p className="text-sm text-muted-foreground">All contracts at this location</p>
                  </div>
                  <Button size="sm" onClick={() => alert("Add Contract feature coming soon")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Contract
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {contractsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Term</TableHead>
                        <TableHead>Annual Value</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contracts.map((contract: any) => (
                        <TableRow key={contract.id}>
                          <TableCell>
                            <Badge variant="outline">{contract.type}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{contract.provider}</TableCell>
                          <TableCell className="text-sm">
                            {new Date(contract.startDate).toLocaleDateString()} -{" "}
                            {new Date(contract.endDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">{contract.value}</TableCell>
                          <TableCell>
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
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={() => {
              setEditMode(true)
              alert("Edit Site feature coming soon")
            }}
          >
            Edit Site
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
