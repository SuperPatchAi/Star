"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FollowUpReminder } from "@/types/reminders";

interface FollowUpCalendarProps {
  reminders: FollowUpReminder[];
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekDays(referenceDate: Date): Date[] {
  const d = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  const day = d.getDay();
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    return new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
  });
}

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();

  const cells: (Date | null)[] = [];

  // Leading days from previous month
  if (startDayOfWeek > 0) {
    const prevMonthLast = new Date(year, month, 0);
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      cells.push(
        new Date(
          prevMonthLast.getFullYear(),
          prevMonthLast.getMonth(),
          prevMonthLast.getDate() - i
        )
      );
    }
  }

  // Current month days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(year, month, d));
  }

  // Trailing days to fill 6 rows (42 cells)
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push(new Date(year, month + 1, d));
  }

  return cells;
}

function getWeekRowIndex(cells: (Date | null)[], today: Date): number {
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (cell && isSameDay(cell, today)) {
      return Math.floor(i / 7);
    }
  }
  return -1;
}

const DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES_WIDE = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type ReminderCounts = { overdue: number; due: number; upcoming: number };

export function FollowUpCalendar({
  reminders,
  selectedDate,
  onSelectDate,
}: FollowUpCalendarProps) {
  const [expanded, setExpanded] = useState(false);
  const [referenceDate, setReferenceDate] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
  );
  const today = useMemo(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()),
    []
  );

  const reminderDotMap = useMemo(() => {
    const map: Record<string, ReminderCounts> = {};
    for (const r of reminders) {
      const key = r.dueDate;
      if (!key) continue;
      if (!map[key]) map[key] = { overdue: 0, due: 0, upcoming: 0 };
      if (r.urgency === "overdue") map[key].overdue++;
      else if (r.urgency === "due_today") map[key].due++;
      else map[key].upcoming++;
    }
    return map;
  }, [reminders]);

  const handleDayClick = useCallback(
    (date: Date) => {
      if (selectedDate && isSameDay(selectedDate, date)) {
        onSelectDate(null);
      } else {
        onSelectDate(date);
      }
    },
    [selectedDate, onSelectDate]
  );

  const goToToday = useCallback(() => {
    setReferenceDate(today);
    onSelectDate(null);
  }, [today, onSelectDate]);

  const navigateWeek = useCallback((direction: number) => {
    setReferenceDate((prev) =>
      new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + direction * 7)
    );
  }, []);

  const navigateMonth = useCallback((direction: number) => {
    setReferenceDate((prev) =>
      new Date(prev.getFullYear(), prev.getMonth() + direction, 1)
    );
  }, []);

  const isCurrentMonth = isSameMonth(referenceDate, today);
  const weekDays = getWeekDays(referenceDate);
  const monthGrid = getMonthGrid(
    referenceDate.getFullYear(),
    referenceDate.getMonth()
  );
  const todayWeekRow = getWeekRowIndex(monthGrid, today);

  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  const formatWeekRange = () => {
    const sm = MONTH_NAMES[weekStart.getMonth()].slice(0, 3);
    const em = MONTH_NAMES[weekEnd.getMonth()].slice(0, 3);
    if (sm === em) {
      return `${sm} ${weekStart.getDate()} – ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
    }
    return `${sm} ${weekStart.getDate()} – ${em} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
  };

  const renderBadge = (counts: ReminderCounts) => {
    const total = counts.overdue + counts.due + counts.upcoming;
    if (total === 0) return null;

    let bgClass = "bg-muted-foreground/20 text-muted-foreground";
    if (counts.overdue > 0) bgClass = "bg-destructive/15 text-destructive";
    else if (counts.due > 0) bgClass = "bg-amber-500/15 text-amber-600 dark:text-amber-400";

    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full text-[9px] font-bold leading-none tabular-nums",
          "min-w-[16px] h-[16px] px-1",
          bgClass
        )}
      >
        {total}
      </span>
    );
  };

  const renderDayCell = (
    date: Date | null,
    compact: boolean,
    isOutsideMonth: boolean = false
  ) => {
    if (!date)
      return <div className={compact ? "h-11" : "h-11 md:h-14"} />;

    const isToday = isSameDay(date, today);
    const isSelected = selectedDate ? isSameDay(selectedDate, date) : false;
    const key = formatDateKey(date);
    const counts = reminderDotMap[key];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    return (
      <button
        onClick={() => !isOutsideMonth && handleDayClick(date)}
        disabled={isOutsideMonth}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl transition-all duration-150",
          "min-h-[44px] w-full",
          compact ? "h-11" : "h-11 md:h-14",
          // Safari: explicit tap highlight removal
          "[&_-webkit-tap-highlight-color]:transparent",
          isOutsideMonth && "opacity-30 cursor-default",
          !isOutsideMonth && "cursor-pointer",
          !isOutsideMonth && !isSelected && "active:scale-95",
          isSelected && "ring-2 ring-primary bg-primary/5",
          !isSelected && !isOutsideMonth && "hover:bg-muted/60",
          !isSelected && isWeekend && !isOutsideMonth && "bg-muted/30"
        )}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <span
          className={cn(
            "flex items-center justify-center text-sm tabular-nums transition-colors",
            "size-7 rounded-full",
            isToday && !isSelected && "bg-primary text-primary-foreground font-bold",
            isToday && isSelected && "bg-primary text-primary-foreground font-bold",
            !isToday && isSelected && "font-semibold text-primary",
            !isToday && !isSelected && "font-medium",
            isOutsideMonth && "text-muted-foreground/40"
          )}
        >
          {date.getDate()}
        </span>
        {counts && !isOutsideMonth && (
          <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
            {renderBadge(counts)}
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight">
            {expanded
              ? `${MONTH_NAMES[referenceDate.getMonth()]} ${referenceDate.getFullYear()}`
              : formatWeekRange()}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          {!isCurrentMonth && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-xs font-medium text-primary"
              onClick={goToToday}
            >
              Today
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg"
            onClick={() => (expanded ? navigateMonth(-1) : navigateWeek(-1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg"
            onClick={() => (expanded ? navigateMonth(1) : navigateWeek(1))}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Collapse to week view" : "Expand to month view"}
          >
            <CalendarDays className="size-4" />
          </Button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 px-2 pb-1">
        {DAY_NAMES.map((d, i) => (
          <span
            key={i}
            className={cn(
              "text-center text-[11px] font-medium uppercase tracking-wide",
              i === 0 || i === 6
                ? "text-muted-foreground/60"
                : "text-muted-foreground"
            )}
          >
            <span className="md:hidden">{d}</span>
            <span className="hidden md:inline">{DAY_NAMES_WIDE[i]}</span>
          </span>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className={cn(
          "px-2 pb-2 transition-all duration-200",
          // Safari-safe: use max-height transition instead of height auto
          "will-change-[max-height]"
        )}
        style={{
          // Smooth expand/collapse for Safari
          maxHeight: expanded ? "400px" : "80px",
          overflow: "hidden",
          transition: "max-height 250ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {expanded ? (
          <div className="grid grid-cols-7 gap-px">
            {monthGrid.map((date, i) => {
              const isOutside =
                date !== null &&
                !isSameMonth(date, referenceDate);
              const rowIdx = Math.floor(i / 7);
              const isTodayRow = rowIdx === todayWeekRow && !isOutside;

              return (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl",
                    isTodayRow &&
                      todayWeekRow >= 0 &&
                      isSameMonth(referenceDate, today) &&
                      "bg-primary/[0.03]"
                  )}
                >
                  {renderDayCell(date, false, isOutside)}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-px">
            {weekDays.map((date, i) => (
              <div key={i} className="flex justify-center">
                {renderDayCell(date, true)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      {expanded && (
        <div className="flex items-center justify-center gap-4 px-4 pb-3 pt-1 border-t">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-destructive/60" />
            <span className="text-[10px] text-muted-foreground">Overdue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500/60" />
            <span className="text-[10px] text-muted-foreground">Due</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-muted-foreground/40" />
            <span className="text-[10px] text-muted-foreground">Upcoming</span>
          </div>
        </div>
      )}
    </div>
  );
}
