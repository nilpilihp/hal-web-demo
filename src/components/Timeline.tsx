import React from 'react';

interface TimelineProps {
  reserved?: boolean;
}

const Timeline: React.FC<TimelineProps> = ({ reserved = true }) => {
  if (reserved) {
    return (
      <div className="space-y-4">
        <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-lg p-8 text-center">
          <div className="text-zinc-600 text-sm mb-2">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium uppercase tracking-wider text-xs">Temporal Exertion Timeline</p>
          </div>
          <p className="text-zinc-700 text-xs">Feature reserved for future AWS response data</p>
        </div>
      </div>
    );
  }

  return null;
};

export default Timeline;
