"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Plus } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AddUserDialog } from "./add-user-dialog"
import { UserDetailsDialog } from "./user-details-dialog"
import { apiClient } from "@/lib/api-client"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import type { ReactNode } from "react"

export interface User {
  _id: string
  firstName: string
  lastName: string
  fullname: string
  email: string
  phoneNumber: string
  role: string
  profilePicture: string | null
  createdAt: string
  updatedAt: string
  numberOfBusinesses: number
  numberOfSites: number
  numberOfContracts: number
  status?: string
  company?: string
  emailVerified?: boolean
}

export function UsersPage() {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
  const [statusFilter, setStatusFilter] = useState("all")
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  useEffect(() => {
    const q = searchParams.get("search")
    if (q) setSearchQuery(q)
  }, [searchParams])

  const { data: response, isLoading } = useQuery({
    queryKey: ["users", searchQuery, statusFilter],
    queryFn: () => {
      return apiClient.getUsers({ search: searchQuery, status: statusFilter })
    },
  })

  const users: User[] = (response?.data as any)?.users || []

  const filteredUsers = users.filter((user: User) => {
    const matchesSearch =
      user.fullname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || (user.status || "Active") === statusFilter
    return matchesSearch && matchesStatus
  })

  useEffect(() => {
    const openId = searchParams.get("open")
    if (openId && users.length > 0) {
      const u = users.find((u: User) => u._id === openId)
      if (u) setSelectedUser(u)
    }
  }, [searchParams, users])

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: apiClient.getDashboardStats,
    placeholderData: {
      data: {
        overview: {
          userCount: 0,
          businessCount: 0,
          siteCount: 0,
          contractCount: 0,
        },
      }
    } as any,
  })

  const columns: DataTableColumn<User>[] = [
    {
      key: "fullname",
      label: "User",
      sortable: true,
      render: (user) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.profilePicture || "/placeholder.svg"} />
            <AvatarFallback>
              {user.fullname
                ?.split(" ")
                .map((n) => n[0])
                .join("") || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user.fullname}</p>
            <p className="text-xs text-muted-foreground">
              Joined {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      render: (user) => <span className="text-sm">{user.email}</span>,
    },
    {
      key: "role",
      label: "Role",
      sortable: true,
      render: (user) => <span className="capitalize">{user.role}</span>,
    },
    {
      key: "numberOfBusinesses",
      label: "Biz",
      sortable: true,
      className: "text-center",
    },
    {
      key: "numberOfSites",
      label: "Sites",
      sortable: true,
      className: "text-center",
    },
    {
      key: "numberOfContracts",
      label: "Contracts",
      sortable: true,
      className: "text-center",
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (user) => (
        <Badge variant={(user.status || "Active") === "Active" ? "default" : "secondary"}>
          {user.status || "Active"}
        </Badge>
      ),
    },
    {
      key: "_id",
      label: "",
      render: (user) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            setSelectedUser(user)
          }}
          className="text-right"
        >
          View
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage user accounts and their associated businesses</p>
        </div>
        <Button onClick={() => setAddUserOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{((stats as any)?.overview?.userCount) || 0}</div>
            <p className="text-xs text-muted-foreground">Across all businesses</p>
          </CardContent>
        </Card> */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{((stats as any)?.overview?.userCount) || 0}</div>
            <p className="text-xs text-muted-foreground">Total registered users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Businesses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{((stats as any)?.overview?.businessCount) || 0}</div>
            <p className="text-xs text-muted-foreground">Managed by users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Sites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{((stats as any)?.overview?.siteCount) || 0}</div>
            <p className="text-xs text-muted-foreground">Across all businesses</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
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
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredUsers}
            isLoading={isLoading}
            pageSize={15}
            exportable
            exportFilename="users"
            emptyMessage="No users found"
            rowKey={(u) => u._id}
            onRowClick={(u) => setSelectedUser(u)}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddUserDialog open={addUserOpen} onOpenChange={setAddUserOpen} />
      <UserDetailsDialog
        user={selectedUser}
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
      />
    </div>
  )
}
