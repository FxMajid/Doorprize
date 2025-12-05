import { initializeApp } from "firebase/app";
import { 
  getDatabase, 
  ref, 
  onValue, 
  set, 
  push, 
  runTransaction, 
  serverTimestamp,
  Database 
} from "firebase/database";
import { Prize, Rarity } from "../types";

// Konfigurasi Firebase
// Saat Deploy di Vercel, masukkan value ini di menu Settings -> Environment Variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db: Database = getDatabase(app);

// --- Refs ---
const CONFIG_REF = 'game_config';
const WINNERS_REF = 'winners';

// --- Interfaces ---
export interface GameConfig {
  prizePoolText: string;
  targetedPrizesText: string;
  removeAfterWin: boolean;
}

// --- Listeners (Real-time) ---
export const subscribeToConfig = (callback: (data: GameConfig) => void) => {
  const configRef = ref(db, CONFIG_REF);
  return onValue(configRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      callback(data);
    } else {
      // Default config if empty
      callback({
        prizePoolText: "",
        targetedPrizesText: "",
        removeAfterWin: true
      });
    }
  });
};

export const subscribeToWinners = (callback: (data: any[]) => void) => {
  const winnersRef = ref(db, WINNERS_REF);
  // Order by timestamp desc logic needs to be handled in UI or query
  return onValue(winnersRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      // Convert object to array
      const winnersList = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })).sort((a, b) => b.timestamp - a.timestamp);
      callback(winnersList);
    } else {
      callback([]);
    }
  });
};

// --- Actions ---

// Update Admin Settings
export const updateGameConfig = async (config: GameConfig) => {
  await set(ref(db, CONFIG_REF), config);
};

// Fungsi Utama: Claim Hadiah dengan Transaksi Atomic (Anti-Race Condition)
// Ini menjamin 1 hadiah hanya bisa diambil 1 orang meskipun klik bersamaan
export const claimPrizeTransaction = async (
  participantName: string
): Promise<{ success: boolean; prize: Prize | null; message?: string }> => {
  
  const configRef = ref(db, CONFIG_REF);
  let resultPrize: Prize | null = null;
  let transactionError = null;

  try {
    await runTransaction(configRef, (currentConfig: GameConfig | null) => {
      if (!currentConfig) return; // Data belum siap

      // 1. Cek Targeted Prizes
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

        // Hapus dari daftar jika setting aktif
        if (currentConfig.removeAfterWin) {
          targetedLines.splice(targetedMatchIndex, 1);
          currentConfig.targetedPrizesText = targetedLines.join('\n');
        }
      } else {
        // --- RANDOM POOL LOGIC ---
        const availablePrizes = (currentConfig.prizePoolText || "").split('\n').filter(line => line.trim() !== '');

        if (availablePrizes.length > 0) {
          // Gacha Logic
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

          // Hapus dari daftar
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

      return currentConfig; // Commit perubahan ke database
    });

    if (resultPrize) {
      // Catat Pemenang
      await push(ref(db, WINNERS_REF), {
        name: participantName,
        prize: resultPrize.name,
        timestamp: serverTimestamp()
      });
      return { success: true, prize: resultPrize };
    } else {
       return { success: false, prize: null, message: "Transaction failed" };
    }

  } catch (e) {
    console.error("Transaction failed: ", e);
    // Fallback jika error (misal koneksi putus saat transaksi)
    return { success: false, prize: null, message: "Connection Error" };
  }
};