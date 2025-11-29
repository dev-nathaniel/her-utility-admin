"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Mail, Phone, Calendar, Zap, Building2 } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { Loader2 } from "lucide-react"

interface BusinessDetailsDialogProps {
  business: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

const mockSites = [
  { id: 1, name: "Main Office", address: "123 Main St, New York, NY", contracts: 3, status: "Active" },
  { id: 2, name: "Warehouse A", address: "456 Industrial Blvd, Newark, NJ", contracts: 2, status: "Active" },
  { id: 3, name: "Retail Store #1", address: "789 Shopping Center, Brooklyn, NY", contracts: 1, status: "Active" },
]

const mockContracts = [
  {
    id: 1,
    site: "Main Office",
    type: "Electricity",
    provider: "ConEd",
    startDate: "2023-01-15",
    endDate: "2025-01-14",
    status: "Active",
    value: "$45,000",
  },
  {
    id: 2,
    site: "Main Office",
    type: "Gas",
    provider: "National Grid",
    startDate: "2023-03-01",
    endDate: "2024-12-31",
    status: "Active",
    value: "$28,000",
  },
  {
    id: 3,
    site: "Warehouse A",
    type: "Electricity",
    provider: "PSE&G",
    startDate: "2023-06-10",
    endDate: "2025-06-09",
    status: "Active",
    value: "$52,000",
  },
]

export function BusinessDetailsDialog({ business, open, onOpenChange }: BusinessDetailsDialogProps) {
  const [editMode, setEditMode] = useState(false)

  const { data: businessDetails, isLoading } = useQuery({
    queryKey: ["business", business?.id],
    queryFn: () => apiClient.getBusiness(business.id),
    enabled: !!business && open,
    placeholderData: business,
  })

  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ["business-sites", business?.id],
    queryFn: () => apiClient.getBusinessSites(business.id),
    enabled: !!business && open,
    // Uncomment mock data for development
    // placeholderData: mockSites,
  })

  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ["business-contracts", business?.id],
    queryFn: () => apiClient.getBusinessContracts(business.id),
    enabled: !!business && open,
    // Uncomment mock data for development
    // placeholderData: mockContracts,
  })

  if (!business) return null

  const displayBusiness = businessDetails || business

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback>{displayBusiness.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-2xl">{displayBusiness.name}</DialogTitle>
              <DialogDescription className="mt-1">Business since {displayBusiness.joinedDate}</DialogDescription>
            </div>
            <Badge variant={displayBusiness.status === "Active" ? "default" : "secondary"}>
              {displayBusiness.status}
            </Badge>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sites">Sites</TabsTrigger>
              <TabsTrigger value="contracts">Contracts</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{displayBusiness.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{displayBusiness.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Joined on {displayBusiness.joinedDate}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Stats */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Sites</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-bold">{displayBusiness.sites}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-bold">{displayBusiness.contracts}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{displayBusiness.totalValue}</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="sites" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Business Sites</CardTitle>
                      <CardDescription>All locations for this business</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => alert("Add Site feature coming soon")}>
                      Add Site
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {sitesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sites.map((site: any) => (
                        <div key={site.id} className="flex items-center justify-between rounded-lg border p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{site.name}</p>
                              <p className="text-sm text-muted-foreground">{site.address}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">{site.contracts} contracts</Badge>
                            <p className="mt-1 text-xs text-muted-foreground">{site.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contracts" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Utility Contracts</CardTitle>
                      <CardDescription>All active contracts across sites</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => alert("Add Contract feature coming soon")}>
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
                          <TableHead>Site</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Provider</TableHead>
                          <TableHead>Term</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contracts.map((contract: any) => (
                          <TableRow key={contract.id}>
                            <TableCell className="font-medium">{contract.site}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{contract.type}</Badge>
                            </TableCell>
                            <TableCell>{contract.provider}</TableCell>
                            <TableCell className="text-sm">
                              {contract.startDate} to {contract.endDate}
                            </TableCell>
                            <TableCell className="font-medium">{contract.value}</TableCell>
                            <TableCell>
                              <Badge variant="default">{contract.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={() => {
              setEditMode(true)
              alert("Edit Business feature coming soon")
            }}
          >
            Edit Business
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
