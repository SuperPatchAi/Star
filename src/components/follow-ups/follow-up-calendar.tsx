"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FollowUpReminder } from "@/types/reminders";

interface FollowUpCalendarProps {
  reminders: FollowUpReminder[];
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekDays(referenceDate: Date): Date[] {
  const d = new Date(referenceDate);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(start);
    dd.setDate(start.getDate() + i);
    return dd;
  });
}

function getMonthDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(year, month, d));
  }
  return cells;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function FollowUpCalendar({ reminders, selectedDate, onSelectDate }: FollowUpCalendarProps) {
  const [expanded, setExpanded] = useState(false);
  const [referenceDate, setReferenceDate] = useState(() => new Date());
  const today = useMemo(() => new Date(), []);

  const reminderDotMap = useMemo(() => {
    const map: Record<string, { overdue: number; due: number; upcoming: number }> = {};
    for (const r of reminders) {
      const key = formatDateKey(new Date());
      if (!map[key]) map[key] = { overdue: 0, due: 0, upcoming: 0 };
      if (r.urgency === "overdue") map[key].overdue++;
      else if (r.urgency === "due_today") map[key].due++;
      else map[key].upcoming++;
    }
    return map;
  }, [reminders]);

  const handleDayClick = (date: Date) => {
    if (selectedDate && isSameDay(selectedDate, date)) {
      onSelectDate(null);
    } else {
      onSelectDate(date);
    }
  };

  const navigateWeek = (direction: number) => {
    setReferenceDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + direction * 7);
      return next;
    });
  };

  const navigateMonth = (direction: number) => {
    setReferenceDate((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + direction);
      return next;
    });
  };

  const weekDays = getWeekDays(referenceDate);
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  const formatWeekRange = () => {
    const startMonth = MONTH_NAMES[weekStart.getMonth()].slice(0, 3);
    const endMonth = MONTH_NAMES[weekEnd.getMonth()].slice(0, 3);
    if (startMonth === endMonth) {
      return `${startMonth} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
    }
    return `${startMonth} ${weekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
  };

  const renderDayCell = (date: Date | null, compact: boolean) => {
    if (!date) return <div className={compact ? "size-10" : "aspect-square"} />;

    const isToday = isSameDay(date, today);
    const isSelected = selectedDate && isSameDay(selectedDate, date);
    const key = formatDateKey(date);
    const dots = reminderDotMap[key];

    return (
      <button
        onClick={() => handleDayClick(date)}
        className={cn(
          "flex flex-col items-center justify-center rounded-lg transition-colors",
          compact ? "size-10" : "aspect-square",
          isSelected && "bg-primary text-primary-foreground",
          !isSelected && isToday && "bg-primary/10 font-bold",
          !isSelected && !isToday && "hover:bg-muted"
        )}
      >
        <span className={cn(
          "text-sm tabular-nums",
          isSelected ? "font-bold" : isToday ? "font-bold" : "font-medium"
        )}>
          {date.getDate()}
        </span>
        {dots && (
          <div className="flex gap-0.5 mt-0.5">
            {dots.overdue > 0 && <span className="size-1 rounded-full bg-destructive" />}
            {dots.due > 0 && <span className={cn("size-1 rounded-full", isSelected ? "bg-primary-foreground" : "bg-primary")} />}
            {dots.upcoming > 0 && <span className={cn("size-1 rounded-full", isSelected ? "bg-primary-foreground/50" : "bg-muted-foreground/50")} />}
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => expanded ? navigateMonth(-1) : navigateWeek(-1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[180px] text-center">
            {expanded
              ? `${MONTH_NAMES[referenceDate.getMonth()]} ${referenceDate.getFullYear()}`
              : formatWeekRange()
            }
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => expanded ? navigateMonth(1) : navigateWeek(1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7"
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronsUpDown className="size-3.5 mr-1" />
          {expanded ? "Week" : "Month"}
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 text-center px-2 pt-2">
        {DAY_NAMES.map((d) => (
          <span key={d} className="text-[10px] text-muted-foreground font-medium uppercase">{d}</span>
        ))}
      </div>

      {/* Calendar body */}
      <div className="px-2 pb-2">
        {expanded ? (
          <div className="grid grid-cols-7 gap-0.5">
            {getMonthDays(referenceDate.getFullYear(), referenceDate.getMonth()).map((date, i) => (
              <div key={i}>{renderDayCell(date, false)}</div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-0.5">
            {weekDays.map((date, i) => (
              <div key={i} className="flex justify-center">{renderDayCell(date, true)}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
