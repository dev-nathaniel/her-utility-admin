"use client"

import { useState, useRef } from "react"
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
import { Upload, ImageIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface CreateContentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateContentDialog({ open, onOpenChange }: CreateContentDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [featuredImage, setFeaturedImage] = useState<string | null>(null)
  const [featuredImageFile, setFeaturedImageFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Maximum size is 5MB.")
      return
    }
    setFeaturedImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setFeaturedImage(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setFeaturedImage(null)
    setFeaturedImageFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle content creation with file upload
    const formData = new FormData(e.target as HTMLFormElement)
    console.log("Content data:", Object.fromEntries(formData))
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
              <Input id="title" name="title" placeholder="Enter content title..." />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input id="slug" name="slug" placeholder="content-url-slug" />
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
                name="excerpt"
                placeholder="Brief summary of the content..."
                className="min-h-20"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                name="content"
                placeholder="Write your content here..."
                className="min-h-64 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Supports Markdown formatting</p>
            </div>

            <div className="grid gap-2">
              <Label>Featured Image</Label>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="featured-image-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? "Uploading..." : "Upload Image"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports JPG, PNG, WEBP. Max 5MB.
                  </p>
                </div>
                {featuredImage && (
                  <div className="relative shrink-0">
                    <img
                      src={featuredImage}
                      alt="Preview"
                      className={cn(
                        "h-24 w-24 rounded-lg border object-cover",
                      )}
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {!featuredImage && (
                  <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <Input
                id="featured-image-url"
                name="featuredImageUrl"
                type="url"
                placeholder="Or paste image URL..."
                className="mt-2"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Publish Immediately</Label>
                <p className="text-sm text-muted-foreground">
                  Make this content visible to users right away
                </p>
              </div>
              <Switch defaultChecked name="publishImmediately" />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Featured Content</Label>
                <p className="text-sm text-muted-foreground">Display this in featured sections</p>
              </div>
              <Switch name="featured" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" variant="outline">
              Save as Draft
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? "Uploading..." : "Publish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
