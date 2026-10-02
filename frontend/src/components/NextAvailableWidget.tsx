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
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Search className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Find Next Available Slot
          </h2>
          <p className="text-xs text-slate-500">
            Automated conflict-free slot finder (09:00 – 18:00)
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        {/* Room selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Select Room
          </label>
          <select
            value={activeRoomId || ''}
            onChange={(e) => {
              setTargetRoomId(e.target.value ? Number(e.target.value) : null);
              setSlotResult(null);
            }}
            className="w-full text-xs sm:text-sm font-medium rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.capacity} seats)
              </option>
            ))}
          </select>
        </div>

        {/* Duration selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Duration
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
                className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                  durationMinutes === mins
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
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
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Scanning calendar...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Search Earliest {durationMinutes}m Slot</span>
            </>
          )}
        </button>
      </form>

      {/* Result Display */}
      {slotResult && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          {(slotResult.available ?? slotResult.slot_found) && slotResult.start_time && slotResult.end_time ? (
            <div className="rounded-xl p-3.5 bg-emerald-50/80 border border-emerald-200/80">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs mb-1">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Slot Available!</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-950 font-bold text-sm my-1">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {formatTimeRange(slotResult.start_time, slotResult.end_time)}
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 mb-2.5 font-medium leading-relaxed">
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
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold text-emerald-900 bg-white hover:bg-emerald-100 border border-emerald-300 transition shadow-2xs"
              >
                <span>Book This Slot</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="rounded-xl p-3.5 bg-amber-50/80 border border-amber-200/80">
              <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs mb-1">
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
