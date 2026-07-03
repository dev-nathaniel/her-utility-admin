"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Save, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient, axiosInstance } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"

export function ProfilePage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { user } = useAuth()
  
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "", 
    role: "",
    bio: "",
  })

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  useEffect(() => {
    if (user) {
        // Split fullname if needed or just use as is. Assuming user has fullname separate
        const names = user.fullname ? user.fullname.split(' ') : ["", ""]
        setProfile({
            firstName: names[0] || "",
            lastName: names.slice(1).join(' ') || "",
            email: user.email || "",
            phone: "", // Phone not currently on user object, need to add to schema or fetch separately
            role: user.role || "",
            bio: "", // Bio not on user object
        })
    }
  }, [user])

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.updateProfile({
        fullname: `${data.firstName} ${data.lastName}`,
        email: data.email,
        // phone: data.phone,
        // bio: data.bio
      })
      return response
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Profile updated successfully" })
      queryClient.invalidateQueries({ queryKey: ["profile"] })
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" })
    },
  })

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await axiosInstance.post("/profile/password", data)
      return response.data
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Password updated successfully" })
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update password", variant: "destructive" })
    },
  })



  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile Photo</CardTitle>
            <CardDescription>Update your profile picture</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-32 w-32">
                <AvatarImage src="/placeholder.svg?height=128&width=128" />
                <AvatarFallback className="text-2xl">AD</AvatarFallback>
              </Avatar>
              {/* <Button size="icon" className="absolute bottom-0 right-0 h-8 w-8 rounded-full" variant="secondary">
                <Camera className="h-4 w-4" />
              </Button> */}
            </div>
            <div className="text-center">
              <p className="font-medium">
                {user?.fullname || "User"}
              </p>
              <p className="text-sm text-muted-foreground">{user?.role || "Role"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={profile.lastName}
                  onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={profile.role} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={4}
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              />
            </div>
            <Button
              className="w-full sm:w-auto"
              onClick={() => updateProfileMutation.mutate(profile)}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage your password and security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={passwords.confirmPassword}
              onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
            />
          </div>
          <Button
            variant="secondary"
            disabled={updatePasswordMutation.isPending}
            onClick={() => {
              updatePasswordMutation.mutate({
                currentPassword: passwords.currentPassword,
                newPassword: passwords.newPassword,
              })
            }}
          >
            {updatePasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
