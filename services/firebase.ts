// @ts-ignore: Firebase types might be missing or incompatible in this environment
import { initializeApp, getApps, getApp } from "firebase/app";
import * as _firestore from "firebase/firestore";
import { Prize, Rarity } from "../types";

// Workaround for Firebase v9+ import issues in some environments where types are not detected correctly
const { 
  getFirestore, 
  doc, 
  onSnapshot, 
  setDoc, 
  runTransaction, 
  collection,
  query,
  orderBy,
  limit,
  serverTimestamp
} = _firestore as any;

// --- Interfaces ---
export interface GameConfig {
  prizePoolText: string;
  targetedPrizesText: string;
  removeAfterWin: boolean;
}

// --- Firebase Configuration ---
// Uses Vite's import.meta.env for environment variables
// Cast import.meta to any to avoid "Property 'env' does not exist on type 'ImportMeta'" error
const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
let db: any = null;

try {
  // Check if initializeApp is actually a function (runtime check)
  if (firebaseConfig.apiKey && typeof initializeApp === 'function') {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    console.log("🔥 Firebase Initialized");
  } else {
    console.warn("⚠️ Firebase Config Missing or SDK not loaded. Please check your .env file and dependencies.");
  }
} catch (error) {
  console.error("❌ Firebase Init Failed:", error);
}

// Database References
const CONFIG_DOC_ID = "main";
const CONFIG_COLLECTION = "game_config"; // doc: main
const WINNERS_COLLECTION = "winners";

// Default Config
const DEFAULT_CONFIG: GameConfig = {
  prizePoolText: "",
  targetedPrizesText: "",
  removeAfterWin: true
};

// --- Listeners ---

export const subscribeToConfig = (callback: (data: GameConfig) => void) => {
  if (!db) {
    callback(DEFAULT_CONFIG);
    return () => {};
  }

  const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);
  
  const unsubscribe = onSnapshot(docRef, (docSnap: any) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as GameConfig);
    } else {
      // Initialize if doesn't exist
      // We rely on the transaction or manual save to create it to avoid permission issues with onSnapshot writers
      callback(DEFAULT_CONFIG);
    }
  }, (error: any) => {
    console.error("Config listener error:", error.code, error.message);
  });

  return unsubscribe;
};

export const subscribeToWinners = (callback: (data: any[]) => void) => {
  if (!db) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, WINNERS_COLLECTION),
    orderBy("timestamp", "desc"),
    limit(50)
  );

  const unsubscribe = onSnapshot(q, (snapshot: any) => {
    const winners = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      // Convert Timestamp to millis for frontend compatibility
      timestamp: doc.data().timestamp?.toMillis() || Date.now()
    }));
    callback(winners);
  }, (error: any) => {
    console.error("Winners listener error:", error.code, error.message);
  });

  return unsubscribe;
};

// --- Actions ---

export const updateGameConfig = async (config: GameConfig) => {
  if (!db) return;
  const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);
  // Use set with merge: true to ensure document is created if it doesn't exist
  await setDoc(docRef, config, { merge: true });
};

/**
 * Executes the prize draw logic atomically inside a Transaction.
 * This prevents race conditions (e.g., two people winning the same unique item).
 */
export const claimPrizeTransaction = async (
  participantName: string
): Promise<{ success: boolean; prize: Prize | null; message?: string }> => {
  
  if (!db) {
    return { success: false, prize: null, message: "Database not connected (Check API Key)" };
  }

  const configRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);
  const winnersRef = collection(db, WINNERS_COLLECTION);

  try {
    const result = await runTransaction(db, async (transaction: any) => {
      // 1. Read Config
      const configSnap = await transaction.get(configRef);
      
      // FALLBACK: If config doesn't exist, use default empty config instead of crashing.
      let currentConfig: GameConfig = DEFAULT_CONFIG;
      if (configSnap.exists()) {
        currentConfig = configSnap.data() as GameConfig;
      }
      
      let resultPrize: Prize | null = null;
      let newConfigData = { ...currentConfig };

      // 2. Determine Prize Logic (Server-side simulation inside transaction)
      
      // A. Check Targeted Prizes
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
          newConfigData.targetedPrizesText = targetedLines.join('\n');
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
            newConfigData.prizePoolText = availablePrizes.join('\n');
          }
        } else {
          // --- EMPTY POOL ---
          resultPrize = {
            name: "Anda Kurang Beruntung",
            description: "Stok hadiah telah habis. (Hubungi Admin)",
            rarity: Rarity.CURSED,
            type: "ZONK",
            value: 0
          };
        }
      }

      // 3. Write updates if prize found
      if (resultPrize) {
        // CRITICAL FIX: Use set() with merge: true instead of update()
        // This ensures the document is created if it was missing previously.
        transaction.set(configRef, {
          prizePoolText: newConfigData.prizePoolText,
          targetedPrizesText: newConfigData.targetedPrizesText,
          removeAfterWin: newConfigData.removeAfterWin ?? true
        }, { merge: true });

        // Add Winner Log
        const newWinnerRef = doc(winnersRef); 
        transaction.set(newWinnerRef, {
          name: participantName,
          prize: resultPrize.name,
          timestamp: serverTimestamp()
        });
      }

      return resultPrize;
    });

    return { success: true, prize: result };

  } catch (error: any) {
    console.error("Transaction failed detailed:", error);
    
    // Provide user-friendly error messages based on Firestore codes
    let msg = error.message || "Unknown transaction error";
    
    // Check specifically for "Database does not exist" error from screenshot
    if (error.message && error.message.includes("database (default) does not exist")) {
      msg = "SETUP REQUIRED: Database Firestore belum dibuat. Buka Firebase Console > Build > Firestore Database > Create Database.";
    }
    else if (error.code === 'permission-denied') {
      msg = "Akses Ditolak: Cek 'Rules' di Firestore Console (pastikan allow read, write: if true).";
    } else if (error.code === 'unavailable') {
      msg = "Koneksi Terputus: Firestore offline atau tidak dapat dijangkau.";
    }
    else if (error.code === 'not-found') {
      // If we get here, it might be a weird edge case, but usually handled by the DB missing check above
      msg = "Error Sistem: Dokumen konfigurasi tidak dapat dibaca.";
    }

    return { success: false, prize: null, message: msg };
  }
};