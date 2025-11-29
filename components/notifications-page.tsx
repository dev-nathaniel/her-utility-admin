"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bell, Check, CheckCheck, Trash2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

export function NotificationsPage() {
  const [activeTab, setActiveTab] = useState("all")
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await apiClient.get("/notifications")
      return response.data
    },
  })

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.patch(`/notifications/${id}/read`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post("/notifications/mark-all-read")
      return response.data
    },
    onSuccess: () => {
      toast({ title: "Success", description: "All notifications marked as read" })
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.delete(`/notifications/${id}`)
      return response.data
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Notification deleted" })
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const unreadCount = notifications.filter((n: any) => n.unread).length

  const filteredNotifications =
    activeTab === "all"
      ? notifications
      : activeTab === "unread"
        ? notifications.filter((n: any) => n.unread)
        : notifications.filter((n: any) => n.type === activeTab)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">Stay updated with your latest activities and alerts</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              {markAllAsReadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Notifications</CardTitle>
              <CardDescription>
                {unreadCount > 0
                  ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                  : "You are all caught up"}
              </CardDescription>
            </div>
            {unreadCount > 0 && <Badge className="bg-accent text-accent-foreground">{unreadCount} unread</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
              <TabsTrigger value="quote">Quotes</TabsTrigger>
              <TabsTrigger value="support">Support</TabsTrigger>
              <TabsTrigger value="contract">Contracts</TabsTrigger>
              <TabsTrigger value="customer">Customers</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-6">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No notifications</h3>
                  <p className="text-sm text-muted-foreground">
                    {activeTab === "unread" ? "You're all caught up!" : "No notifications in this category"}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map((notification: any) => {
                    const Icon = notification.icon
                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          "flex items-start gap-4 py-4 hover:bg-muted/50 px-4 -mx-4 rounded-lg transition-colors",
                          notification.unread && "bg-muted/30",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full",
                            notification.unread ? "bg-accent/20" : "bg-muted",
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-5 w-5",
                              notification.unread ? "text-accent-foreground" : "text-muted-foreground",
                            )}
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{notification.title}</p>
                                {notification.unread && <span className="h-2 w-2 rounded-full bg-accent" />}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                              <p className="text-xs text-muted-foreground mt-2">{notification.time}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {notification.unread && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => markAsReadMutation.mutate(notification.id)}
                                  className="h-8 w-8"
                                  disabled={markAsReadMutation.isPending}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteNotificationMutation.mutate(notification.id)}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                disabled={deleteNotificationMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
