import { Suspense } from "react"
import { ContractsPage } from "@/components/contracts-page"

export default function Page() {
  return (
    <Suspense fallback={<div className="flex h-96 items-center justify-center text-sm text-muted-foreground"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />Loading contracts...</div>}>
      <ContractsPage />
    </Suspense>
  )
}
