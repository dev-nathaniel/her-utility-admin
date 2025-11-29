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

interface CancelEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: {
    id: number
    subject: string
    recipientCount: number
  } | null
}

export function CancelEmailDialog({ open, onOpenChange, email }: CancelEmailDialogProps) {
  const queryClient = useQueryClient()

  const cancelEmailMutation = useMutation({
    mutationFn: () => apiClient.cancelScheduledEmail(email!.id),
    onSuccess: () => {
      toast({ title: "Scheduled email cancelled successfully!" })
      queryClient.invalidateQueries({ queryKey: ["scheduled-emails"] })
      onOpenChange(false)
    },
    onError: () => {
      toast({ title: "Failed to cancel email", variant: "destructive" })
    },
  })

  const handleCancel = () => {
    cancelEmailMutation.mutate()
  }

  if (!email) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cancel Scheduled Email
          </DialogTitle>
          <DialogDescription>Are you sure you want to cancel this scheduled email?</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border p-4 space-y-2">
            <p className="font-semibold">{email.subject}</p>
            <p className="text-sm text-muted-foreground">
              This email was scheduled to be sent to {email.recipientCount} recipients.
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            This action cannot be undone. The email will not be sent to any recipients.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep Scheduled
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={cancelEmailMutation.isPending}>
            {cancelEmailMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cancel Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
