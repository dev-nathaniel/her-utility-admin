"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Shield, ShieldCheck, UserCheck, Users, Zap, MapPin, Building2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { apiClient, type UserData } from "@/lib/api-client"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { toast } from "sonner"

export function UsersPage() {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
  const [roleFilter, setRoleFilter] = useState("all")

  useEffect(() => {
    const q = searchParams.get("search")
    if (q) setSearchQuery(q)
  }, [searchParams])

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiClient.getUsers(),
    refetchInterval: 30000,
  })

  const toggleAdminMutation = useMutation({
    mutationFn: ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) =>
      apiClient.toggleUserAdmin(userId, isAdmin),
    onSuccess: (data, variables) => {
      toast.success(
        variables.isAdmin
          ? "User promoted to Broker / Admin"
          : "Broker privileges revoked",
      )
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to update permissions")
    },
  })

  const filteredUsers = users.filter((u: any) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      (u.full_name || u.fullname || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.company_name || "").toLowerCase().includes(q)

    const matchesRole =
      roleFilter === "all"
        ? true
        : roleFilter === "admin"
        ? u.is_admin
        : !u.is_admin

    return matchesSearch && matchesRole
  })

  const columns: DataTableColumn<any>[] = [
    {
      key: "fullname",
      label: "User",
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 font-bold text-xs">
              {(u.full_name || u.fullname || u.email || "U").substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm leading-snug">{u.full_name || u.fullname || "—"}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "company_name",
      label: "Company",
      sortable: true,
      render: (u) => (
        <div className="text-sm">
          <p className="font-medium text-foreground">{u.company_name || "—"}</p>
          {u.is_multi_business && (
            <Badge variant="outline" className="text-[10px] mt-0.5">Multi-company</Badge>
          )}
        </div>
      ),
    },
    {
      key: "is_admin",
      label: "Role & Access",
      sortable: true,
      render: (u) => (
        u.is_admin ? (
          <Badge className="bg-purple-600 hover:bg-purple-700 text-white gap-1 font-semibold text-xs">
            <ShieldCheck className="h-3 w-3" />
            Broker Admin
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1 font-normal text-xs">
            <UserCheck className="h-3 w-3 text-muted-foreground" />
            Customer
          </Badge>
        )
      ),
    },
    {
      key: "property_count",
      label: "Sites",
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{u.property_count || 0}</span>
        </div>
      ),
    },
    {
      key: "contract_count",
      label: "Contracts",
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <Zap className="h-3.5 w-3.5 text-purple-600" />
          <span>{u.contract_count || 0}</span>
        </div>
      ),
    },
    {
      key: "created_at",
      label: "Joined",
      sortable: true,
      render: (u) => (
        <span className="text-xs text-muted-foreground">
          {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Permissions",
      render: (u) => (
        <Button
          variant="outline"
          size="sm"
          className={`h-7 px-2.5 text-xs gap-1.5 ${
            u.is_admin
              ? "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
              : "text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40"
          }`}
          onClick={() =>
            toggleAdminMutation.mutate({
              userId: u.id || u._id,
              isAdmin: !u.is_admin,
            })
          }
          disabled={toggleAdminMutation.isPending}
        >
          <Shield className="h-3 w-3" />
          <span>{u.is_admin ? "Demote" : "Make Admin"}</span>
        </Button>
      ),
    },
  ]

  const totalUsers = users.length
  const totalAdmins = users.filter((u: any) => u.is_admin).length
  const totalCustomers = totalUsers - totalAdmins

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users &amp; Access Control</h1>
        <p className="text-muted-foreground mt-0.5">
          View all platform accounts, monitor user utility portfolios, and manage admin privileges.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Accounts</p>
            <p className="text-2xl font-bold mt-1">{totalUsers}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <Users className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Customers</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{totalCustomers}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <UserCheck className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Brokers &amp; Admins</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{totalAdmins}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or company..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Filter Role:</span>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              <SelectItem value="customer">Customers Only</SelectItem>
              <SelectItem value="admin">Brokers &amp; Admins</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredUsers}
            isLoading={isLoading}
            searchable={false}
            emptyMessage="No users found matching your search."
          />
        </CardContent>
      </Card>
    </div>
  )
}
