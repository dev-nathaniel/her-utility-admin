"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, Send, Clock, CheckCircle2, Plus } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ComposeEmailDialog } from "./compose-email-dialog"
import { ViewEmailDialog } from "./view-email-dialog"
import { EditScheduledEmailDialog } from "./edit-scheduled-email-dialog"
import { CancelEmailDialog } from "./cancel-email-dialog"
import { CreateTemplateDialog } from "./create-template-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { Loader2 } from "lucide-react"

/*
// Mock data for development
const mockSentEmails = [...]
const mockScheduledEmails = [...]
const mockTemplates = [...]
*/

export function EmailsPage() {
  const [composeDialogOpen, setComposeDialogOpen] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null)
  const [viewEmail, setViewEmail] = useState<any | null>(null)
  const [editScheduledEmail, setEditScheduledEmail] = useState<any | null>(null)
  const [cancelEmail, setCancelEmail] = useState<any | null>(null)
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false)

  const { data: sentEmails = [], isLoading: sentLoading } = useQuery({
    queryKey: ["sent-emails"],
    queryFn: () => apiClient.getSentEmails(),
    // Uncomment mock data for development
    // placeholderData: mockSentEmails,
  })

  const { data: scheduledEmails = [], isLoading: scheduledLoading } = useQuery({
    queryKey: ["scheduled-emails"],
    queryFn: () => apiClient.getScheduledEmails(),
    // Uncomment mock data for development
    // placeholderData: mockScheduledEmails,
  })

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: () => apiClient.getEmailTemplates(),
    // Uncomment mock data for development
    // placeholderData: mockTemplates,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Management</h1>
          <p className="text-muted-foreground">Send emails to customers and manage campaigns</p>
        </div>
        <Button onClick={() => setComposeDialogOpen(true)}>
          <Send className="mr-2 h-4 w-4" />
          Compose Email
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3,245</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Average Open Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">74%</div>
            <p className="text-xs text-muted-foreground">+5% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Upcoming sends</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Ready to use</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="sent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sent">Sent Emails</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="sent">
          <Card>
            <CardHeader>
              <CardTitle>Sent Emails</CardTitle>
              <CardDescription>View all emails sent to customers</CardDescription>
            </CardHeader>
            <CardContent>
              {sentLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Sent Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Open Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sentEmails.map((email: any) => (
                      <TableRow
                        key={email.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setViewEmail(email)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{email.subject}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{email.recipients}</p>
                            <p className="text-xs text-muted-foreground">{email.recipientCount} recipients</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(email.sentDate).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {email.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-green-600">{email.openRate}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Emails</CardTitle>
              <CardDescription>Emails scheduled to be sent</CardDescription>
            </CardHeader>
            <CardContent>
              {scheduledLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Scheduled Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduledEmails.map((email: any) => (
                      <TableRow key={email.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{email.subject}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{email.recipients}</p>
                            <p className="text-xs text-muted-foreground">{email.recipientCount} recipients</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(email.scheduledDate).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{email.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setEditScheduledEmail(email)}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setCancelEmail(email)}
                          >
                            Cancel
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setCreateTemplateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </div>
          {templatesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {templates.map((template: any) => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge variant="outline">{template.category}</Badge>
                    </div>
                    <CardDescription>Last used {template.lastUsed}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-transparent"
                        onClick={() => setPreviewTemplate(template)}
                      >
                        Preview
                      </Button>
                      <Button size="sm" className="flex-1" onClick={() => setComposeDialogOpen(true)}>
                        Use Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ComposeEmailDialog open={composeDialogOpen} onOpenChange={setComposeDialogOpen} />
      <ViewEmailDialog open={!!viewEmail} onOpenChange={(open) => !open && setViewEmail(null)} email={viewEmail} />
      <EditScheduledEmailDialog
        open={!!editScheduledEmail}
        onOpenChange={(open) => !open && setEditScheduledEmail(null)}
        email={editScheduledEmail}
      />
      <CancelEmailDialog
        open={!!cancelEmail}
        onOpenChange={(open) => !open && setCancelEmail(null)}
        email={cancelEmail}
      />
      <CreateTemplateDialog open={createTemplateOpen} onOpenChange={setCreateTemplateOpen} />

      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
            <DialogDescription>Template preview</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-6">
              <h3 className="text-lg font-semibold">Subject: {previewTemplate?.name}</h3>
              <div className="mt-4 space-y-3 text-sm">
                <p>Dear {"{{customer_name}}"},</p>
                <p>
                  This is a preview of the <strong>{previewTemplate?.name}</strong> template. The actual content will
                  include personalized information based on customer data.
                </p>
                <p>
                  Variables like {"{{customer_name}}"}, {"{{company_name}}"}, and {"{{contract_details}}"}
                  will be automatically replaced with real data when sent.
                </p>
                <p>
                  Best regards,
                  <br />
                  Your Team
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setPreviewTemplate(null)
                setComposeDialogOpen(true)
              }}
            >
              Use Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
