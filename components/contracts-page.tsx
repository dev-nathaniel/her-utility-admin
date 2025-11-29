"use client"

import { DialogDescription } from "@/components/ui/dialog"

import { DialogTitle } from "@/components/ui/dialog"

import { DialogHeader } from "@/components/ui/dialog"

import { DialogContent } from "@/components/ui/dialog"

import { Dialog } from "@/components/ui/dialog"

import { TableCell } from "@/components/ui/table"

import { TableBody } from "@/components/ui/table"

import { TableHead } from "@/components/ui/table"

import { TableRow } from "@/components/ui/table"

import { TableHeader } from "@/components/ui/table"

import { Table } from "@/components/ui/table"

import { SelectItem } from "@/components/ui/select"

import { SelectContent } from "@/components/ui/select"

import { SelectValue } from "@/components/ui/select"

import { SelectTrigger } from "@/components/ui/select"

import { Select } from "@/components/ui/select"

import { TabsContent } from "@/components/ui/tabs"

import { TabsTrigger } from "@/components/ui/tabs"

import { TabsList } from "@/components/ui/tabs"

import { Tabs } from "@/components/ui/tabs"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, MapPin, Zap, Building2, Calendar, AlertTriangle, AlertCircle, Clock } from "lucide-react"
import { ContractDetailsDialog } from "./contract-details-dialog"
import { SiteDetailsDialog } from "./site-details-dialog"

const mockContracts = [
  {
    id: 1,
    contractNumber: "CNT-2024-001",
    customer: "Acme Corporation",
    site: "Main Office - New York",
    type: "Electricity",
    provider: "ConEd",
    startDate: "2023-01-15",
    endDate: "2025-01-14",
    annualValue: "$45,000",
    status: "Active",
    usage: "125,000 kWh/year",
  },
  {
    id: 2,
    contractNumber: "CNT-2024-002",
    customer: "Acme Corporation",
    site: "Main Office - New York",
    type: "Gas",
    provider: "National Grid",
    startDate: "2023-03-01",
    endDate: "2024-12-31",
    annualValue: "$28,000",
    status: "Expiring Soon",
    usage: "50,000 therms/year",
  },
  {
    id: 3,
    contractNumber: "CNT-2024-003",
    customer: "Global Industries Ltd",
    site: "Warehouse A - Newark",
    type: "Electricity",
    provider: "PSE&G",
    startDate: "2023-06-10",
    endDate: "2025-06-09",
    annualValue: "$52,000",
    status: "Active",
    usage: "180,000 kWh/year",
  },
  {
    id: 4,
    contractNumber: "CNT-2024-004",
    customer: "Retail Plus Inc",
    site: "Store #1 - Brooklyn",
    type: "Electricity",
    provider: "ConEd",
    startDate: "2024-01-01",
    endDate: "2026-01-01",
    annualValue: "$32,000",
    status: "Active",
    usage: "95,000 kWh/year",
  },
]

const mockSites = [
  {
    id: 1,
    name: "Main Office - New York",
    customer: "Acme Corporation",
    address: "123 Main St, New York, NY 10001",
    type: "Office",
    size: "25,000 sq ft",
    contracts: 3,
    totalValue: "$85,000",
    status: "Active",
  },
  {
    id: 2,
    name: "Warehouse A - Newark",
    customer: "Global Industries Ltd",
    address: "456 Industrial Blvd, Newark, NJ 07102",
    type: "Warehouse",
    size: "50,000 sq ft",
    contracts: 2,
    totalValue: "$72,000",
    status: "Active",
  },
  {
    id: 3,
    name: "Store #1 - Brooklyn",
    customer: "Retail Plus Inc",
    address: "789 Shopping Center, Brooklyn, NY 11201",
    type: "Retail",
    size: "8,000 sq ft",
    contracts: 1,
    totalValue: "$32,000",
    status: "Active",
  },
]

export function ContractsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedContract, setSelectedContract] = useState<(typeof mockContracts)[0] | null>(null)
  const [selectedSite, setSelectedSite] = useState<(typeof mockSites)[0] | null>(null)
  const [addContractOpen, setAddContractOpen] = useState(false)
  const [addSiteOpen, setAddSiteOpen] = useState(false)

  const { data: contracts = mockContracts, isLoading: contractsLoading } = useQuery({
    queryKey: ["contracts", searchQuery, statusFilter, typeFilter],
    queryFn: async () => {
      // const response = await apiClient.getContracts({ search: searchQuery, status: statusFilter, type: typeFilter })
      // return response.data
      return mockContracts // Using mock data for now
    },
  })

  const { data: sites = mockSites, isLoading: sitesLoading } = useQuery({
    queryKey: ["sites", searchQuery],
    queryFn: async () => {
      // const response = await apiClient.getSites({ search: searchQuery })
      // return response.data
      return mockSites // Using mock data for now
    },
  })

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch =
      contract.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.site.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.contractNumber.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || contract.status === statusFilter
    const matchesType = typeFilter === "all" || contract.type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  const filteredSites = sites.filter(
    (site) =>
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.customer.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const today = new Date()
  const criticalContracts = contracts.filter((contract) => {
    const endDate = new Date(contract.endDate)
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry > 0 && daysUntilExpiry <= 7
  })

  const urgentContracts = contracts.filter((contract) => {
    const endDate = new Date(contract.endDate)
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry > 7 && daysUntilExpiry <= 30
  })

  const warningContracts = contracts.filter((contract) => {
    const endDate = new Date(contract.endDate)
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry > 30 && daysUntilExpiry <= 60
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Utility Contracts & Sites</h1>
          <p className="text-muted-foreground">Manage utility contracts and customer locations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAddSiteOpen(true)}>
            <MapPin className="mr-2 h-4 w-4" />
            Add Site
          </Button>
          <Button onClick={() => setAddContractOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contract
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,847</div>
            <p className="text-xs text-muted-foreground">Across all customers</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Critical (≤7 days)</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalContracts.length}</div>
            <p className="text-xs text-muted-foreground">Require immediate action</p>
          </CardContent>
        </Card>
        <Card className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Urgent (≤30 days)</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-500">{urgentContracts.length}</div>
            <p className="text-xs text-muted-foreground">Within 30 days</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Warning (≤60 days)</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-500">{warningContracts.length}</div>
            <p className="text-xs text-muted-foreground">Within 60 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="contracts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contracts">
            Contracts
            {criticalContracts.length > 0 && (
              <Badge className="ml-2 h-5 min-w-5 rounded-full px-1.5 text-xs bg-destructive text-destructive-foreground">
                {criticalContracts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sites">Sites</TabsTrigger>
        </TabsList>

        <TabsContent value="contracts">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search contracts by customer, site, or number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Expiring Soon">Expiring Soon</SelectItem>
                    <SelectItem value="Expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Electricity">Electricity</SelectItem>
                    <SelectItem value="Gas">Gas</SelectItem>
                    <SelectItem value="Water">Water</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {contractsLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading contracts...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contract #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Annual Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContracts.map((contract) => (
                      <TableRow
                        key={contract.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedContract(contract)}
                      >
                        <TableCell className="font-medium">{contract.contractNumber}</TableCell>
                        <TableCell>{contract.customer}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{contract.site}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-primary" />
                            <Badge variant="outline">{contract.type}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>{contract.provider}</TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {new Date(contract.startDate).toLocaleDateString()} -{" "}
                            {new Date(contract.endDate).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{contract.annualValue}</TableCell>
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
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedContract(contract)
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sites">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Customer Sites</CardTitle>
                  <CardDescription>All customer locations and facilities</CardDescription>
                </div>
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search sites..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {sitesLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading sites...</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredSites.map((site) => (
                    <Card
                      key={site.id}
                      className="cursor-pointer transition-colors hover:bg-accent"
                      onClick={() => setSelectedSite(site)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{site.name}</CardTitle>
                              <CardDescription>{site.customer}</CardDescription>
                            </div>
                          </div>
                          <Badge>{site.status}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {site.address}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Type: {site.type}</span>
                          <span className="text-muted-foreground">{site.size}</span>
                        </div>
                        <div className="flex items-center justify-between border-t pt-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Contracts</p>
                            <p className="text-lg font-bold">{site.contracts}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Total Value</p>
                            <p className="text-lg font-bold">{site.totalValue}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ContractDetailsDialog
        contract={selectedContract}
        open={!!selectedContract}
        onOpenChange={(open) => !open && setSelectedContract(null)}
      />
      <SiteDetailsDialog
        site={selectedSite}
        open={!!selectedSite}
        onOpenChange={(open) => !open && setSelectedSite(null)}
      />

      <Dialog open={addContractOpen} onOpenChange={setAddContractOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Contract</DialogTitle>
            <DialogDescription>Create a new utility contract for a customer site</DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center text-muted-foreground">Contract creation form coming soon</div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddContractOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setAddContractOpen(false)}>Save Contract</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addSiteOpen} onOpenChange={setAddSiteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Site</DialogTitle>
            <DialogDescription>Create a new customer location</DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center text-muted-foreground">Site creation form coming soon</div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddSiteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setAddSiteOpen(false)}>Save Site</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
