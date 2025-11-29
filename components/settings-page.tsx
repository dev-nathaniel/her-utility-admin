"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Save } from 'lucide-react'
import { useState } from "react"

export function SettingsPage() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    desktopNotifications: false,
    newQuotes: true,
    supportTickets: true,
    customerUpdates: false,
    language: "en",
    timezone: "UTC",
    dateFormat: "MM/DD/YYYY",
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your application preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications" className="text-base">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive notifications via email</p>
            </div>
            <Switch
              id="email-notifications"
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="desktop-notifications" className="text-base">Desktop Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive browser push notifications</p>
            </div>
            <Switch
              id="desktop-notifications"
              checked={settings.desktopNotifications}
              onCheckedChange={(checked) => setSettings({ ...settings, desktopNotifications: checked })}
            />
          </div>
          <Separator />
          <div className="space-y-4">
            <Label className="text-base">Notify me about</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="new-quotes" className="font-normal">New quote enquiries</Label>
                <Switch
                  id="new-quotes"
                  checked={settings.newQuotes}
                  onCheckedChange={(checked) => setSettings({ ...settings, newQuotes: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="support-tickets" className="font-normal">New support tickets</Label>
                <Switch
                  id="support-tickets"
                  checked={settings.supportTickets}
                  onCheckedChange={(checked) => setSettings({ ...settings, supportTickets: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="customer-updates" className="font-normal">Customer updates</Label>
                <Switch
                  id="customer-updates"
                  checked={settings.customerUpdates}
                  onCheckedChange={(checked) => setSettings({ ...settings, customerUpdates: checked })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Customize your dashboard experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select value={settings.language} onValueChange={(value) => setSettings({ ...settings, language: value })}>
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={settings.timezone} onValueChange={(value) => setSettings({ ...settings, timezone: value })}>
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                <SelectItem value="EST">Eastern Time (GMT-5)</SelectItem>
                <SelectItem value="CST">Central Time (GMT-6)</SelectItem>
                <SelectItem value="PST">Pacific Time (GMT-8)</SelectItem>
                <SelectItem value="GMT">London (GMT+0)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label>Date Format</Label>
            <RadioGroup
              value={settings.dateFormat}
              onValueChange={(value) => setSettings({ ...settings, dateFormat: value })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="MM/DD/YYYY" id="us" />
                <Label htmlFor="us" className="font-normal">MM/DD/YYYY (US)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="DD/MM/YYYY" id="uk" />
                <Label htmlFor="uk" className="font-normal">DD/MM/YYYY (UK)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="YYYY-MM-DD" id="iso" />
                <Label htmlFor="iso" className="font-normal">YYYY-MM-DD (ISO)</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Save Settings
        </Button>
      </div>
    </div>
  )
}
