'use client';

import React from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Building2,
} from 'lucide-react';
import { formatHumanDate, getTodayDateString } from '@/lib/dateUtils';

interface HeaderProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onOpenBookingModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedDate,
  onDateChange,
  onOpenBookingModal,
}) => {
  const todayStr = getTodayDateString();
  const isToday = selectedDate === todayStr;

  const handleStepDay = (delta: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + delta);
    const ny = date.getFullYear();
    const nm = String(date.getMonth() + 1).padStart(2, '0');
    const nd = String(date.getDate()).padStart(2, '0');
    onDateChange(`${ny}-${nm}-${nd}`);
  };

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Logo & Operating Hours */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  Meeting Spaces
                </h1>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Dashboard
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-0.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Working hours: 09:00 – 18:00</span>
              </div>
            </div>
          </div>

          {/* Date Picker Navigation & Primary Action */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Date Nav Controls */}
            <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shadow-xs">
              <button
                type="button"
                onClick={() => handleStepDay(-1)}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition shadow-none hover:shadow-xs focus:outline-none"
                title="Previous Day"
                aria-label="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="relative flex items-center px-2">
                <CalendarIcon className="w-4 h-4 text-slate-500 mr-2 pointer-events-none" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      onDateChange(e.target.value);
                    } else {
                      onDateChange(todayStr);
                    }
                  }}
                  className="bg-transparent text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
                  aria-label="Selected date"
                />
              </div>

              <button
                type="button"
                onClick={() => handleStepDay(1)}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition shadow-none hover:shadow-xs focus:outline-none"
                title="Next Day"
                aria-label="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Today Shortcut Button */}
            {!isToday && (
              <button
                type="button"
                onClick={() => onDateChange(todayStr)}
                className="px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 rounded-lg transition"
              >
                Today
              </button>
            )}

            {/* Date preview label (human readable) */}
            <div className="hidden lg:block text-xs font-medium text-slate-500 border-l border-slate-200 pl-3">
              {formatHumanDate(selectedDate)}
            </div>

            {/* Obvious Primary Action */}
            <button
              type="button"
              id="new-booking-btn"
              onClick={onOpenBookingModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm shadow-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ml-auto sm:ml-0"
            >
              <Plus className="w-4 h-4" />
              <span>Book Room</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
