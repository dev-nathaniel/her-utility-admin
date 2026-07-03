"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, MapPin, Zap } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AddBusinessDialog } from "./add-business-dialog"
import { BusinessDetailsDialog } from "./business-details-dialog"
import { EditBusinessDialog } from "./edit-business-dialog"
import { DeactivateBusinessDialog } from "./deactivate-business-dialog"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
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
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<any | null>(null)
  const [editBusiness, setEditBusiness] = useState<any | null>(null)
  const [deactivateBusiness, setDeactivateBusiness] = useState<any | null>(null)

  useEffect(() => {
    const q = searchParams.get("search")
    if (q) setSearchQuery(q)
  }, [searchParams])

  const { data: businessesData, isLoading } = useQuery({
    queryKey: ["businesses"],
    queryFn: () => apiClient.getBusinesses(),
  })

  const businesses = Array.isArray(businessesData?.businesses)
    ? businessesData.businesses
    : Array.isArray(businessesData?.data?.businesses)
      ? businessesData.data.businesses
      : []

  useEffect(() => {
    const openId = searchParams.get("open")
    if (openId && businesses.length > 0) {
      const biz = businesses.find((b: any) => b._id === openId)
      if (biz) setSelectedBusiness(biz)
    }
  }, [searchParams, businesses])

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

  const columns: DataTableColumn<any>[] = [
    {
      key: "name",
      label: "Business",
      sortable: true,
      render: (business) => (
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{business.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{business.name}</p>
            <p className="text-xs text-muted-foreground">Joined {new Date(business.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      ),
    },
    {
      key: "numberOfSites",
      label: "Sites",
      sortable: true,
      render: (business) => (
        <div className="flex items-center gap-1">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>{business.numberOfSites}</span>
        </div>
      ),
    },
    {
      key: "numberOfContracts",
      label: "Contracts",
      sortable: true,
      render: (business) => (
        <div className="flex items-center gap-1">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <span>{business.numberOfContracts}</span>
        </div>
      ),
    },
    {
      key: "_id",
      label: "",
      render: (business) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon">
              <span className="sr-only">Actions</span>...
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
      ),
    },
  ]

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
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <div className="relative flex-1">
            <Input
              placeholder="Search businesses by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredBusinesses}
            isLoading={isLoading}
            pageSize={15}
            exportable
            exportFilename="businesses"
            emptyMessage="No businesses found"
            rowKey={(b) => b._id}
            onRowClick={(b) => setSelectedBusiness(b)}
          />
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
