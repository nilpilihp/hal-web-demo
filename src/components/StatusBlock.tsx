import React from 'react';

interface StatusBlockProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
}

const StatusBlock: React.FC<StatusBlockProps> = ({ title, message, icon }) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-zinc-500">{icon}</span>}
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">{title}</h3>
      </div>
      <p className="text-sm text-zinc-300 whitespace-pre-line leading-relaxed">{message}</p>
    </div>
  );
};

export default StatusBlock;
