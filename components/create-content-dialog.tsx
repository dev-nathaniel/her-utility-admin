"use client"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface CreateContentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateContentDialog({ open, onOpenChange }: CreateContentDialogProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle content creation
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Content</DialogTitle>
          <DialogDescription>Add a new article, news post, or page to your site</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="content-type">Content Type</Label>
              <Select defaultValue="news">
                <SelectTrigger id="content-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="news">News Article</SelectItem>
                  <SelectItem value="page">Page</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="blog">Blog Post</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="Enter content title..." />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input id="slug" placeholder="content-url-slug" />
              <p className="text-xs text-muted-foreground">
                This will be the URL path for your content
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="news">News</SelectItem>
                  <SelectItem value="market-updates">Market Updates</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="announcements">Announcements</SelectItem>
                  <SelectItem value="tips">Tips & Advice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                placeholder="Brief summary of the content..."
                className="min-h-20"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Write your content here..."
                className="min-h-64 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Supports Markdown formatting</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="featured-image">Featured Image URL</Label>
              <Input id="featured-image" type="url" placeholder="https://example.com/image.jpg" />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Publish Immediately</Label>
                <p className="text-sm text-muted-foreground">
                  Make this content visible to users right away
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Featured Content</Label>
                <p className="text-sm text-muted-foreground">Display this in featured sections</p>
              </div>
              <Switch />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" variant="outline">
              Save as Draft
            </Button>
            <Button type="submit">Publish</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
