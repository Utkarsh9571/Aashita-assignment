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
        <h2 className="text-xs font-bold text-[#003B45] uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-[#00C9B7]" />
          <span>Filter by Meeting Room</span>
        </h2>
        <span className="text-xs text-slate-500 font-medium">
          {rooms.length} Available Rooms
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {/* All Rooms Tab */}
        <button
          type="button"
          onClick={() => onSelectRoom(null)}
          className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition border ${
            selectedRoomId === null
              ? 'bg-[#003B45] text-white border-[#003B45] shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-[#F5FAFA] hover:border-[#00C9B7]/40'
          }`}
        >
          <span>All Rooms</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              selectedRoomId === null
                ? 'bg-[#00C9B7] text-[#003B45]'
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
              className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition border ${
                isSelected
                  ? 'bg-[#003B45] text-white border-[#003B45] shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-[#F5FAFA] hover:border-[#00C9B7]/40'
              }`}
            >
              <span className="font-bold">{room.name}</span>
              <span
                className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  isSelected
                    ? 'bg-[#062F38] text-teal-200 border border-teal-500/30'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Users className="w-3 h-3" />
                {room.capacity}
              </span>
              {count > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    isSelected
                      ? 'bg-[#00C9B7] text-[#003B45]'
                      : 'bg-[#E6FAF8] text-[#003B45] border border-[#00C9B7]/30'
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
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600 bg-[#F0F7F7] border border-[#00C9B7]/30 rounded-xl px-4 py-2.5">
          {(() => {
            const current = rooms.find((r) => r.id === selectedRoomId);
            if (!current) return null;
            return (
              <>
                <span className="font-extrabold text-[#003B45]">
                  {current.name}
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Users className="w-3.5 h-3.5 text-[#00C9B7]" />
                  Capacity: {current.capacity} persons
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-[#00C9B7]" />
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
