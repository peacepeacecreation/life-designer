"use client"

import * as React from "react"
import { format } from "date-fns"
import { uk } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onSelect?: (date: Date | undefined) => void
  placeholder?: string
}

export function DatePicker({ date, onSelect, placeholder = "Оберіть дату" }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "nodrag w-full justify-start text-left font-normal text-sm h-9",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {date ? format(date, "d MMMM yyyy", { locale: uk }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="nodrag w-auto p-0" align="start" sideOffset={4}>
        <Calendar
          mode="single"
          selected={date}
          onSelect={(newDate) => {
            onSelect?.(newDate)
            setOpen(false)
          }}
          defaultMonth={date || new Date()}
          locale={uk}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
