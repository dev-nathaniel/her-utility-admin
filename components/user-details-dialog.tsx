"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Phone, Building2, Calendar, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { User } from "./users-page"

interface UserDetailsDialogProps {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserDetailsDialog({ user, open, onOpenChange }: UserDetailsDialogProps) {
  const { data: userDetails, isLoading } = useQuery({
    queryKey: ["user", user?._id],
    queryFn: () => {
      if (!user?._id) return null
      return apiClient.getUser(user._id)
    },
    enabled: !!user?._id && open,
  })

  console.log(userDetails, "user details")
  console.log(user, "user-details-dialog")

  if (!user) return null

  const displayUser = userDetails?.user || user

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                <DialogDescription className="mt-1">
                  {displayUser.role || "User"}
                  {/* {displayUser.company ? ` at ${displayUser.company}` : ""} */}
                </DialogDescription>
              </div>
            </div>
            <Badge variant={(displayUser.status || "Active") === "Active" ? "default" : "secondary"}>
              {displayUser.status || "Active"}
            </Badge>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
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
                {/* <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="font-medium">{displayUser.company || "N/A"}</p>
                  </div>
                </div> */}
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Joined</p>
                    <p className="font-medium">{new Date(displayUser.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Businesses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{displayUser.businesses?.length || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Sites</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{displayUser.sites?.length || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Contracts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{displayUser.contracts?.length || 0}</div>
                </CardContent>
              </Card>
            </div>

            {/* Businesses, Sites, and Contracts */}
            <Tabs defaultValue="businesses">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="businesses">Businesses</TabsTrigger>
                <TabsTrigger value="sites">Sites</TabsTrigger>
                <TabsTrigger value="contracts">Contracts</TabsTrigger>
              </TabsList>
              <TabsContent value="businesses" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Businesses associated with this user will appear here
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="sites" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Sites associated with this user's businesses will appear here
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="contracts" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Contracts associated with this user's sites will appear here
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button>Edit User</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
