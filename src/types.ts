export enum CardType {
  ATTACK = 'ATTACK',
  DEFENSE = 'DEFENSE',
  HEAL = 'HEAL',
  SPECIAL = 'SPECIAL'
}

export interface Card {
  id: string;
  name: string;
  description: string;
  type: CardType;
  value: number;
  cost: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface Entity {
  hp: number;
  maxHp: number;
  shield: number;
  mana: number;
  maxMana: number;
}

export interface GameState {
  player: Entity;
  enemy: Entity;
  deck: Card[];
  hand: Card[];
  discard: Card[];
  turn: 'player' | 'enemy';
  logs: string[];
  isGameOver: boolean;
  winner: 'player' | 'enemy' | null;
}
