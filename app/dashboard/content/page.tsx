// import { ContentPage } from "@/components/content-page"

/*
 * NOTE: Content Management has been commented out per the Price Buddy architecture review.
 * The backend does not maintain a CMS for blog articles/FAQs/guides; content is managed directly
 * via marketing websites or partners pages.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Newspaper, ArrowRight, LayoutDashboard } from "lucide-react"
import Link from "next/link"

export default function Page() {
  // return <ContentPage />

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-12">
      <Card className="text-center p-6 border-dashed">
        <CardHeader>
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-2 text-muted-foreground">
            <Newspaper className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Content Management (Commented Out)</CardTitle>
          <CardDescription className="max-w-md mx-auto mt-2 text-xs">
            This module is commented out because articles and news are static in the current Price Buddy
            architecture. Client management is concentrated in Companies, Contracts, and Scans.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4" />
              <span>Back to Overview</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
