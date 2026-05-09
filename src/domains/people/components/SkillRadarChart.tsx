import React from 'react';
import { 
  Radar, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  Legend, Tooltip
} from 'recharts';
import { SkillMatrix } from '@/types';

interface SkillRadarChartProps {
  skills: SkillMatrix;
}

export default function SkillRadarChart({ skills }: SkillRadarChartProps) {
  // Combinar Hard e Soft Skills para o gráfico com segurança (R1 Guard)
  const data = [
    ...(Array.isArray(skills?.hard) ? skills.hard.map(s => ({ subject: s.name, level: s.level, type: 'Hard Skill' })) : []),
    ...(Array.isArray(skills?.soft) ? skills.soft.map(s => ({ subject: s.name, level: s.level, type: 'Soft Skill' })) : [])
  ];

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 bg-white/5 rounded-3xl border border-dashed border-white/10 italic text-gray-500 text-sm">
        Nenhuma competência mapeada ainda.
      </div>
    );
  }

  return (
    <div className="w-full h-[350px] bg-white/5 backdrop-blur-3xl rounded-3xl p-6 border border-white/10 overflow-hidden">
      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 text-center">Matriz de Competências (Radar)</h4>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} 
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 5]} 
            tick={{ fill: '#4b5563', fontSize: 8 }} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#030712', border: '1px solid #1f2937', borderRadius: '12px', fontSize: '10px' }}
            itemStyle={{ color: '#fff' }}
          />
          <Radar
            name="Nível"
            dataKey="level"
            stroke="#f97316"
            fill="#f97316"
            fillOpacity={0.5}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
