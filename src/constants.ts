import { Card, CardType } from './types';

export const INITIAL_PLAYER_HP = 50;
export const INITIAL_ENEMY_HP = 50;
export const INITIAL_MANA = 3;
export const DRAW_COUNT = 5;

export const ALL_CARDS: Card[] = [
  {
    id: 'strike',
    name: '打击',
    description: '造成 6 点伤害。',
    type: CardType.ATTACK,
    value: 6,
    cost: 1,
    rarity: 'common'
  },
  {
    id: 'bash',
    name: '重击',
    description: '造成 10 点伤害。',
    type: CardType.ATTACK,
    value: 10,
    cost: 2,
    rarity: 'common'
  },
  {
    id: 'defend',
    name: '防御',
    description: '获得 5 点护甲。',
    type: CardType.DEFENSE,
    value: 5,
    cost: 1,
    rarity: 'common'
  },
  {
    id: 'fortify',
    name: '加固',
    description: '获得 12 点护甲。',
    type: CardType.DEFENSE,
    value: 12,
    cost: 2,
    rarity: 'rare'
  },
  {
    id: 'heal',
    name: '治疗',
    description: '恢复 8 点生命值。',
    type: CardType.HEAL,
    value: 8,
    cost: 2,
    rarity: 'rare'
  },
  {
    id: 'fireball',
    name: '火球术',
    description: '造成 15 点伤害。',
    type: CardType.ATTACK,
    value: 15,
    cost: 3,
    rarity: 'epic'
  },
  {
    id: 'divine_shield',
    name: '神圣护盾',
    description: '获得 20 点护甲。',
    type: CardType.DEFENSE,
    value: 20,
    cost: 3,
    rarity: 'epic'
  },
  {
    id: 'blood_rite',
    name: '鲜血祭礼',
    description: '造成 25 点伤害，失去 5 点生命值。',
    type: CardType.SPECIAL,
    value: 25,
    cost: 2,
    rarity: 'legendary'
  }
];

export const INITIAL_DECK: Card[] = [
  ...Array(5).fill(ALL_CARDS[0]), // 5 Strikes
  ...Array(4).fill(ALL_CARDS[2]), // 4 Defends
  ALL_CARDS[1], // 1 Bash
  ALL_CARDS[3], // 1 Fortify
  ALL_CARDS[4], // 1 Heal
];
