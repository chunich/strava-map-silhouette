"use client";

import type { ReactNode } from "react";

export type CalendarDayInfo = {
  totalMiles: number;
  runCount: number;
  thumbnailFilename: string;
};

export type CalendarYearOverviewMonth = {
  month: number;
  label: string;
  daysInMonth: number;
  firstWeekday: number;
  dayRunCounts: Record<number, number>;
};

type RunCalendarProps = {
  activeYear: number;
  activeMonth: number | "ALL";
  dayMap: Map<number, CalendarDayInfo>;
  daysInMonth: number;
  firstWeekday: number;
  yearOverview: CalendarYearOverviewMonth[];
  renderThumbnail: (filename: string | null, alt: string) => ReactNode;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function RunCalendar({
  activeYear,
  activeMonth,
  dayMap,
  daysInMonth,
  firstWeekday,
  yearOverview,
  renderThumbnail,
}: RunCalendarProps) {
  if (activeMonth === "ALL") {
    return (
      <div className="run-calendar run-calendar-year-overview">
        {yearOverview.map((monthInfo) => (
          <div key={monthInfo.month} className="run-calendar-mini-month">
            <div className="run-calendar-mini-month-label">
              {monthInfo.label}
            </div>
            <div className="run-calendar-mini-grid">
              {Array.from({ length: monthInfo.firstWeekday }, (_, i) => (
                <span
                  key={`blank-${i}`}
                  className="run-calendar-mini-day run-calendar-mini-day-blank"
                />
              ))}
              {Array.from(
                { length: monthInfo.daysInMonth },
                (_, i) => i + 1,
              ).map((day) => {
                const hasRun = (monthInfo.dayRunCounts[day] || 0) > 0;
                return (
                  <span
                    key={day}
                    className={`run-calendar-mini-day ${hasRun ? "has-run" : ""}`}
                    title={`${monthInfo.label} ${day}${activeYear ? `, ${activeYear}` : ""}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="run-calendar">
      <div className="run-calendar-weekday-row">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="run-calendar-weekday">
            {label}
          </span>
        ))}
      </div>
      <div className="run-calendar-grid">
        {Array.from({ length: firstWeekday }, (_, i) => (
          <span
            key={`blank-${i}`}
            className="run-calendar-day run-calendar-day-blank"
          />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const info = dayMap.get(day);

          if (!info) {
            return (
              <span
                key={day}
                className="run-calendar-day run-calendar-day-empty"
              >
                <span className="run-calendar-day-number">{day}</span>
              </span>
            );
          }

          return (
            <span
              key={day}
              className="run-calendar-day run-calendar-day-filled"
            >
              {renderThumbnail(
                info.thumbnailFilename,
                `${activeYear}-${activeMonth}-${day} runs`,
              )}
              <span className="run-calendar-day-miles">
                {info.totalMiles.toFixed(1)} mi
              </span>
              {info.runCount > 1 && (
                <span className="run-calendar-day-badge">{info.runCount}</span>
              )}
            </span>
          );
        })}
        {Array.from(
          { length: Math.max(0, 42 - firstWeekday - daysInMonth) },
          (_, i) => (
            <span
              key={`trailing-blank-${i}`}
              className="run-calendar-day run-calendar-day-blank"
            />
          ),
        )}
      </div>
    </div>
  );
}
