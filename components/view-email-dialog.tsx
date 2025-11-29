"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Mail, Users, Calendar, CheckCircle2, Loader2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

interface ViewEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: {
    id: number
    subject: string
    recipients: string
    recipientCount: number
    sentDate: string
    status: string
    openRate: string
    body?: string
  } | null
}

export function ViewEmailDialog({ open, onOpenChange, email }: ViewEmailDialogProps) {
  const { data: emailDetails, isLoading } = useQuery({
    queryKey: ["email", email?.id],
    queryFn: () => apiClient.getEmail(email!.id),
    enabled: !!email && open,
    placeholderData: email,
  })

  if (!email) return null

  const displayEmail = emailDetails || email

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {displayEmail.subject}
          </DialogTitle>
          <DialogDescription>Sent email details and content</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Email Meta Info */}
            <div className="grid gap-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Recipients:</span>
                  <span className="text-muted-foreground">{displayEmail.recipients}</span>
                  <Badge variant="secondary">{displayEmail.recipientCount} recipients</Badge>
                </div>
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {displayEmail.status}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Sent:</span>
                  <span className="text-muted-foreground">{new Date(displayEmail.sentDate).toLocaleString()}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Open Rate:</span>
                  <span className="ml-2 font-semibold text-green-600">{displayEmail.openRate}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Email Content */}
            <div className="space-y-4">
              <h3 className="font-semibold">Email Content</h3>
              <div className="rounded-lg border bg-muted/50 p-6 space-y-4 text-sm">
                <p>Dear Customer,</p>
                <p>
                  {displayEmail.body ||
                    `This is the content of the email "${displayEmail.subject}". The email was successfully 
                    delivered to ${displayEmail.recipientCount} recipients with an impressive open rate of ${displayEmail.openRate}.`}
                </p>
                {displayEmail.id === 1 && (
                  <>
                    <p>
                      We're excited to announce several new services now available to all our customers. These services
                      have been designed based on your feedback to better serve your needs.
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>24/7 Customer Support Portal</li>
                      <li>Advanced Energy Analytics Dashboard</li>
                      <li>Automated Contract Management</li>
                      <li>Multi-site Management Tools</li>
                    </ul>
                    <p>
                      To learn more about these services and how they can benefit your business, please visit your
                      customer portal or contact your account manager.
                    </p>
                  </>
                )}
                <p>
                  Best regards,
                  <br />
                  The Team
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
