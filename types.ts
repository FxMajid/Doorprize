export enum Rarity {
  COMMON = 'Common',
  UNCOMMON = 'Uncommon',
  RARE = 'Rare',
  EPIC = 'Epic',
  LEGENDARY = 'Legendary',
  CURSED = 'Cursed'
}

export interface Prize {
  name: string;
  description?: string;
  rarity?: Rarity;
  value?: number; // Value in gold coins
  type?: string; // e.g., Weapon, Potion, Trinket
}

export interface ChestData {
  id: number;
  isOpen: boolean;
  isLocked: boolean;
  prize?: Prize;
}