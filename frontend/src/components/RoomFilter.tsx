'use client';

import React from 'react';
import { Users, MapPin, Layers } from 'lucide-react';
import { Room, Booking } from '@/types';

interface RoomFilterProps {
  rooms: Room[];
  selectedRoomId: number | null;
  onSelectRoom: (roomId: number | null) => void;
  bookings: Booking[];
}

export const RoomFilter: React.FC<RoomFilterProps> = ({
  rooms,
  selectedRoomId,
  onSelectRoom,
  bookings,
}) => {
  // Count bookings per room for badges
  const getBookingCount = (roomId: number) => {
    return bookings.filter((b) => b.room_id === roomId).length;
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          <span>Filter by Room</span>
        </h2>
        <span className="text-xs text-slate-500 font-medium">
          {rooms.length} Rooms configured
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {/* All Rooms Tab */}
        <button
          type="button"
          onClick={() => onSelectRoom(null)}
          className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition border ${
            selectedRoomId === null
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <span>All Rooms</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
              selectedRoomId === null
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {bookings.length}
          </span>
        </button>

        {/* Individual Room Tabs */}
        {rooms.map((room) => {
          const isSelected = selectedRoomId === room.id;
          const count = getBookingCount(room.id);

          return (
            <button
              key={room.id}
              type="button"
              onClick={() => onSelectRoom(isSelected ? null : room.id)}
              className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition border ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <span className="font-semibold">{room.name}</span>
              <span
                className={`flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md ${
                  isSelected
                    ? 'bg-indigo-700/60 text-indigo-100'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Users className="w-3 h-3" />
                {room.capacity}
              </span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                    isSelected
                      ? 'bg-white text-indigo-700'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected room metadata pill */}
      {selectedRoomId !== null && (
        <div className="mt-2.5 flex items-center gap-4 text-xs text-slate-500 bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2">
          {(() => {
            const current = rooms.find((r) => r.id === selectedRoomId);
            if (!current) return null;
            return (
              <>
                <span className="font-semibold text-slate-800">
                  {current.name}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  Capacity: {current.capacity} persons
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Location: {current.location}
                </span>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};
