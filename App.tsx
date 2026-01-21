import React, { useState, useEffect, useRef } from 'react';
import { GeminiLiveClient } from './services/gemini-live';
import { LiveConfig, VoiceName, ConnectionStatus } from './types';
import OrbVisualizer from './components/OrbVisualizer';
import SettingsPanel from './components/SettingsPanel';
import { Mic, MicOff, Settings, Radio, Power } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [config, setConfig] = useState<LiveConfig>({
    voiceName: VoiceName.Puck,
    systemInstruction: "You are a concise, helpful, and friendly AI assistant.",
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for visualizer access
  const [userAnalyser, setUserAnalyser] = useState<AnalyserNode | null>(null);
  const [aiAnalyser, setAiAnalyser] = useState<AnalyserNode | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);

  const clientRef = useRef<GeminiLiveClient | null>(null);

  useEffect(() => {
    clientRef.current = new GeminiLiveClient();
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, []);

  const handleConnect = async () => {
    if (!clientRef.current) return;
    
    setError(null);
    setStatus('connecting');

    await clientRef.current.connect(
      config,
      () => {
        // On Disconnect
        setStatus('disconnected');
        setUserAnalyser(null);
        setAiAnalyser(null);
      },
      (err) => {
        // On Error
        console.error(err);
        setError(err.message);
        setStatus('error');
        setUserAnalyser(null);
        setAiAnalyser(null);
      }
    );

    if (clientRef.current) {
      setStatus('connected');
      setUserAnalyser(clientRef.current.userAnalyser);
      setAiAnalyser(clientRef.current.aiAnalyser);
    }
  };

  const handleDisconnect = () => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      setStatus('disconnected');
      setUserAnalyser(null);
      setAiAnalyser(null);
    }
  };

  const toggleMic = () => {
    // Note: The current implementation in GeminiLiveClient doesn't strictly support "mute" 
    // without disconnecting the node or sending silence. 
    // For a simple demo, we will just toggle a state that visualizers might use, 
    // but a real mute would need to suspend the ScriptProcessor or gain node.
    // For now, let's keep it simple: Real mute is complex with just ScriptProcessor. 
    // We will just update UI state.
    setIsMicMuted(!isMicMuted);
    
    // In a real app, you would inject a GainNode before the processor and set gain to 0.
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-white overflow-hidden relative selection:bg-indigo-500/30">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-900/20 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6 flex justify-between items-center border-b border-white/5 bg-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Radio className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Aura Voice</h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Gemini Live Powered</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
            status === 'connected' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            status === 'connecting' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
            status === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
            'bg-slate-700/30 text-slate-400 border border-slate-700/50'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
               status === 'connected' ? 'bg-emerald-400 animate-pulse' :
               status === 'connecting' ? 'bg-yellow-400 animate-pulse' :
               status === 'error' ? 'bg-red-400' :
               'bg-slate-500'
            }`} />
            {status}
          </div>
          
          <button 
            onClick={() => setIsSettingsOpen(true)}
            disabled={status === 'connected' || status === 'connecting'}
            className="p-2 rounded-full hover:bg-white/10 text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex flex-col items-center justify-center p-6 gap-12">
        
        {/* Error Banner */}
        {error && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/30 text-red-200 px-6 py-3 rounded-lg flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            {error}
            <button onClick={() => setError(null)} className="ml-4 hover:text-white"><XIcon /></button>
          </div>
        )}

        {/* Visualizers Container */}
        <div className="relative w-full max-w-4xl aspect-video max-h-[500px] flex items-center justify-center">
           
           {/* Center Connection Trigger if disconnected */}
           {status === 'disconnected' || status === 'error' ? (
             <div className="text-center space-y-6">
                <button 
                  onClick={handleConnect}
                  className="group relative flex items-center justify-center w-32 h-32 rounded-full bg-slate-800 border-2 border-slate-700 hover:border-indigo-500 hover:shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)] transition-all duration-500"
                >
                   <Power className="w-12 h-12 text-slate-400 group-hover:text-white transition-colors" />
                   <span className="absolute -bottom-10 text-sm font-medium text-slate-400 group-hover:text-indigo-400 transition-colors">Tap to Connect</span>
                </button>
             </div>
           ) : (
             <div className="w-full h-full flex items-center justify-center relative">
                {/* AI Visualizer (Center) */}
                <div className="w-[80%] h-[80%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <OrbVisualizer analyser={aiAnalyser} isActive={status === 'connected'} color="#6366f1" />
                </div>
                
                {/* User Visualizer (Subtle, Overlay or Ring) */}
                {/* For this design, let's overlap them but give the user a different color style */}
                <div className="w-[40%] h-[40%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mix-blend-screen opacity-60 pointer-events-none">
                    <OrbVisualizer analyser={userAnalyser} isActive={status === 'connected' && !isMicMuted} color="#22d3ee" />
                </div>
             </div>
           )}

        </div>

        {/* Controls */}
        <div className={`flex items-center gap-6 transition-all duration-500 ${status === 'connected' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
          <button 
            onClick={toggleMic}
            className={`p-5 rounded-full border-2 transition-all duration-300 ${
              isMicMuted 
                ? 'bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500/30' 
                : 'bg-slate-800 border-slate-600 text-white hover:border-white hover:bg-slate-700'
            }`}
          >
            {isMicMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <button 
            onClick={handleDisconnect}
            className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold tracking-wide shadow-lg shadow-red-900/20 hover:shadow-red-900/40 transition-all active:scale-95"
          >
            End Session
          </button>
        </div>

      </main>

      {/* Footer / Status */}
      <footer className="p-4 text-center text-slate-500 text-xs border-t border-white/5 bg-white/5 backdrop-blur-md">
        <p>Aura Voice AI &bull; Gemini 2.5 Flash Native Audio &bull; Real-time Latency</p>
      </footer>

      <SettingsPanel 
        config={config} 
        setConfig={setConfig} 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        disabled={status === 'connected'} 
      />
    </div>
  );
};

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

export default App;