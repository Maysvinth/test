import React from 'react';
import { VoiceName, LiveConfig } from '../types';
import { Settings, X } from 'lucide-react';

interface SettingsPanelProps {
  config: LiveConfig;
  setConfig: (config: LiveConfig) => void;
  isOpen: boolean;
  onClose: () => void;
  disabled: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, setConfig, isOpen, onClose, disabled }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            Configuration
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Voice Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Voice Personality
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(VoiceName).map((voice) => (
                <button
                  key={voice}
                  onClick={() => setConfig({ ...config, voiceName: voice })}
                  disabled={disabled}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    config.voiceName === voice
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {voice}
                </button>
              ))}
            </div>
          </div>

          {/* System Instructions */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              System Instruction
            </label>
            <textarea
              value={config.systemInstruction}
              onChange={(e) => setConfig({ ...config, systemInstruction: e.target.value })}
              disabled={disabled}
              placeholder="e.g., You are a helpful assistant..."
              className="w-full h-32 bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none placeholder-slate-500"
            />
            <p className="text-xs text-slate-500 mt-2">
              Define the AI's behavior, tone, and role.
            </p>
          </div>
          
          <button 
            onClick={onClose}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;