"use client"

import type React from "react"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiClient, type UserData } from "@/lib/api-client"
import { toast } from "sonner"
import { Loader2, Building2, MapPin, UserPlus, Users } from "lucide-react"

interface AddBusinessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddBusinessDialog({ open, onOpenChange }: AddBusinessDialogProps) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<"new_customer" | "existing_customer">("new_customer")

  // Customer fields
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")

  // Business fields
  const [companyName, setCompanyName] = useState("")
  const [businessType, setBusinessType] = useState("limited_company")
  const [companyNumber, setCompanyNumber] = useState("")
  const [tradingName, setTradingName] = useState("")

  // Site fields
  const [siteName, setSiteName] = useState("")
  const [siteAddress, setSiteAddress] = useState("")
  const [sitePostcode, setSitePostcode] = useState("")

  const { data: users = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const response = await apiClient.getUsers()
      const raw = response as unknown as { users: UserData[] } | UserData[]
      return Array.isArray(raw) ? raw : (raw as any)?.users || []
    },
    enabled: open,
  })

  const resetForm = () => {
    setEmail("")
    setFullName("")
    setSelectedUserId("")
    setCompanyName("")
    setBusinessType("limited_company")
    setCompanyNumber("")
    setTradingName("")
    setSiteName("")
    setSiteAddress("")
    setSitePostcode("")
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (mode === "new_customer") {
        return await apiClient.createCompanyCustomer({
          company_name: companyName.trim(),
          email: email.trim(),
          full_name: fullName.trim() || undefined,
          business_type: businessType,
          company_number: companyNumber.trim() || undefined,
          trading_name: tradingName.trim() || undefined,
          initial_site_name: siteName.trim() || undefined,
          initial_site_address: siteAddress.trim() || undefined,
          initial_site_postcode: sitePostcode.trim() || undefined,
        })
      } else {
        if (!selectedUserId) {
          throw new Error("Please select an existing customer account")
        }
        const bizRes = await apiClient.addCompanyBusiness(selectedUserId, {
          company_name: companyName.trim(),
          business_type: businessType,
          company_number: companyNumber.trim() || undefined,
          trading_name: tradingName.trim() || undefined,
          postcode: sitePostcode.trim() || undefined,
        })
        if (siteAddress.trim() && sitePostcode.trim()) {
          await apiClient.addCompanyProperty(selectedUserId, {
            property_name: siteName.trim() || undefined,
            address: siteAddress.trim(),
            postcode: sitePostcode.trim(),
            business_id: bizRes?.id || bizRes?.business?.id,
          })
        }
        return bizRes
      }
    },
    onSuccess: () => {
      toast.success("Customer business and site created successfully!")
      queryClient.invalidateQueries({ queryKey: ["companies"] })
      queryClient.invalidateQueries({ queryKey: ["recent-customers"] })
      queryClient.invalidateQueries({ queryKey: ["users-list"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      resetForm()
      onOpenChange(false)
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create business"
      toast.error(message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyName.trim()) {
      toast.error("Company name is required")
      return
    }
    if (mode === "new_customer" && !email.trim()) {
      toast.error("Customer email address is required")
      return
    }
    if (mode === "existing_customer" && !selectedUserId) {
      toast.error("Please select a customer account")
      return
    }
    createMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="h-5 w-5 text-primary" />
            <span>Add Business &amp; Site for Customer</span>
          </DialogTitle>
          <DialogDescription>
            Onboard a new client or attach an additional business entity and physical site to an existing account.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-2 shrink-0">
          <Tabs
            value={mode}
            onValueChange={(val) => setMode(val as any)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new_customer" className="gap-2 text-xs">
                <UserPlus className="h-3.5 w-3.5" />
                <span>New Customer Account</span>
              </TabsTrigger>
              <TabsTrigger value="existing_customer" className="gap-2 text-xs">
                <Users className="h-3.5 w-3.5" />
                <span>Existing Customer</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2">
          <form id="add-business-form" onSubmit={handleSubmit} className="space-y-5 pb-6">
            {/* Customer Details */}
            <div className="rounded-lg border p-3.5 space-y-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  1. Customer Account
                </h4>
              </div>

              {mode === "new_customer" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-email">
                      Email Address <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="cust-email"
                      type="email"
                      placeholder="client@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-name">Contact Full Name</Label>
                    <Input
                      id="cust-name"
                      placeholder="e.g. John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="existing-user">
                    Select Customer <span className="text-destructive">*</span>
                  </Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger id="existing-user">
                      <SelectValue placeholder="Select an existing customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map((user: any) => (
                        <SelectItem key={user._id || user.id} value={user._id || user.id}>
                          {user.fullname || user.full_name || user.email} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Business Details */}
            <div className="rounded-lg border p-3.5 space-y-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  2. Business Entity Details
                </h4>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="company-name">
                    Company / Business Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="company-name"
                    placeholder="e.g. Acme Logistics Ltd"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="business-type">Business Type</Label>
                  <Select value={businessType} onValueChange={setBusinessType}>
                    <SelectTrigger id="business-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="limited_company">Limited Company (LTD)</SelectItem>
                      <SelectItem value="sole_trader">Sole Trader</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                      <SelectItem value="llp">Limited Liability Partnership (LLP)</SelectItem>
                      <SelectItem value="charity">Charity / Not-for-Profit</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="company-reg">Company Reg No. (Optional)</Label>
                  <Input
                    id="company-reg"
                    placeholder="e.g. 12345678"
                    value={companyNumber}
                    onChange={(e) => setCompanyNumber(e.target.value)}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="trading-name">Trading Name (if different)</Label>
                  <Input
                    id="trading-name"
                    placeholder="e.g. Acme Express"
                    value={tradingName}
                    onChange={(e) => setTradingName(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Site / Property Details */}
            <div className="rounded-lg border p-3.5 space-y-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  3. Primary Site / Location (Optional)
                </h4>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="site-name">Site / Property Name</Label>
                  <Input
                    id="site-name"
                    placeholder="e.g. Head Office, Warehouse 1, High St Branch"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="site-address">Supply Address</Label>
                  <Input
                    id="site-address"
                    placeholder="e.g. 123 High Street, London"
                    value={siteAddress}
                    onChange={(e) => setSiteAddress(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="site-postcode">Postcode</Label>
                  <Input
                    id="site-postcode"
                    placeholder="e.g. EC1A 1BB"
                    value={sitePostcode}
                    onChange={(e) => setSitePostcode(e.target.value.toUpperCase())}
                    className="font-mono uppercase"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        <DialogFooter className="p-6 pt-3 border-t bg-background shrink-0 mt-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-business-form"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "new_customer" ? "Create Customer & Business" : "Add Business to Customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
