"use client"

import type React from "react"
import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface AddUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddUserDialog({ open, onOpenChange }: AddUserDialogProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    phone: "",
    company: "",
    role: "",
    status: "active",
  })

  const createUserMutation = useMutation({
    mutationFn: apiClient.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success("User created successfully!")
      onOpenChange(false)
      setFormData({
        fullname: "",
        email: "",
        phone: "",
        company: "",
        role: "",
        status: "active",
      })
    },
    onError: () => {
      toast.error("Failed to create user. Please try again.")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createUserMutation.mutate(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>Create a new user account</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
          <form onSubmit={handleSubmit} id="add-user-form">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="fullname">Full Name</Label>
                <Input
                  id="fullname"
                  value={formData.fullname}
                  onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
                  placeholder="John Smith"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john.smith@company.com"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Acme Corporation"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="Account Manager"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Initial Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>
        </ScrollArea>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createUserMutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form="add-user-form" disabled={createUserMutation.isPending}>
            {createUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
