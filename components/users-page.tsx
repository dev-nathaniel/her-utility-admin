"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Mail, Phone, Building2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AddUserDialog } from "./add-user-dialog"
import { UserDetailsDialog } from "./user-details-dialog"
import { apiClient } from "@/lib/api-client"

export interface User {
  _id: string
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
  status?: string // Optional as it might not be in API yet
  company?: string // Optional
}

export function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const { data: response, isLoading } = useQuery({
    queryKey: ["users", searchQuery, statusFilter],
    queryFn: () => {
      return apiClient.getUsers({ search: searchQuery, status: statusFilter })
    },
  })

  const users: User[] = response?.users || []

  const filteredUsers = users.filter((user: User) => {
    const matchesSearch =
      user.fullname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    // user.company?.toLowerCase().includes(searchQuery.toLowerCase()) // Company might not exist
    const matchesStatus = statusFilter === "all" || (user.status || "Active") === statusFilter
    return matchesSearch && matchesStatus
  })

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: apiClient.getDashboardStats,
    placeholderData: {
      overview: {
        userCount: 0,
        businessCount: 0,
        siteCount: 0,
        contractCount: 0,
      },
    },
  })

  console.log(stats, "stats users page")

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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.overview?.userCount || 0}</div>
            <p className="text-xs text-muted-foreground">Across all businesses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.overview?.userCount || 0}</div>
            <p className="text-xs text-muted-foreground">Total registered users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Businesses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.overview?.businessCount || 0}</div>
            <p className="text-xs text-muted-foreground">Managed by users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Sites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.overview?.siteCount || 0}</div>
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
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading users...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Contact</TableHead>
                  {/* <TableHead>Company</TableHead> */}
                  <TableHead>Role</TableHead>
                  <TableHead>Businesses</TableHead>
                  <TableHead>Sites</TableHead>
                  <TableHead>Contracts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user._id} className="cursor-pointer" onClick={() => setSelectedUser(user)}>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {user.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {user.phoneNumber || "N/A"}
                        </div>
                      </div>
                    </TableCell>
                    {/* <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {user.company || "N/A"}
                      </div>
                    </TableCell> */}
                    <TableCell className="capitalize">{user.role}</TableCell>
                    <TableCell className="text-center font-medium">{user.numberOfBusinesses || 0}</TableCell>
                    <TableCell className="text-center font-medium">{user.numberOfSites || 0}</TableCell>
                    <TableCell className="text-center font-medium">{user.numberOfContracts || 0}</TableCell>
                    <TableCell>
                      <Badge variant={(user.status || "Active") === "Active" ? "default" : "secondary"}>{user.status || "Active"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedUser(user)
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
