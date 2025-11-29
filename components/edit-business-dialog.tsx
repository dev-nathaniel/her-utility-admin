"use client"

import type React from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { toast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface EditBusinessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  business: any
}

export function EditBusinessDialog({ open, onOpenChange, business }: EditBusinessDialogProps) {
  const queryClient = useQueryClient()

  const updateBusinessMutation = useMutation({
    mutationFn: (data: any) => apiClient.updateBusiness({ id: business.id, data }),
    onSuccess: () => {
      toast({ title: "Business updated successfully!" })
      queryClient.invalidateQueries({ queryKey: ["businesses"] })
      queryClient.invalidateQueries({ queryKey: ["business", business.id] })
      onOpenChange(false)
    },
    onError: () => {
      toast({ title: "Failed to update business", variant: "destructive" })
    },
  })

  if (!business) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    updateBusinessMutation.mutate(Object.fromEntries(formData))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Business</DialogTitle>
          <DialogDescription>Update business information</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-company-name">Company Name</Label>
                <Input id="edit-company-name" defaultValue={business.name} placeholder="Acme Corporation" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="edit-email">Email Address</Label>
                  <Input id="edit-email" type="email" defaultValue={business.email} placeholder="contact@company.com" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-phone">Phone Number</Label>
                  <Input id="edit-phone" type="tel" defaultValue={business.phone} placeholder="+1 (555) 123-4567" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-address">Business Address</Label>
                <Input id="edit-address" defaultValue={business.address} placeholder="123 Main St, City, State, ZIP" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="edit-industry">Industry</Label>
                  <Select>
                    <SelectTrigger id="edit-industry">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="hospitality">Hospitality</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select defaultValue={business.status?.toLowerCase() || "pending"}>
                    <SelectTrigger id="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-notes">Additional Notes</Label>
                <Textarea
                  id="edit-notes"
                  defaultValue={business.notes}
                  placeholder="Add any relevant information about this business..."
                  className="min-h-24"
                />
              </div>
            </div>
          </form>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateBusinessMutation.isPending}>
            {updateBusinessMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
