"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mail, Phone, Calendar, Loader2, ShieldCheck, Pencil, Save, X, Building2, Zap } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { User } from "./users-page"
import { toast } from "sonner"

interface UserDetailsDialogProps {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserDetailsDialog({ user, open, onOpenChange }: UserDetailsDialogProps) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
    status: "",
  })

  const { data: userDetails, isLoading } = useQuery({
    queryKey: ["user", user?._id],
    queryFn: () => {
      if (!user?._id) return null
      return apiClient.getUser(user._id)
    },
    enabled: !!user?._id && open,
  })

  const { data: businessesData } = useQuery({
    queryKey: ["businesses-list"],
    queryFn: () => apiClient.getBusinesses(),
    enabled: open,
  })

  const { data: sitesData } = useQuery({
    queryKey: ["sites-for-user"],
    queryFn: () => apiClient.getSites(),
    enabled: open,
  })

  const { data: contractsData } = useQuery({
    queryKey: ["contracts-for-user"],
    queryFn: () => apiClient.getContracts(),
    enabled: open,
  })

  const updateUserMutation = useMutation({
    mutationFn: (data: { id: string; updates: Partial<User> }) =>
      apiClient.updateUser({ id: data.id, data: data.updates }),
    onSuccess: () => {
      toast.success("User updated successfully")
      queryClient.invalidateQueries({ queryKey: ["user", user?._id] })
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setEditing(false)
    },
    onError: () => {
      toast.error("Failed to update user")
    },
  })

  if (!user) return null

  const displayUser = ((userDetails?.data as any)?.user || user) as User

  const rawBusinesses = businessesData?.data
  const businessesList: any[] = Array.isArray(rawBusinesses) ? rawBusinesses : ((rawBusinesses as any)?.businesses || [])
  const userBusinesses = businessesList.filter(
    (b) => b.members?.some((m: any) => m.userId === displayUser._id)
  )

  const userSitesIds = userBusinesses.flatMap((b) => b.sites || [])

  const allSites: any[] = Array.isArray(sitesData?.data) ? sitesData.data : ((sitesData?.data as any)?.sites || [])
  const relevantSites = allSites.filter((s: any) => userSitesIds.includes(s._id))

  const allContracts: any[] = Array.isArray(contractsData?.data) ? contractsData.data : ((contractsData?.data as any)?.contracts || [])
  const relevantSiteIds = new Set(relevantSites.map((s) => s._id))
  const relevantContracts = allContracts.filter((c) => relevantSiteIds.has(c.siteId || c.site?._id))

  const startEditing = () => {
    const names = displayUser.fullname?.split(" ") || ["", ""]
    setEditForm({
      firstName: names[0] || "",
      lastName: names.slice(1).join(" ") || "",
      email: displayUser.email || "",
      role: displayUser.role || "",
      status: displayUser.status || "Active",
    })
    setEditing(true)
  }

  const handleSave = () => {
    if (!user._id) return
    updateUserMutation.mutate({
      id: user._id,
      updates: {
        fullname: `${editForm.firstName} ${editForm.lastName}`,
        email: editForm.email,
        role: editForm.role,
        status: editForm.status,
      },
    })
  }

  const isVerified = displayUser.emailVerified !== false

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setEditing(false); onOpenChange(o) }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-start justify-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={displayUser.profilePicture || "/placeholder.svg"} />
                <AvatarFallback>
                  {displayUser.fullname
                    ? displayUser.fullname
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                    : "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-2xl">{displayUser.fullname || "Unknown User"}</DialogTitle>
                <DialogDescription className="mt-1 flex items-center gap-2">
                  {displayUser.role || "User"}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isVerified ? "default" : "secondary"} className="gap-1">
                <ShieldCheck className="h-3 w-3" />
                {isVerified ? "Verified" : "Unverified"}
              </Badge>
              <Badge variant={(displayUser.status || "Active") === "Active" ? "default" : "secondary"}>
                {displayUser.status || "Active"}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Contact Information</CardTitle>
                {!editing ? (
                  <Button variant="outline" size="sm" onClick={startEditing}>
                    <Pencil className="mr-2 h-3 w-3" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                      <X className="mr-2 h-3 w-3" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={updateUserMutation.isPending}>
                      {updateUserMutation.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                      <Save className="mr-2 h-3 w-3" />
                      Save
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {editing ? (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-firstname">First Name</Label>
                      <Input
                        id="edit-firstname"
                        value={editForm.firstName}
                        onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-lastname">Last Name</Label>
                      <Input
                        id="edit-lastname"
                        value={editForm.lastName}
                        onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-email">Email</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-role">Role</Label>
                      <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                        <SelectTrigger id="edit-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="host">Host</SelectItem>
                          <SelectItem value="guest">Guest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-status">Status</Label>
                      <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                        <SelectTrigger id="edit-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{displayUser.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{displayUser.phoneNumber || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Joined</p>
                        <p className="font-medium">{new Date(displayUser.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email Verified</p>
                        <p className="font-medium">{isVerified ? "Yes" : "No"}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Businesses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userBusinesses.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Sites</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{relevantSites.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Contracts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{relevantContracts.length}</div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="businesses">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="businesses">Businesses</TabsTrigger>
                <TabsTrigger value="sites">Sites</TabsTrigger>
                <TabsTrigger value="contracts">Contracts</TabsTrigger>
              </TabsList>
              <TabsContent value="businesses" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    {userBusinesses.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No businesses found</p>
                    ) : (
                      <div className="space-y-3">
                        {userBusinesses.map((b: any) => (
                          <div key={b._id} className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback>{(b.name || "").substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{b.name}</p>
                                <p className="text-xs text-muted-foreground">{b.address || ""}</p>
                              </div>
                            </div>
                            <Badge variant="outline">{b.members?.length || 0} members</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="sites" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    {relevantSites.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No sites found</p>
                    ) : (
                      <div className="space-y-3">
                        {relevantSites.map((s: any) => (
                          <div key={s._id} className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                <Building2 className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{s.name}</p>
                                <p className="text-xs text-muted-foreground">{s.address || ""}</p>
                              </div>
                            </div>
                            <Badge variant="outline">{(s.contracts?.length ?? 0)} contracts</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="contracts" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    {relevantContracts.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No contracts found</p>
                    ) : (
                      <div className="space-y-3">
                        {relevantContracts.map((c: any) => (
                          <div key={c._id} className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                <Zap className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{c.name || c.type || "Contract"}</p>
                                <p className="text-xs text-muted-foreground">{c.supplier || c.provider || (typeof c.site === "string" ? c.site : c.site?.name) || ""}</p>
                              </div>
                            </div>
                            <Badge variant={(c.status === "Active" || c.status === "active") ? "default" : "secondary"}>{c.status || "Unknown"}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => { onOpenChange(false); setEditing(false) }}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
