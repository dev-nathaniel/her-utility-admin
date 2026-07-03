export function exportToCsv<T extends Record<string, unknown>>(data: T[], filename: string, columns: { key: string; label: string }[]) {
  const header = columns.map((c) => c.label).join(",")
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key]
        if (val === null || val === undefined) return ""
        const str = String(val)
        return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str
      })
      .join(","),
  )
  const csv = [header, ...rows].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function exportToJson<T>(data: T[], filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${filename}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export type SortDirection = "asc" | "desc"

export interface SortState {
  key: string
  direction: SortDirection
}

export function sortData<T>(data: T[], sort: SortState | null): T[] {
  if (!sort) return data
  return [...data].sort((a, b) => {
    const aVal = (a as Record<string, unknown>)[sort.key]
    const bVal = (b as Record<string, unknown>)[sort.key]
    if (aVal == null) return 1
    if (bVal == null) return -1
    const cmp = typeof aVal === "string" ? aVal.localeCompare(String(bVal)) : Number(aVal) - Number(bVal)
    return sort.direction === "asc" ? cmp : -cmp
  })
}

export function paginateData<T>(data: T[], page: number, pageSize: number): { paginated: T[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  return {
    paginated: data.slice(start, start + pageSize),
    totalPages,
  }
}
