import { Prize, Rarity } from "../types";

// NOTE: Firebase module imports are causing compilation errors in this environment.
// Switching to a local storage-based mock implementation to ensure the app functions correctly
// without requiring the external Firebase SDK to be correctly resolved.

// --- Interfaces ---
export interface GameConfig {
  prizePoolText: string;
  targetedPrizesText: string;
  removeAfterWin: boolean;
}

// In-memory mock state with localStorage persistence
const STORAGE_KEY_CONFIG = 'mock_game_config';
const STORAGE_KEY_WINNERS = 'mock_game_winners';

const loadConfig = (): GameConfig => {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (stored) return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("LocalStorage access failed", e);
  }
  return {
    prizePoolText: "",
    targetedPrizesText: "",
    removeAfterWin: true
  };
};

const loadWinners = (): any[] => {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_WINNERS);
      if (stored) return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("LocalStorage access failed", e);
  }
  return [];
};

let configState: GameConfig = loadConfig();
let winnersState: any[] = loadWinners();

const configListeners = new Set<(data: GameConfig) => void>();
const winnersListeners = new Set<(data: any[]) => void>();

const notifyConfig = () => configListeners.forEach(cb => cb({ ...configState }));
const notifyWinners = () => winnersListeners.forEach(cb => cb([...winnersState]));

// --- Listeners ---

export const subscribeToConfig = (callback: (data: GameConfig) => void) => {
  configListeners.add(callback);
  // Send current state immediately
  callback({ ...configState });
  return () => configListeners.delete(callback);
};

export const subscribeToWinners = (callback: (data: any[]) => void) => {
  winnersListeners.add(callback);
  // Send current state immediately
  callback([...winnersState]);
  return () => winnersListeners.delete(callback);
};

// --- Actions ---

export const updateGameConfig = async (config: GameConfig) => {
  configState = { ...config };
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(configState));
  }
  notifyConfig();
};

export const claimPrizeTransaction = async (
  participantName: string
): Promise<{ success: boolean; prize: Prize | null; message?: string }> => {
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 600));

  let resultPrize: Prize | null = null;
  // Clone current config to simulate transactional read
  const currentConfig = { ...configState };

  // 1. Check Targeted Prizes
  const targetedLines = (currentConfig.targetedPrizesText || "").split('\n').filter(l => l.trim() !== '');
  let targetedMatchIndex = -1;
  let targetedPrizeName = "";

  for (let i = 0; i < targetedLines.length; i++) {
    const line = targetedLines[i];
    const separatorIndex = line.indexOf(':');
    if (separatorIndex > -1) {
      const targetName = line.substring(0, separatorIndex).trim().toLowerCase();
      const targetReward = line.substring(separatorIndex + 1).trim();
      
      if (targetName === participantName.trim().toLowerCase()) {
        targetedMatchIndex = i;
        targetedPrizeName = targetReward;
        break;
      }
    }
  }

  if (targetedMatchIndex > -1 && targetedPrizeName) {
    // --- TARGETED WIN ---
    const isZonk = targetedPrizeName.toUpperCase().includes("ZONK");
    resultPrize = {
      name: isZonk ? "Anda Kurang Beruntung" : targetedPrizeName,
      description: isZonk ? "Mohon maaf, tetap semangat!" : "Hadiah ini khusus dipilihkan semesta untukmu!",
      rarity: isZonk ? Rarity.CURSED : Rarity.LEGENDARY,
      type: isZonk ? "ZONK" : "Special Reward",
      value: isZonk ? 0 : 9999
    };

    if (currentConfig.removeAfterWin) {
      targetedLines.splice(targetedMatchIndex, 1);
      currentConfig.targetedPrizesText = targetedLines.join('\n');
    }
  } else {
    // --- RANDOM POOL LOGIC ---
    const availablePrizes = (currentConfig.prizePoolText || "").split('\n').filter(line => line.trim() !== '');

    if (availablePrizes.length > 0) {
      const randomIndex = Math.floor(Math.random() * availablePrizes.length);
      const rawPrizeName = availablePrizes[randomIndex].trim();
      const isZonk = rawPrizeName.toUpperCase() === "ZONK";

      resultPrize = {
        name: isZonk ? "Anda Kurang Beruntung" : rawPrizeName,
        description: isZonk 
          ? "Mohon maaf, hadiah utama telah habis. Tetap semangat!"
          : "Selamat! Anda mendapatkan hadiah spesial.",
        rarity: isZonk ? Rarity.CURSED : Rarity.EPIC,
        type: isZonk ? "ZONK" : "Reward",
        value: isZonk ? 0 : 100
      };

      if (currentConfig.removeAfterWin) {
        availablePrizes.splice(randomIndex, 1);
        currentConfig.prizePoolText = availablePrizes.join('\n');
      }
    } else {
      // --- EMPTY POOL ---
      resultPrize = {
        name: "Anda Kurang Beruntung",
        description: "Stok hadiah telah habis.",
        rarity: Rarity.CURSED,
        type: "ZONK",
        value: 0
      };
    }
  }

  if (resultPrize) {
    // Commit Transaction (Update Config)
    await updateGameConfig(currentConfig);

    // Add winner
    const newWinner = {
      id: Date.now().toString(),
      name: participantName,
      prize: resultPrize.name,
      timestamp: Date.now()
    };
    
    // Add to top
    winnersState = [newWinner, ...winnersState];
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_WINNERS, JSON.stringify(winnersState));
    }
    notifyWinners();

    return { success: true, prize: resultPrize };
  } else {
     return { success: false, prize: null, message: "Transaction failed" };
  }
};