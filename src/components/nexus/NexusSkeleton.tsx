import React from 'react';
import { motion } from 'framer-motion';

const Skeleton = ({ className }: { className: string }) => (
  <div className={`bg-white/5 animate-pulse rounded-xl ${className}`} />
);

export const VaultSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
    <div className="lg:col-span-1 space-y-4">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-3xl" />)}
    </div>
    <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-24 rounded-[2rem]" />)}
    </div>
  </div>
);

export const GoalsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
    {[1, 2, 3].map(i => <Skeleton key={i} className="h-[220px] rounded-[2.5rem]" />)}
  </div>
);

export const LibrarySkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="space-y-3">
        <Skeleton className="aspect-[3/4] rounded-2xl" />
        <Skeleton className="h-4 w-3/4 mx-auto" />
      </div>
    ))}
  </div>
);
