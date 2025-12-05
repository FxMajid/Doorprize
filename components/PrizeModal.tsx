import React from 'react';
import { Prize, Rarity } from '../types';

interface PrizeModalProps {
  prize: Prize | null;
  winnerName?: string;
  onClose: () => void;
  loading: boolean;
}

const getRarityColor = (rarity: Rarity = Rarity.COMMON) => {
  switch (rarity) {
    case Rarity.COMMON: return 'text-gray-400 border-gray-400 shadow-gray-500/50';
    case Rarity.UNCOMMON: return 'text-green-400 border-green-400 shadow-green-500/50';
    case Rarity.RARE: return 'text-blue-400 border-blue-400 shadow-blue-500/50';
    case Rarity.EPIC: return 'text-purple-400 border-purple-400 shadow-purple-500/50';
    case Rarity.LEGENDARY: return 'text-yellow-400 border-yellow-400 shadow-yellow-500/50';
    case Rarity.CURSED: return 'text-red-600 border-red-600 shadow-red-900/50';
    default: return 'text-white border-white';
  }
};

const getRarityBg = (rarity: Rarity = Rarity.COMMON) => {
  switch (rarity) {
    case Rarity.LEGENDARY: return 'bg-yellow-400/10';
    case Rarity.EPIC: return 'bg-purple-900/20';
    case Rarity.CURSED: return 'bg-red-900/20';
    default: return 'bg-slate-800/50';
  }
};

export const PrizeModal: React.FC<PrizeModalProps> = ({ prize, winnerName, onClose, loading }) => {
  if (!loading && !prize) return null;

  const rarity = prize?.rarity || Rarity.COMMON;
  const isZonk = prize?.type === 'ZONK';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className={`relative max-w-md w-full p-8 rounded-xl border-2 bg-slate-900 shadow-2xl transform transition-all 
        ${loading ? 'animate-pulse border-blue-500/50' : `scale-100 ${prize ? getRarityColor(rarity).split(' ')[1] : ''}`}`}
      >
        {/* Close Button */}
        {!loading && (
          <button 
            onClick={onClose}
            className="absolute top-2 right-2 p-2 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-blue-300 font-serif text-lg animate-pulse">Summoning Loot...</p>
          </div>
        ) : prize && (
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${getRarityColor(rarity)}`}>
                {rarity}
              </span>
              <h2 className={`text-3xl font-bold font-serif ${getRarityColor(rarity).split(' ')[0]} drop-shadow-md break-words`}>
                {prize.name}
              </h2>
              {prize.type && <p className="text-slate-400 text-sm italic">{prize.type}</p>}
            </div>

            <div className={`p-6 rounded-lg border border-slate-700 ${getRarityBg(rarity)}`}>
              <p className="text-lg text-slate-200 leading-relaxed font-serif">
                {winnerName ? (
                  <span className={`block mb-2 font-bold ${isZonk ? 'text-red-400' : 'text-yellow-300'}`}>
                    {isZonk ? `Sayang Sekali, ${winnerName}...` : `Congratulations, ${winnerName}!`}
                  </span>
                ) : null}
                "{prize.description || 'You have found a treasure!'}"
              </p>
            </div>

            {prize.value !== undefined && !isZonk && (
              <div className="flex items-center justify-center space-x-2 text-yellow-500 font-mono text-xl">
                <span>Value:</span>
                <span className="font-bold">{prize.value}</span>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v12M8 10h8" stroke="black" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 px-6 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 
              border border-slate-600 rounded-lg text-white font-bold tracking-wide transition-all active:scale-95"
            >
              {isZonk ? 'Tutup' : 'Claim Reward'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
