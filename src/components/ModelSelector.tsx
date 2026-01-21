import React from 'react';
import { ModelInfo } from '../types';

interface ModelSelectorProps {
  models: ModelInfo[];
  selectedVersion: string;
  onSelect: (version: string) => void;
  disabled?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ 
  models, 
  selectedVersion, 
  onSelect,
  disabled = false 
}) => {
  if (models.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-lg p-4 text-center text-zinc-600 text-sm">
        Loading available models...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {models.map((model) => {
        const isSelected = model.version === selectedVersion;
        const hasInstances = !model.offline && model.status === 'InService' && model.instances > 0;
        const indicatorClass = hasInstances 
          ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
          : 'bg-zinc-600';

        return (
          <button
            key={model.version}
            type="button"
            className={`w-full text-left p-3 rounded-lg border transition-all ${
              isSelected 
                ? 'bg-emerald-900/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={() => !disabled && onSelect(model.version)}
            disabled={disabled}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${indicatorClass} ${hasInstances ? 'animate-pulse' : ''}`} />
                <span className="font-semibold text-white">{model.version}</span>
              </div>
              <span className="text-xs text-zinc-500">
                {model.offline 
                  ? 'Offline' 
                  : hasInstances 
                    ? `${model.instances} instance${model.instances !== 1 ? 's' : ''}`
                    : 'No instances'}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ModelSelector;
