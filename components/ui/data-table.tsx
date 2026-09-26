"use client"

import { useState, useMemo, type ReactNode } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, ArrowUp, ArrowDown, Download } from "lucide-react"
import { scrollableTable } from "@/lib/utils"
import { Pagination } from "./pagination"
import { SkeletonTable } from "./skeleton"
import { sortData, paginateData, exportToCsv, type SortState } from "@/lib/data-utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface DataTableColumn<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (item: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  isLoading?: boolean
  pageSize?: number
  exportable?: boolean
  exportFilename?: string
  onRowClick?: (item: T) => void
  emptyMessage?: string
  searchable?: boolean
  rowKey?: (item: T) => string
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  pageSize = 15,
  exportable = false,
  exportFilename = "export",
  onRowClick,
  emptyMessage = "No data found",
  searchable,
  rowKey,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(null)
  const [page, setPage] = useState(1)

  const sorted = useMemo(() => sortData(data, sort), [data, sort])
  const { paginated, totalPages } = useMemo(() => paginateData(sorted, page, pageSize), [sorted, page, pageSize])

  const handleSort = (key: string) => {
    setSort((prev) => {
      if (prev?.key === key) {
        return prev.direction === "asc" ? { key, direction: "desc" } : null
      }
      return { key, direction: "asc" }
    })
    setPage(1)
  }

  const getRowKey = (item: any, index: number): string => {
    if (typeof rowKey === "function") {
      try {
        return rowKey(item)
      } catch {
        // Fallback if rowKey throws
      }
    }
    return item?.id || item?._id || item?.key || String(index)
  }

  if (isLoading) {
    return <SkeletonTable rows={pageSize > 10 ? 5 : pageSize} />
  }

  return (
    <div>
      <div className={scrollableTable()}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={col.sortable ? "cursor-pointer select-none" : ""}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <>
                        {sort?.key === col.key ? (
                          sort.direction === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                        )}
                      </>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((item, index) => (
                <TableRow
                  key={getRowKey(item, index)}
                  className={onRowClick ? "cursor-pointer" : ""}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.render ? col.render(item) : String((item as any)[col.key] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between pt-4 px-4 pb-4">
        <div className="flex items-center gap-2">
          {exportable && data.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-3 w-3" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() =>
                    exportToCsv(
                      data as Record<string, unknown>[],
                      exportFilename,
                      columns.map((c) => ({ key: c.key, label: c.label })),
                    )
                  }
                >
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <p className="text-xs text-muted-foreground">{data.length} total records</p>
        </div>
        {data.length > 0 && (
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
        )}
      </div>
    </div>
  )
}
