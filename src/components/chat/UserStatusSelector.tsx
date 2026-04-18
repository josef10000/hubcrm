import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePresence } from '../../hooks/usePresence';
import { ChevronDown, Circle, Coffee, Users, Clock, Globe } from 'lucide-react';

export default function UserStatusSelector() {
  const { userProfile } = useAuth();
  const { manualSetStatus } = usePresence();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const statuses = [
    { id: 'online', label: 'Online', color: 'bg-emerald-500', icon: <Globe size={14} /> },
    { id: 'away', label: 'Ausente', color: 'bg-amber-500', icon: <Clock size={14} /> },
    { id: 'lunch', label: 'Almoço', color: 'bg-blue-500', icon: <Coffee size={14} /> },
    { id: 'meeting', label: 'Em Reunião', color: 'bg-purple-500', icon: <Users size={14} /> },
    { id: 'offline', label: 'Offline', color: 'bg-gray-500', icon: <Circle size={14} /> },
  ];

  const currentStatus = statuses.find(s => s.id === userProfile?.presenceStatus) || statuses[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-2 w-full hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all group"
      >
        <div className="relative shrink-0">
          <img
            src={userProfile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.displayName || '')}&background=random`}
            alt={userProfile?.displayName}
            className="w-10 h-10 rounded-full object-cover border-2 border-transparent group-hover:border-primary-500/30 transition-all"
          />
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900 ${currentStatus.color}`} />
        </div>
        
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {userProfile?.displayName}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
            {currentStatus.label}
          </p>
        </div>
        
        <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-1">
            {statuses.map((status) => (
              <button
                key={status.id}
                onClick={() => {
                  manualSetStatus(status.id as any);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all ${
                  userProfile?.presenceStatus === status.id
                    ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${status.color}`} />
                <span className="flex-1 text-left font-medium">{status.label}</span>
                {status.icon}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
