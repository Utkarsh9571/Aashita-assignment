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
    <header className="border-b border-[#00C9B7]/20 bg-linear-to-r from-[#003B45] via-[#042F37] to-[#062F38] text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Aashita Technosoft Branding & Hours */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#00C9B7] to-[#00A89A] flex items-center justify-center text-[#003B45] shadow-md shadow-[#003B45]/50">
              <Building2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                  Aashita Technosoft
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#00C9B7]/15 text-[#00E0C6] border border-[#00C9B7]/30">
                  Meeting Spaces
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-teal-100/70 font-medium mt-0.5">
                <Clock className="w-3.5 h-3.5 text-[#00C9B7]" />
                <span>Working hours: 09:00 AM – 06:00 PM</span>
              </div>
            </div>
          </div>

          {/* Date Picker Controls & Primary Action */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Pill-shaped Date Nav Container */}
            <div className="flex items-center bg-[#022228]/80 p-1 rounded-full border border-teal-500/30 shadow-inner">
              <button
                type="button"
                onClick={() => handleStepDay(-1)}
                className="p-1.5 rounded-full text-teal-200 hover:text-white hover:bg-teal-500/20 transition focus:outline-none"
                title="Previous Day"
                aria-label="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="relative flex items-center px-2">
                <CalendarIcon className="w-4 h-4 text-[#00C9B7] mr-2 pointer-events-none" />
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
                  className="bg-transparent text-xs sm:text-sm font-semibold text-white focus:outline-none cursor-pointer scheme-dark"
                  aria-label="Selected date"
                />
              </div>

              <button
                type="button"
                onClick={() => handleStepDay(1)}
                className="p-1.5 rounded-full text-teal-200 hover:text-white hover:bg-teal-500/20 transition focus:outline-none"
                title="Next Day"
                aria-label="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Today Shortcut Pill */}
            {!isToday && (
              <button
                type="button"
                onClick={() => onDateChange(todayStr)}
                className="px-3 py-1.5 text-xs font-bold text-[#003B45] bg-[#00C9B7] hover:bg-[#00E0C6] rounded-full transition shadow-xs"
              >
                Today
              </button>
            )}

            {/* Date preview label */}
            <div className="hidden lg:block text-xs font-medium text-teal-200/80 border-l border-teal-700/50 pl-3">
              {formatHumanDate(selectedDate)}
            </div>

            {/* Aashita Primary Action Pill Button */}
            <button
              type="button"
              id="new-booking-btn"
              onClick={onOpenBookingModal}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold text-[#003B45] bg-linear-to-r from-[#00C9B7] to-[#00E0C6] hover:from-[#00E0C6] hover:to-[#00C9B7] active:scale-[0.98] transition shadow-md shadow-teal-950/40 focus:outline-none focus:ring-2 focus:ring-[#00E0C6] focus:ring-offset-2 focus:ring-offset-[#003B45] ml-auto sm:ml-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Book Room</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
