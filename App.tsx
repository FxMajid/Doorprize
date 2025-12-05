import React, { useState, useEffect, useRef } from 'react';
import { ChestIcon } from './components/ChestIcon';
import { PrizeModal } from './components/PrizeModal';
import { 
  playChestOpen, 
  playLootReveal, 
  playUiClick, 
  playUiClose, 
  toggleMute,
  getMuted 
} from './services/soundService';
import { 
  subscribeToConfig, 
  subscribeToWinners, 
  updateGameConfig, 
  claimPrizeTransaction,
  GameConfig
} from './services/firebase';
import { Prize, Rarity } from './types';

interface Winner {
  id: string;
  name: string;
  prize: string;
  timestamp: number;
}

const App: React.FC = () => {
  // Game State
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPrize, setCurrentPrize] = useState<Prize | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Input State
  const [participantName, setParticipantName] = useState("");
  
  // Synced State (from Firebase)
  const [config, setConfig] = useState<GameConfig>({
    prizePoolText: "",
    targetedPrizesText: "",
    removeAfterWin: true
  });
  const [winners, setWinners] = useState<Winner[]>([]);
  
  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [isMuted, setIsMuted] = useState(getMuted());

  // Refs
  const nameInputRef = useRef<HTMLInputElement>(null);

  // --- Initial Subscription ---
  useEffect(() => {
    // Listen to Config Changes
    const unsubscribeConfig = subscribeToConfig((newConfig) => {
      // Use functional update to avoid overwriting recent local edits if a sync happens
      setConfig(newConfig);
    });

    // Listen to Winners
    const unsubscribeWinners = subscribeToWinners((newWinners) => {
      setWinners(newWinners);
    });

    return () => {
      unsubscribeConfig();
      unsubscribeWinners();
    };
  }, []);

  const handleToggleMute = () => {
    const newState = toggleMute();
    setIsMuted(newState);
    if (!newState) playUiClick();
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "admin") {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setShowSettings(true);
      setPasswordInput("");
      playUiClick();
    } else {
      playUiClose();
      alert("Invalid Password");
    }
  };

  const handleSaveConfig = () => {
    updateGameConfig(config);
    playUiClick();
    // Add visual feedback so user knows it worked
    alert("✅ Config saved successfully to database!");
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setShowSettings(false);
    playUiClose();
  };

  const handleChestClick = async () => {
    if (isOpen || loading) return;

    if (!participantName.trim()) {
      playUiClose();
      nameInputRef.current?.focus();
      nameInputRef.current?.classList.add('animate-pulse', 'border-red-500');
      setTimeout(() => nameInputRef.current?.classList.remove('animate-pulse', 'border-red-500'), 1000);
      return;
    }

    // Play Sound & Animation
    playChestOpen();
    setIsOpen(true);
    setLoading(true);
    setModalOpen(true);

    try {
      // 1. Wait for animation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 2. CALL FIREBASE TRANSACTION
      // This runs on the server/database rules to ensure uniqueness
      const result = await claimPrizeTransaction(participantName);

      if (result.success && result.prize) {
        setCurrentPrize(result.prize);
        playLootReveal(result.prize.rarity || Rarity.COMMON);
      } else {
        // Fallback error (should rarely happen)
        setCurrentPrize({
          name: "Connection Error",
          description: "Gagal terhubung ke peti harta karun.",
          rarity: Rarity.COMMON,
          type: "Error",
          value: 0
        });
      }
      
    } catch (error) {
      console.error("Failed to open chest", error);
      setModalOpen(false);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    playUiClose();
    setModalOpen(false);
    setCurrentPrize(null);
    setIsOpen(false);
    setParticipantName("");
  };

  const availablePrizesCount = (config.prizePoolText || "").split('\n').filter(l => l.trim() !== '').length;

  return (
    <div className="min-h-screen bg-[url('https://picsum.photos/seed/dark-texture/1920/1080')] bg-cover bg-center bg-fixed bg-no-repeat bg-blend-multiply bg-slate-900 overflow-x-hidden text-slate-100 font-sans selection:bg-yellow-500/30">
      
      {/* --- Overlay --- */}
      <div className="min-h-screen bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-900/95 flex flex-col">
        
        {/* --- Header / Settings Bar --- */}
        <div className="w-full p-4 flex justify-between items-start z-40 relative">
           
           {/* Left Controls: Admin / Settings */}
           <div className="flex flex-col items-start gap-2">
              
              {!isAdmin ? (
                <button 
                  onClick={() => setShowAdminLogin(true)}
                  className="p-2 bg-slate-800/50 hover:bg-slate-700/80 rounded-lg border border-slate-700 text-slate-500 hover:text-yellow-500 transition-all"
                  title="Admin Login"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </button>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${showSettings ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-slate-800/80 border-slate-600 text-slate-300'}`}
                  >
                    <span>⚙️ Setup Prizes (Live)</span>
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-800/50 rounded-lg text-red-400 text-xs font-bold uppercase"
                  >
                    Logout
                  </button>
                </div>
              )}
              
              {/* Settings Panel (Only visible to Admin) */}
              {isAdmin && showSettings && (
                <div className="mt-2 p-4 bg-slate-800 border border-slate-600 rounded-xl shadow-xl w-80 md:w-96 animate-in slide-in-from-top-4 fade-in z-50 max-h-[80vh] overflow-y-auto">
                   
                   {/* Random Pool Section */}
                   <div className="mb-4">
                     <h3 className="font-bold text-yellow-400 mb-1">Random Prize Pool</h3>
                     <p className="text-xs text-slate-400 mb-2">
                       Changes will be applied when you click Save.
                     </p>
                     <textarea
                        value={config.prizePoolText}
                        onChange={(e) => setConfig(prev => ({...prev, prizePoolText: e.target.value}))}
                        placeholder="Contoh:\nSepeda Gunung\nZONK\nKulkas"
                        className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs md:text-sm focus:ring-2 focus:ring-yellow-500 outline-none mb-2 resize-none font-mono"
                     />
                     <div className="flex gap-2 mb-2">
                        <button 
                          onClick={() => {
                            // Helper to add ZONK doesn't save automatically anymore, user must review and Save
                            const newText = config.prizePoolText + (config.prizePoolText ? '\n' : '') + Array(10).fill('ZONK').join('\n');
                            setConfig(prev => ({...prev, prizePoolText: newText}));
                          }}
                          className="px-2 py-1 bg-red-900/30 hover:bg-red-900/50 border border-red-800/50 rounded text-xs text-red-300"
                        >
                          + 10 ZONK (Draft)
                        </button>
                     </div>
                     <div className="text-xs text-slate-300">
                        Remaining: <span className="text-white font-mono">{availablePrizesCount}</span>
                     </div>
                   </div>

                   <hr className="border-slate-700 my-4" />

                   {/* Targeted Prize Section */}
                   <div className="mb-3">
                     <h3 className="font-bold text-purple-400 mb-1">Targeted Prizes</h3>
                     <textarea
                        value={config.targetedPrizesText}
                        onChange={(e) => setConfig(prev => ({...prev, targetedPrizesText: e.target.value}))}
                        placeholder="Rian:Iphone 15 Pro\nSiti:ZONK"
                        className="w-full h-24 bg-slate-900 border border-purple-500/30 rounded-lg p-3 text-xs md:text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none font-mono"
                     />
                   </div>

                   <div className="flex items-center justify-end text-sm text-slate-300 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={config.removeAfterWin}
                          onChange={(e) => {
                             setConfig(prev => ({...prev, removeAfterWin: e.target.checked}));
                          }}
                          className="rounded border-slate-600 bg-slate-700 text-yellow-500 focus:ring-offset-slate-800"
                        />
                        Remove when won
                      </label>
                   </div>
                   
                   <div className="mt-4 pt-2 border-t border-slate-700 text-center">
                     <button onClick={handleSaveConfig} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm w-full font-bold shadow-lg transform active:scale-95 transition-transform">
                       Force Save Config
                     </button>
                   </div>
                </div>
              )}
           </div>

           {/* Right Controls: Mute */}
           <button 
              onClick={handleToggleMute}
              className="p-3 bg-slate-800/80 hover:bg-slate-700 backdrop-blur rounded-full border border-slate-600 text-yellow-400 shadow-lg"
              title={isMuted ? "Unmute Sound" : "Mute Sound"}
            >
              {isMuted ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
        </div>

        {/* --- Main Game Area --- */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 -mt-10">
           
           <h1 className="text-5xl md:text-7xl font-serif font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-200 to-yellow-500 drop-shadow-lg tracking-wider mb-8 text-center">
              Treasure Draw
           </h1>

           {/* Input Section */}
           <div className="w-full max-w-md mb-8 relative z-10">
              <label className="block text-slate-400 text-sm font-bold mb-2 ml-1 uppercase tracking-wider">
                Participant Name
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="Enter lucky person's name..."
                disabled={isOpen || loading}
                className="w-full bg-slate-800/80 backdrop-blur border-2 border-slate-600 focus:border-yellow-500 rounded-xl px-6 py-4 text-xl md:text-2xl text-center text-white placeholder-slate-500 outline-none transition-all shadow-lg"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleChestClick();
                }}
              />
           </div>

           {/* The Chest */}
           <div 
              onClick={handleChestClick}
              className={`
                relative w-64 h-64 md:w-80 md:h-80 cursor-pointer transition-transform duration-300 perspective-1000
                ${!isOpen && !loading ? 'hover:scale-105 hover:-translate-y-2 hover:drop-shadow-[0_20px_20px_rgba(234,179,8,0.2)]' : ''}
                ${isOpen ? '' : 'animate-float'}
              `}
            >
              <ChestIcon isOpen={isOpen} />
              
              {!isOpen && !loading && (
                <div className="absolute -bottom-8 left-0 right-0 text-center">
                   <span className="text-yellow-400/80 text-sm font-mono animate-pulse">Click to Open</span>
                </div>
              )}
           </div>

        </div>

        {/* --- Winners Feed (Footer) --- */}
        <div className="w-full bg-slate-900/90 border-t border-slate-800 p-4">
           <div className="max-w-4xl mx-auto">
              <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Recent Winners (Live Feed)</h3>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                 {winners.length === 0 ? (
                    <span className="text-slate-600 text-sm italic">Belum ada pemenang. Ayo mulai!</span>
                 ) : (
                    winners.map((winner) => (
                      <div key={winner.id} className="flex-shrink-0 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 flex flex-col min-w-[150px]">
                         <span className="text-yellow-400 font-bold truncate">{winner.name}</span>
                         <span className={`text-xs truncate ${winner.prize === "Anda Kurang Beruntung" ? "text-red-400" : "text-slate-300"}`}>
                           {winner.prize}
                         </span>
                      </div>
                    ))
                 )}
              </div>
           </div>
        </div>

        {/* Prize Modal */}
        {modalOpen && (
          <PrizeModal 
            prize={currentPrize} 
            winnerName={participantName}
            onClose={handleCloseModal} 
            loading={loading}
          />
        )}

        {/* Admin Login Modal */}
        {showAdminLogin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <form onSubmit={handleAdminLogin} className="bg-slate-800 p-6 rounded-xl border border-slate-600 shadow-2xl w-full max-w-sm">
                    <h3 className="text-xl font-bold text-white mb-4">Admin Access</h3>
                    <input 
                        type="password" 
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white mb-4 focus:border-yellow-500 outline-none"
                        placeholder="Enter Password"
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                        <button 
                            type="button"
                            onClick={() => setShowAdminLogin(false)}
                            className="px-4 py-2 text-slate-400 hover:text-white"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-lg"
                        >
                            Login
                        </button>
                    </div>
                </form>
            </div>
        )}

      </div>
    </div>
  );
};

export default App;