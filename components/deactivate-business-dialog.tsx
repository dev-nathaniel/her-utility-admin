"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { toast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface DeactivateBusinessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  business: any
}

export function DeactivateBusinessDialog({ open, onOpenChange, business }: DeactivateBusinessDialogProps) {
  const queryClient = useQueryClient()

  const deactivateBusinessMutation = useMutation({
    mutationFn: () => apiClient.deactivateBusiness(business.id),
    onSuccess: () => {
      toast({ title: "Business deactivated successfully" })
      queryClient.invalidateQueries({ queryKey: ["businesses"] })
      queryClient.invalidateQueries({ queryKey: ["business", business.id] })
      onOpenChange(false)
    },
    onError: () => {
      toast({ title: "Failed to deactivate business", variant: "destructive" })
    },
  })

  if (!business) return null

  const handleDeactivate = () => {
    deactivateBusinessMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Deactivate Business</DialogTitle>
              <DialogDescription>Are you sure you want to deactivate this business?</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm">
            You are about to deactivate <strong>{business.name}</strong>. This action will:
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>Prevent the business from accessing services</li>
            <li>Pause all active contracts</li>
            <li>Stop automated communications</li>
            <li>Require reactivation to restore access</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            This action can be reversed later from the business management section.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDeactivate} disabled={deactivateBusinessMutation.isPending}>
            {deactivateBusinessMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Deactivate Business
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
