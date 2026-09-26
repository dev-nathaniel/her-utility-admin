// import { AdminsPage } from "@/components/admins-page"

/*
 * NOTE: Admin Approval Queue has been commented out per the Price Buddy architecture review.
 * The backend does not maintain a pending admin signup/approval queue (`/admins/pending`).
 * Instead, administrator and broker privileges are granted or revoked directly from the Users page
 * via `PUT /api/admin/users/{user_id}/admin`.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, ShieldCheck, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function Page() {
  // return <AdminsPage />

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-12">
      <Card className="text-center p-6 border-dashed">
        <CardHeader>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Admins Queue (Commented Out)</CardTitle>
          <CardDescription className="max-w-md mx-auto mt-2 text-xs">
            Admin access is managed directly from the Users directory. You can promote any existing user
            to a Broker Admin with a single click.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <Button asChild className="gap-2">
            <Link href="/dashboard/users">
              <Users className="h-4 w-4" />
              <span>Go to Users &amp; Permissions</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
