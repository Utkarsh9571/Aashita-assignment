'use client';

import React, { useState } from 'react';
import { Search, Clock, Check, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Room, NextAvailableResponse } from '@/types';
import { fetchNextAvailableSlot } from '@/lib/api';
import { formatTimeRange } from '@/lib/dateUtils';

interface NextAvailableWidgetProps {
  rooms: Room[];
  selectedDate: string;
  defaultRoomId?: number | null;
  onSelectSlot: (roomId: number, date: string, startTime: string, endTime: string) => void;
  onToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export const NextAvailableWidget: React.FC<NextAvailableWidgetProps> = ({
  rooms,
  selectedDate,
  defaultRoomId,
  onSelectSlot,
  onToast,
}) => {
  const [targetRoomId, setTargetRoomId] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [slotResult, setSlotResult] = useState<NextAvailableResponse | null>(null);

  // Active room ID is either user selected, or defaultRoomId, or first room
  const activeRoomId = targetRoomId ?? defaultRoomId ?? (rooms.length > 0 ? rooms[0].id : null);
  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoomId) {
      onToast('warning', 'Room Required', 'Please select a room to check availability.');
      return;
    }
    if (durationMinutes <= 0) {
      onToast('warning', 'Invalid Duration', 'Duration must be greater than zero.');
      return;
    }

    setIsLoading(true);
    setSlotResult(null);

    try {
      const data = await fetchNextAvailableSlot(
        Number(activeRoomId),
        selectedDate,
        durationMinutes
      );
      setSlotResult(data);

      const isFound = data.available ?? data.slot_found;
      if (isFound && data.start_time && data.end_time) {
        onToast(
          'success',
          'Slot Available',
          `Found earliest slot from ${formatTimeRange(data.start_time, data.end_time)} in ${
            activeRoom?.name || 'selected room'
          }.`
        );
      } else {
        onToast(
          'warning',
          'No Available Slot',
          data.message || `No continuous ${durationMinutes}-minute slot available on this date.`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to search for available slot';
      onToast('error', 'Slot Search Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const durationOptions = [15, 30, 45, 60, 90];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#E6FAF8] text-[#003B45] flex items-center justify-center shrink-0">
          <Search className="w-5 h-5 text-[#00C9B7]" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-[#10243A]">
            Find Next Available Slot
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Automated conflict-free slot finder (09:00 – 18:00)
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        {/* Room selection */}
        <div>
          <label className="block text-xs font-bold text-[#003B45] mb-1.5 uppercase tracking-wider">
            Select Meeting Room
          </label>
          <select
            value={activeRoomId || ''}
            onChange={(e) => {
              setTargetRoomId(e.target.value ? Number(e.target.value) : null);
              setSlotResult(null);
            }}
            className="w-full text-xs sm:text-sm font-medium rounded-xl border border-slate-200 bg-[#F8FCFC] px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00C9B7]/40"
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.capacity} seats • {r.location})
              </option>
            ))}
          </select>
        </div>

        {/* Duration selection */}
        <div>
          <label className="block text-xs font-bold text-[#003B45] mb-1.5 uppercase tracking-wider">
            Meeting Duration
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {durationOptions.map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => {
                  setDurationMinutes(mins);
                  setSlotResult(null);
                }}
                className={`py-2 text-xs font-bold rounded-full border transition ${
                  durationMinutes === mins
                    ? 'bg-[#003B45] text-white border-[#003B45] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-[#F5FAFA] hover:border-[#00C9B7]/40'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        {/* Find Slot Button */}
        <button
          type="submit"
          disabled={isLoading || !activeRoomId}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs sm:text-sm font-bold text-white bg-linear-to-r from-[#003B45] to-[#062F38] hover:from-[#022B32] hover:to-[#04272F] active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#00E0C6]" />
              <span>Scanning calendar...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4 text-[#00C9B7]" />
              <span>Search Earliest {durationMinutes}m Slot</span>
            </>
          )}
        </button>
      </form>

      {/* Result Display */}
      {slotResult && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          {(slotResult.available ?? slotResult.slot_found) && slotResult.start_time && slotResult.end_time ? (
            <div className="rounded-2xl p-4 bg-[#F0FDF9] border border-[#00C9B7]/40 shadow-xs">
              <div className="flex items-center gap-2 text-[#003B45] font-bold text-xs mb-1">
                <Check className="w-4 h-4 text-[#00C9B7] shrink-0" />
                <span>Slot Available!</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#10243A] font-extrabold text-base my-1">
                <Clock className="w-4 h-4 text-[#00C9B7] shrink-0" />
                <span>
                  {formatTimeRange(slotResult.start_time, slotResult.end_time)}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mb-3 font-medium leading-relaxed">
                {slotResult.message}
              </p>

              <button
                type="button"
                onClick={() => {
                  if (slotResult.start_time && slotResult.end_time) {
                    onSelectSlot(
                      slotResult.room_id,
                      slotResult.date,
                      slotResult.start_time.slice(0, 5),
                      slotResult.end_time.slice(0, 5)
                    );
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-full text-xs font-bold text-[#003B45] bg-linear-to-r from-[#00C9B7] to-[#00E0C6] hover:from-[#00E0C6] hover:to-[#00C9B7] transition shadow-xs"
              >
                <span>Book This Slot</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="rounded-2xl p-4 bg-amber-50/90 border border-amber-200/80">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs mb-1">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>No Continuous Slot Available</span>
              </div>
              <p className="text-[11px] text-amber-800 mt-1 leading-relaxed font-medium">
                {slotResult.message}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
