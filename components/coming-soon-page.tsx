import { Card, CardContent } from "@/components/ui/card"
import { Rocket } from 'lucide-react'

export function ComingSoonPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col items-center gap-6 py-16">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Rocket className="h-10 w-10 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Coming Soon</h1>
            <p className="mt-2 text-muted-foreground">
              This feature is currently under development and will be available soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
