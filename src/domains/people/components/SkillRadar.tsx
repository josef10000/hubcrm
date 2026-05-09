import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { UserSkill } from '../../types/people';

interface SkillRadarProps {
  skills: UserSkill[];
}

export default function SkillRadar({ skills }: SkillRadarProps) {
  if (!skills || skills.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50 p-6">
        <p className="text-sm font-medium">Nenhuma competência mapeada ainda.</p>
      </div>
    );
  }

  const data = skills.map(s => ({
    subject: s.name,
    A: s.level,
    fullMark: 5,
  }));

  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#9ca3af', fontSize: 10 }}
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 5]} 
            tick={false} 
            axisLine={false}
          />
          <Radar
            name="Skills"
            dataKey="A"
            stroke="#f97316"
            fill="#f97316"
            fillOpacity={0.5}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
