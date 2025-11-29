"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Filter, MoreVertical, MapPin, Zap } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AddBusinessDialog } from "./add-business-dialog"
import { BusinessDetailsDialog } from "./business-details-dialog"
import { EditBusinessDialog } from "./edit-business-dialog"
import { DeactivateBusinessDialog } from "./deactivate-business-dialog"
import { useQuery } from "@tanstack/react-query"
import { apiClient, axiosInstance } from "@/lib/api-client"
import { useSearchParams } from "next/navigation"

// Dummy data (commented out, will be replaced by API calls)
/*
const mockBusinesses = [
  {
    id: 1,
    name: "Acme Corporation",
    email: "contact@acme.com",
    phone: "+1 (555) 123-4567",
    status: "Active",
    sites: 12,
    contracts: 24,
    totalValue: "$145,000",
    joinedDate: "2023-05-15",
  },
  // ... more mock data
]
*/

export function BusinessesPage() {
  const searchParams = useSearchParams()
  const urlSearch = searchParams.get("search") || ""

  const [searchQuery, setSearchQuery] = useState(urlSearch)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<any | null>(null)
  const [editBusiness, setEditBusiness] = useState<any | null>(null)
  const [deactivateBusiness, setDeactivateBusiness] = useState<any | null>(null)

  const { data: businessesData, isLoading } = useQuery({
    queryKey: ["businesses"],
    queryFn: () => apiClient.getBusinesses(),
  })

  const businesses = Array.isArray(businessesData?.businesses)
    ? businessesData.businesses
    : Array.isArray(businessesData?.data?.businesses)
      ? businessesData.data.businesses
      : []

  const filteredBusinesses = businesses.filter(
    (business: any) =>
      business.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  console.log("businesses-page", businesses)

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => apiClient.getDashboardStats(),
  })

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading businesses...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Businesses</h1>
          <p className="text-muted-foreground">Manage and onboard business accounts</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Business
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Businesses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.overview?.businessCount || 0}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.overview?.contractCount || 0}</div>
            <p className="text-xs text-muted-foreground">Across all businesses</p>
          </CardContent>
        </Card>
        {/* <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Contract Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$4.2M</div>
            <p className="text-xs text-muted-foreground">Annual recurring revenue</p>
          </CardContent>
        </Card> */}
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search businesses by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                {/* <TableHead>Contact</TableHead> */}
                {/* <TableHead>Status</TableHead> */}
                <TableHead>Sites</TableHead>
                <TableHead>Contracts</TableHead>
                {/* <TableHead>Total Value</TableHead> */}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBusinesses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No businesses found
                  </TableCell>
                </TableRow>
              ) : (
                filteredBusinesses.map((business: any) => (
                  <TableRow key={business._id} className="cursor-pointer" onClick={() => setSelectedBusiness(business)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{business.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{business.name}</p>
                          <p className="text-xs text-muted-foreground">Joined {new Date(business.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </TableCell>
                    {/* <TableCell>
                      <div>
                        <p className="text-sm">{business.email}</p>
                        <p className="text-xs text-muted-foreground">{business.phone}</p>
                      </div>
                    </TableCell> */}
                    {/* <TableCell>
                      <Badge variant={business.status === "Active" ? "default" : "secondary"}>{business.status}</Badge>
                    </TableCell> */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{business.numberOfSites}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        <span>{business.numberOfContracts}</span>
                      </div>
                    </TableCell>
                    {/* <TableCell className="font-medium">{business.totalValue}</TableCell> */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedBusiness(business)
                            }}
                          >
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditBusiness(business)
                            }}
                          >
                            Edit Business
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>View Contracts</DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeactivateBusiness(business)
                            }}
                            className="text-destructive"
                          >
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddBusinessDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <BusinessDetailsDialog
        business={selectedBusiness}
        open={!!selectedBusiness}
        onOpenChange={(open) => !open && setSelectedBusiness(null)}
      />
      <EditBusinessDialog
        business={editBusiness}
        open={!!editBusiness}
        onOpenChange={(open) => !open && setEditBusiness(null)}
      />
      <DeactivateBusinessDialog
        business={deactivateBusiness}
        open={!!deactivateBusiness}
        onOpenChange={(open) => !open && setDeactivateBusiness(null)}
      />
    </div>
  )
}
