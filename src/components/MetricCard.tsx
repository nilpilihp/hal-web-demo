import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  trend?: string;
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  label, 
  value, 
  unit, 
  color = 'text-blue-400', 
  trend,
  subtitle 
}) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl hover:border-zinc-700 transition-colors">
      <div className="text-zinc-500 text-xs font-medium mb-1 uppercase tracking-wider">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
        {unit && <span className="text-zinc-400 text-sm">{unit}</span>}
      </div>
      {subtitle && (
        <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>
      )}
      {trend && (
        <div className="mt-2 text-[10px] text-zinc-400 font-medium bg-white/5 rounded px-2 py-0.5 inline-block">
          {trend}
        </div>
      )}
    </div>
  );
};

export default MetricCard;
