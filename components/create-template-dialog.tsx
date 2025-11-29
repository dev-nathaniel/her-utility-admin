"use client"

import type React from "react"

import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { toast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface CreateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateTemplateDialog({ open, onOpenChange }: CreateTemplateDialogProps) {
  const queryClient = useQueryClient()
  const [templateName, setTemplateName] = useState("")
  const [category, setCategory] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")

  const createTemplateMutation = useMutation({
    mutationFn: (data: any) => apiClient.createTemplate(data),
    onSuccess: () => {
      toast({ title: "Template created successfully!" })
      queryClient.invalidateQueries({ queryKey: ["email-templates"] })
      onOpenChange(false)
      // Reset form
      setTemplateName("")
      setCategory("")
      setSubject("")
      setBody("")
    },
    onError: () => {
      toast({ title: "Failed to create template", variant: "destructive" })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createTemplateMutation.mutate({
      name: templateName,
      category,
      subject,
      body,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Email Template</DialogTitle>
          <DialogDescription>Create a reusable email template with variables</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Welcome Email"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                    <SelectItem value="reminders">Reminders</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Welcome to {{company_name}}"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="body">Email Body</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your template here..."
                className="min-h-64"
                required
              />
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-xs font-medium mb-2">Available Variables:</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <code className="bg-background px-2 py-1 rounded">{"{{customer_name}}"}</code>
                  <code className="bg-background px-2 py-1 rounded">{"{{company_name}}"}</code>
                  <code className="bg-background px-2 py-1 rounded">{"{{email}}"}</code>
                  <code className="bg-background px-2 py-1 rounded">{"{{contract_count}}"}</code>
                  <code className="bg-background px-2 py-1 rounded">{"{{total_value}}"}</code>
                  <code className="bg-background px-2 py-1 rounded">{"{{renewal_date}}"}</code>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTemplateMutation.isPending}>
              {createTemplateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
