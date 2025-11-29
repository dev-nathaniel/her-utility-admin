"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

interface SearchContextType {
  searchQuery: string
  setSearchQuery: (query: string) => void
  performSearch: (query: string) => void
  isSearching: boolean
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const router = useRouter()

  const performSearch = useCallback(
    (query: string) => {
      if (!query.trim()) return

      setIsSearching(true)
      setSearchQuery(query)

      // Determine which page to navigate to based on the query
      // You can customize this logic based on your needs
      const lowerQuery = query.toLowerCase()

      if (lowerQuery.includes("business") || lowerQuery.includes("company")) {
        router.push(`/dashboard/businesses?search=${encodeURIComponent(query)}`)
      } else if (lowerQuery.includes("user")) {
        router.push(`/dashboard/users?search=${encodeURIComponent(query)}`)
      } else if (lowerQuery.includes("quote")) {
        router.push(`/dashboard/quotes?search=${encodeURIComponent(query)}`)
      } else if (lowerQuery.includes("ticket") || lowerQuery.includes("support")) {
        router.push(`/dashboard/support?search=${encodeURIComponent(query)}`)
      } else if (lowerQuery.includes("contract")) {
        router.push(`/dashboard/contracts?search=${encodeURIComponent(query)}`)
      } else {
        // Default to businesses page for general searches
        router.push(`/dashboard/businesses?search=${encodeURIComponent(query)}`)
      }

      setTimeout(() => setIsSearching(false), 500)
    },
    [router],
  )

  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery, performSearch, isSearching }}>
      {children}
    </SearchContext.Provider>
  )
}

export function useSearch() {
  const context = useContext(SearchContext)
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider")
  }
  return context
}
