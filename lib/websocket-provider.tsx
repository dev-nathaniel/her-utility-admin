"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { io, type Socket } from "socket.io-client"

interface WebSocketContextType {
  socket: Socket | null
  isConnected: boolean
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
})

export function useWebSocket() {
  return useContext(WebSocketContext)
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  useEffect(() => {
    // Initialize socket connection
    // Replace with your actual WebSocket server URL
    const socketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:3001"
    const socketInstance = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socketInstance.on("connect", () => {
      console.log("[v0] WebSocket connected")
      setIsConnected(true)
    })

    socketInstance.on("disconnect", () => {
      console.log("[v0] WebSocket disconnected")
      setIsConnected(false)
    })

    // Listen for notification events
    socketInstance.on("notification", (data: any) => {
      console.log("[v0] WebSocket notification received:", data)

      toast({
        title: data.title,
        description: data.message,
        action: data.action ? (
          <ToastAction
            altText={data.action.label}
            onClick={() => {
              if (data.action.url) {
                window.location.href = data.action.url
              }
            }}
          >
            {data.action.label}
          </ToastAction>
        ) : undefined,
      })

      // Invalidate relevant queries based on notification type
      if (data.type === "quote") {
        queryClient.invalidateQueries({ queryKey: ["quotes"] })
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      } else if (data.type === "support") {
        queryClient.invalidateQueries({ queryKey: ["tickets"] })
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      } else if (data.type === "contract") {
        queryClient.invalidateQueries({ queryKey: ["contracts"] })
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      } else if (data.type === "business" || data.type === "customer") {
        queryClient.invalidateQueries({ queryKey: ["businesses"] })
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      } else if (data.type === "user") {
        queryClient.invalidateQueries({ queryKey: ["users"] })
      } else if (data.type === "email") {
        queryClient.invalidateQueries({ queryKey: ["emails"] })
      } else if (data.type === "admin") {
        queryClient.invalidateQueries({ queryKey: ["admins"] })
        queryClient.invalidateQueries({ queryKey: ["pending-admins"] })
      }

      // Always invalidate notifications
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    })

    // Listen for data update events
    socketInstance.on("data-updated", (data: any) => {
      console.log("[v0] Data updated:", data)

      // Invalidate specific queries
      if (data.entity) {
        queryClient.invalidateQueries({ queryKey: [data.entity] })
      }
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [queryClient, toast])

  return <WebSocketContext.Provider value={{ socket, isConnected }}>{children}</WebSocketContext.Provider>
}
