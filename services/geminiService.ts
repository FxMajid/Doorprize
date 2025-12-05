import { GoogleGenerativeAI } from "@google/generative-ai";
import { Prize, Rarity } from "../types";

const genAI = new GoogleGenerativeAI(process.env.API_KEY || "");

export const generateTreasure = async (): Promise<Prize> => {
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
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Generate a unique, creative fantasy RPG loot item found in a treasure chest. It could be anything from a rusty spoon to a legendary sword. Be creative with the names and lore.

Return ONLY a valid JSON object with this exact structure:
{
  "name": "string - creative item name",
  "description": "string - 20-30 word description",
  "rarity": "string - one of: COMMON, UNCOMMON, RARE, EPIC, LEGENDARY, CURSED",
  "value": number,
  "type": "string - category like Weapon, Potion, Artifact, Junk"
}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (text) {
      // Clean up response if it has markdown code blocks
      const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(jsonText) as Prize;
    }
    
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Gemini generation failed:", error);
    return {
      name: "Mysterious Dust",
      description: "The API spirits were quiet. You found a pile of glittering dust.",
      rarity: Rarity.COMMON,
      value: 1,
      type: "Material"
    };
  }
};