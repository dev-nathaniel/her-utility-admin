"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, UserPlus, Shield, Mail } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { Loader2 } from "lucide-react"

export function AdminsPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [addAdminOpen, setAddAdminOpen] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null)
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false)

  const { data: adminsData, isLoading: adminsLoading } = useQuery({
    queryKey: ["admins"],
    queryFn: () => apiClient.getAdmins(),
    // Uncomment mock data for development
    // placeholderData: mockAdmins,
  })

  const admins = Array.isArray(adminsData) ? adminsData : Array.isArray(adminsData?.data) ? adminsData.data : []

  const { data: pendingAdminsData, isLoading: pendingLoading } = useQuery({
    queryKey: ["pending-admins"],
    queryFn: () => apiClient.getPendingAdmins(),
    // Uncomment mock data for development
    // placeholderData: mockPendingAdmins,
  })

  const pendingAdmins = Array.isArray(pendingAdminsData)
    ? pendingAdminsData
    : Array.isArray(pendingAdminsData?.data)
      ? pendingAdminsData.data
      : []

  const verifyAdminMutation = useMutation({
    mutationFn: (adminId: number) => apiClient.verifyAdmin(adminId),
    onSuccess: () => {
      toast({ title: `${selectedAdmin?.name} has been verified and can now access the system` })
      queryClient.invalidateQueries({ queryKey: ["admins"] })
      queryClient.invalidateQueries({ queryKey: ["pending-admins"] })
      setVerifyDialogOpen(false)
      setSelectedAdmin(null)
    },
    onError: () => {
      toast({ title: "Failed to verify admin", variant: "destructive" })
    },
  })

  const rejectAdminMutation = useMutation({
    mutationFn: (adminId: number) => apiClient.rejectAdmin(adminId),
    onSuccess: () => {
      toast({ title: "Admin registration rejected" })
      queryClient.invalidateQueries({ queryKey: ["pending-admins"] })
    },
    onError: () => {
      toast({ title: "Failed to reject admin", variant: "destructive" })
    },
  })

  const createAdminMutation = useMutation({
    mutationFn: (data: any) => apiClient.createAdmin(data),
    onSuccess: () => {
      toast({ title: "Admin account created successfully" })
      queryClient.invalidateQueries({ queryKey: ["admins"] })
      setAddAdminOpen(false)
    },
    onError: () => {
      toast({ title: "Failed to create admin", variant: "destructive" })
    },
  })

  const handleVerifyAdmin = (admin: any) => {
    setSelectedAdmin(admin)
    setVerifyDialogOpen(true)
  }

  const confirmVerification = () => {
    verifyAdminMutation.mutate(selectedAdmin.id)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Management</h1>
          <p className="text-muted-foreground">Manage admin users and verify new registrations</p>
        </div>
        <Button onClick={() => setAddAdminOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Admin
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{admins.length}</div>
            <p className="text-xs text-muted-foreground">Active administrators</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingAdmins.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Full system access</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Admins</TabsTrigger>
          <TabsTrigger value="pending">
            Pending Verification
            {pendingAdmins.length > 0 && (
              <Badge className="ml-2 bg-accent text-accent-foreground">{pendingAdmins.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search admins..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {adminsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Admin</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins.map((admin: any) => (
                      <TableRow key={admin.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>{admin?.name?.substring(0, 2).toUpperCase() || "AD"}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{admin.name}</p>
                              <p className="text-xs text-muted-foreground">Joined {admin.createdAt}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            <span>{admin.role}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">{admin.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{admin.lastLogin}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            Edit
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

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Admin Verifications</CardTitle>
              <CardDescription>Review and approve new admin registrations</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Admin</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Requested Role</TableHead>
                      <TableHead>Registration Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingAdmins.map((admin: any) => (
                      <TableRow key={admin.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>{admin?.name?.substring(0, 2).toUpperCase() || "AD"}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{admin.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{admin.role}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{admin.createdAt}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" onClick={() => handleVerifyAdmin(admin)}>
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectAdminMutation.mutate(admin.id)}
                              disabled={rejectAdminMutation.isPending}
                            >
                              Reject
                            </Button>
                          </div>
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

      {/* Add Admin Dialog */}
      <Dialog open={addAdminOpen} onOpenChange={setAddAdminOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Admin</DialogTitle>
            <DialogDescription>Create a new administrator account</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="admin-name">Full Name</Label>
              <Input id="admin-name" placeholder="John Doe" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-email">Email Address</Label>
              <Input id="admin-email" type="email" placeholder="admin@company.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-role">Role</Label>
              <Select defaultValue="admin">
                <SelectTrigger id="admin-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super-admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-password">Temporary Password</Label>
              <Input id="admin-password" type="password" placeholder="Generate secure password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddAdminOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                createAdminMutation.mutate({
                  name: "John Doe",
                  email: "admin@company.com",
                  role: "admin",
                  password: "password",
                })
              }}
            >
              <Mail className="mr-2 h-4 w-4" />
              Create & Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify Admin Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Admin Registration</DialogTitle>
            <DialogDescription>Are you sure you want to approve this admin registration?</DialogDescription>
          </DialogHeader>
          {selectedAdmin && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm font-medium">{selectedAdmin.name}</p>
                <p className="text-sm text-muted-foreground">{selectedAdmin.email}</p>
                <Badge variant="outline" className="mt-2">
                  {selectedAdmin.role}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Once approved, {selectedAdmin.name} will receive an email notification and will be able to access the
                CRM dashboard with {selectedAdmin.role} privileges.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmVerification}>Approve Admin</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
