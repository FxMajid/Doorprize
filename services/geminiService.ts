import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Prize, Rarity } from "../types";

// Initialize AI using process.env.API_KEY as per guidelines.
// This assumes the environment variable is correctly configured and available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const prizeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "The creative name of the item found." },
    description: { type: Type.STRING, description: "A flavorful description of the item, around 20-30 words." },
    rarity: { 
      type: Type.STRING, 
      enum: [
        Rarity.COMMON, 
        Rarity.UNCOMMON, 
        Rarity.RARE, 
        Rarity.EPIC, 
        Rarity.LEGENDARY, 
        Rarity.CURSED
      ],
      description: "The rarity level of the item."
    },
    value: { type: Type.INTEGER, description: "The value of the item in gold coins." },
    type: { type: Type.STRING, description: "The category of the item (e.g., Weapon, Potion, Artifact, Junk)." }
  },
  required: ["name", "description", "rarity", "value", "type"]
};

export const generateTreasure = async (): Promise<Prize> => {
  // Check if API Key is effectively available (even though we initialized with it)
  // This handles runtime cases where the key might be missing/undefined.
  if (!process.env.API_KEY) {
    console.error("API Key missing. Please ensure process.env.API_KEY is configured.");
    return {
        name: "Configuration Error",
        description: "The magical conduit (API_KEY) is missing.",
        rarity: Rarity.COMMON,
        value: 0,
        type: "Error"
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Generate a unique, creative fantasy RPG loot item found in a treasure chest. It could be anything from a rusty spoon to a legendary sword. Be creative with the names and lore.",
      config: {
        responseMimeType: "application/json",
        responseSchema: prizeSchema,
        temperature: 1.2, // High creativity
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as Prize;
    }
    
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Gemini generation failed:", error);
    // Fallback prize in case of error
    return {
      name: "Mysterious Dust",
      description: "The API spirits were quiet. You found a pile of glittering dust.",
      rarity: Rarity.COMMON,
      value: 1,
      type: "Material"
    };
  }
};