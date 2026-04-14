import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useCRM } from '../../contexts/CRMContext';
import { CareerMilestone } from '../../types';
import CareerTimeline from './CareerTimeline';

interface CareerPathProps {
  userId: string;
}

export default function CareerPath({ userId }: CareerPathProps) {
  const { effectiveOrgId } = useCRM();
  const [milestones, setMilestones] = useState<CareerMilestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!effectiveOrgId || !userId) return;

    const q = query(
      collection(db, 'organizations', effectiveOrgId, 'milestones'),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as CareerMilestone));
      setMilestones(loaded);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [effectiveOrgId, userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return <CareerTimeline milestones={milestones} />;
}
