// import { EmailsPage } from "@/components/emails-page"

/*
 * NOTE: Email Management has been commented out per the Price Buddy architecture review.
 * The backend does not maintain an email campaign/newsletter marketing service (Resend is configured
 * strictly for transactional system notifications like password reset and device confirmation).
 * Customer communications are handled directly via the Concierge Support chat.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail, MessagesSquare, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function Page() {
  // return <EmailsPage />

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-12">
      <Card className="text-center p-6 border-dashed">
        <CardHeader>
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-2 text-muted-foreground">
            <Mail className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Email Marketing Management (Commented Out)</CardTitle>
          <CardDescription className="max-w-md mx-auto mt-2 text-xs">
            This module is commented out because the Price Buddy backend uses direct transactional sweeps
            and real-time Concierge Messaging rather than bulk newsletter marketing campaigns.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <Button asChild className="gap-2">
            <Link href="/dashboard/support">
              <MessagesSquare className="h-4 w-4" />
              <span>Go to Concierge Support Chat</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
