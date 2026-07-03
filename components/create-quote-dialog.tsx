"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import { Loader2 } from "lucide-react"

interface CreateQuoteDialogProps {
  utilityId?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateQuoteDialog({ utilityId, open, onOpenChange }: CreateQuoteDialogProps) {
  const [amount, setAmount] = useState("")
  const [notes, setNotes] = useState("")
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch Utility Info to pre-fill and link
  const { data: utilityResponse, isLoading: isLoadingUtility } = useQuery({
    queryKey: ["utility", utilityId],
    queryFn: () => (utilityId ? apiClient.getContract(utilityId) : null),
    enabled: !!utilityId,
  })
  const utility = (utilityResponse as any)?.data

  // Create Quote Mutation
  const createQuoteMutation = useMutation({
    mutationFn: async () => {
      if (!utility) throw new Error("No utility selected")
      
      // Find the business owner (requester)
      const requesterId = utility.business?.members?.[0]?.userId || utility.business?.createdBy;

      const payload = {
        business: utility.business?._id,
        site: utility.site?._id,
        requester: requesterId,
        utilityType: utility.type,
        questionnaire: {
          utilityId: utility._id,
          currentSupplier: utility.supplier,
          contractEnd: utility.contractEnd,
        },
        suggestedPrice: parseFloat(amount),
        notes: notes,
        status: "sent", // Admin created quotes are sent immediately
        type: "renewal", // Default to renewal for existing utility
        createdBy: utility.business?.members?.[0]?.userId, // TODO: Should be current admin user ID, but server might override or we use admin ID
      }

      console.log("Creating quote with payload:", payload)
      return apiClient.createQuote(payload)
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Quote created and sent successfully" })
      queryClient.invalidateQueries({ queryKey: ["quotes"] })
      onOpenChange(false)
      setAmount("")
      setNotes("")
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.response?.data?.error || "Failed to create quote", 
        variant: "destructive" 
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createQuoteMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Quote</DialogTitle>
          <DialogDescription>
            Generate a quote for <strong>{utility?.business?.name || "Business"}</strong> regarding their{" "}
            <strong>{utility?.type || "Utility"}</strong> contract.
          </DialogDescription>
        </DialogHeader>

        {isLoadingUtility ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Suggested Annual Price (£)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes to Customer</Label>
              <Textarea
                id="notes"
                placeholder="Enter details about this quote..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createQuoteMutation.isPending || !utility}>
                {createQuoteMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create & Send Quote
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
