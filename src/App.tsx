import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Shield, 
  Zap, 
  Swords, 
  RotateCcw, 
  Trophy, 
  Skull,
  ChevronRight,
  Info,
  History
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Card, CardType, GameState, Entity } from './types';
import { 
  INITIAL_PLAYER_HP, 
  INITIAL_ENEMY_HP, 
  INITIAL_MANA, 
  DRAW_COUNT, 
  INITIAL_DECK,
  ALL_CARDS
} from './constants';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    player: { hp: INITIAL_PLAYER_HP, maxHp: INITIAL_PLAYER_HP, shield: 0, mana: INITIAL_MANA, maxMana: INITIAL_MANA },
    enemy: { hp: INITIAL_ENEMY_HP, maxHp: INITIAL_ENEMY_HP, shield: 0, mana: 0, maxMana: 0 },
    deck: [...INITIAL_DECK].sort(() => Math.random() - 0.5),
    hand: [],
    discard: [],
    turn: 'player',
    logs: ['欢迎来到秘境对决！轮到你了。'],
    isGameOver: false,
    winner: null,
  });

  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [preparingCardId, setPreparingCardId] = useState<string | null>(null);
  const [playedCard, setPlayedCard] = useState<Card | null>(null);
  const [activeEffect, setActiveEffect] = useState<CardType | null>(null);
  const [combatFeedback, setCombatFeedback] = useState<{ id: number; type: 'damage' | 'shield' | 'heal'; value: number; target: 'player' | 'enemy' }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [gameState.logs]);

  const addLog = (msg: string) => {
    setGameState(prev => ({ ...prev, logs: [...prev.logs, msg] }));
  };

  // Clear combat feedback after animation
  useEffect(() => {
    if (combatFeedback.length > 0) {
      const timer = setTimeout(() => {
        setCombatFeedback(prev => prev.slice(1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [combatFeedback]);

  const drawCards = useCallback((count: number) => {
    setGameState(prev => {
      let newDeck = [...prev.deck];
      let newDiscard = [...prev.discard];
      let newHand = [...prev.hand];

      for (let i = 0; i < count; i++) {
        if (newDeck.length === 0) {
          if (newDiscard.length === 0) break;
          newDeck = [...newDiscard].sort(() => Math.random() - 0.5);
          newDiscard = [];
        }
        const card = newDeck.pop();
        if (card) newHand.push({ ...card, id: `${card.id}-${Math.random()}` });
      }

      return { ...prev, deck: newDeck, discard: newDiscard, hand: newHand };
    });
  }, []);

  // Initial draw
  useEffect(() => {
    drawCards(DRAW_COUNT);
  }, [drawCards]);

  const endTurn = () => {
    if (gameState.turn !== 'player' || gameState.isGameOver) return;

    setGameState(prev => ({
      ...prev,
      turn: 'enemy',
      discard: [...prev.discard, ...prev.hand],
      hand: [],
      logs: [...prev.logs, '敌人回合开始...']
    }));
  };

  // Enemy AI logic
  useEffect(() => {
    if (gameState.turn === 'enemy' && !gameState.isGameOver) {
      const timer = setTimeout(() => {
        const action = Math.random();
        let damage = 0;
        let shield = 0;
        let logMsg = '';

        if (action < 0.6) {
          damage = Math.floor(Math.random() * 8) + 5;
          logMsg = `敌人发起了进攻，造成了 ${damage} 点伤害！`;
          setCombatFeedback(prev => [...prev, { id: Date.now(), type: 'damage', value: damage, target: 'player' }]);
        } else {
          shield = Math.floor(Math.random() * 6) + 4;
          logMsg = `敌人进行了防御，获得了 ${shield} 点护甲！`;
          setCombatFeedback(prev => [...prev, { id: Date.now() + 1, type: 'shield', value: shield, target: 'enemy' }]);
        }

        setGameState(prev => {
          let newPlayerHp = prev.player.hp;
          let newPlayerShield = prev.player.shield;
          let newEnemyShield = prev.enemy.shield + shield;

          if (damage > 0) {
            if (newPlayerShield >= damage) {
              newPlayerShield -= damage;
            } else {
              const remainingDamage = damage - newPlayerShield;
              newPlayerShield = 0;
              newPlayerHp = Math.max(0, newPlayerHp - remainingDamage);
            }
          }

          const isGameOver = newPlayerHp <= 0;

          return {
            ...prev,
            player: { ...prev.player, hp: newPlayerHp, shield: newPlayerShield, mana: INITIAL_MANA },
            enemy: { ...prev.enemy, shield: newEnemyShield },
            turn: 'player',
            isGameOver,
            winner: isGameOver ? 'enemy' : null,
            logs: [...prev.logs, logMsg, !isGameOver ? '轮到你了！能量已恢复。' : '你被击败了...'],
          };
        });

        drawCards(DRAW_COUNT);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState.turn, gameState.isGameOver, drawCards]);

  const playCard = (card: Card, index: number) => {
    if (gameState.turn !== 'player' || gameState.isGameOver || gameState.player.mana < card.cost) return;

    // Trigger visual effect
    setPlayedCard(card);
    setTimeout(() => {
      setPlayedCard(null);
      setActiveEffect(card.type);
      setTimeout(() => setActiveEffect(null), 800);
    }, 600);

    // Add combat feedback
    if (card.type === CardType.ATTACK || card.type === CardType.SPECIAL) {
      setCombatFeedback(prev => [...prev, { id: Date.now(), type: 'damage', value: card.value, target: 'enemy' }]);
    } else if (card.type === CardType.DEFENSE) {
      setCombatFeedback(prev => [...prev, { id: Date.now(), type: 'shield', value: card.value, target: 'player' }]);
    } else if (card.type === CardType.HEAL) {
      setCombatFeedback(prev => [...prev, { id: Date.now(), type: 'heal', value: card.value, target: 'player' }]);
    }

    setGameState(prev => {
      let newEnemyHp = prev.enemy.hp;
      let newEnemyShield = prev.enemy.shield;
      let newPlayerHp = prev.player.hp;
      let newPlayerShield = prev.player.shield;
      let newPlayerMana = prev.player.mana - card.cost;

      let logMsg = `你使用了 ${card.name}。`;

      switch (card.type) {
        case CardType.ATTACK:
          if (newEnemyShield >= card.value) {
            newEnemyShield -= card.value;
            logMsg += `对护甲造成了 ${card.value} 点伤害。`;
          } else {
            const damage = card.value - newEnemyShield;
            newEnemyShield = 0;
            newEnemyHp = Math.max(0, newEnemyHp - damage);
            logMsg += `造成了 ${card.value} 点伤害！`;
          }
          break;
        case CardType.DEFENSE:
          newPlayerShield += card.value;
          logMsg += `获得了 ${card.value} 点护甲。`;
          break;
        case CardType.HEAL:
          newPlayerHp = Math.min(prev.player.maxHp, newPlayerHp + card.value);
          logMsg += `恢复了 ${card.value} 点生命值。`;
          break;
        case CardType.SPECIAL:
          if (card.id.startsWith('blood_rite')) {
            newPlayerHp = Math.max(0, newPlayerHp - 5);
            if (newEnemyShield >= card.value) {
              newEnemyShield -= card.value;
            } else {
              newEnemyHp = Math.max(0, newEnemyHp - (card.value - newEnemyShield));
              newEnemyShield = 0;
            }
            logMsg += `牺牲了 5 点生命值，造成了 ${card.value} 点伤害！`;
          }
          break;
      }

      const isGameOver = newEnemyHp <= 0 || newPlayerHp <= 0;
      const winner = newEnemyHp <= 0 ? 'player' : (newPlayerHp <= 0 ? 'enemy' : null);

      if (winner === 'player') {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      return {
        ...prev,
        enemy: { ...prev.enemy, hp: newEnemyHp, shield: newEnemyShield },
        player: { ...prev.player, hp: newPlayerHp, shield: newPlayerShield, mana: newPlayerMana },
        hand: prev.hand.filter((_, i) => i !== index),
        discard: [...prev.discard, card],
        logs: [...prev.logs, logMsg],
        isGameOver,
        winner
      };
    });
  };

  const resetGame = () => {
    setGameState({
      player: { hp: INITIAL_PLAYER_HP, maxHp: INITIAL_PLAYER_HP, shield: 0, mana: INITIAL_MANA, maxMana: INITIAL_MANA },
      enemy: { hp: INITIAL_ENEMY_HP, maxHp: INITIAL_ENEMY_HP, shield: 0, mana: 0, maxMana: 0 },
      deck: [...INITIAL_DECK].sort(() => Math.random() - 0.5),
      hand: [],
      discard: [],
      turn: 'player',
      logs: ['游戏重置。轮到你了！'],
      isGameOver: false,
      winner: null,
    });
    drawCards(DRAW_COUNT);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-4 md:p-8 bg-[radial-gradient(circle_at_50%_30%,#1a100a_0%,#0a0502_100%)]">
      {/* Visual Effects Overlay */}
      <AnimatePresence>
        {activeEffect === CardType.ATTACK && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[60] pointer-events-none bg-red-500/20 mix-blend-overlay"
          />
        )}
        {activeEffect === CardType.DEFENSE && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.2, opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center"
          >
            <div className="w-[500px] h-[500px] rounded-full border-8 border-blue-500/30 blur-xl" />
          </motion.div>
        )}
        {activeEffect === CardType.HEAL && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: -100, opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center"
          >
            <div className="flex gap-4">
              {[...Array(5)].map((_, i) => (
                <Heart key={i} className="w-12 h-12 text-green-400 fill-green-400 animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          </motion.div>
        )}
        {activeEffect === CardType.SPECIAL && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ x: [-10, 10, -10, 10, 0], opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[60] pointer-events-none bg-purple-900/40"
          />
        )}
      </AnimatePresence>

      {/* Played Card Animation (Battle Area) */}
      <AnimatePresence>
        {playedCard && (
          <motion.div
            initial={{ scale: 0.5, y: 200, opacity: 0, rotateY: 180 }}
            animate={{ scale: 1.2, y: -100, opacity: 1, rotateY: 0 }}
            exit={{ scale: 2, opacity: 0, filter: "brightness(2) blur(10px)" }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={cn(
              "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-80 rounded-2xl border-4 p-6 z-[70] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col justify-between bg-stone-900 overflow-hidden",
              playedCard.rarity === 'common' && "card-common",
              playedCard.rarity === 'rare' && "card-rare",
              playedCard.rarity === 'epic' && "card-epic",
              playedCard.rarity === 'legendary' && "card-legendary"
            )}
          >
            {/* Played Card Background Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none">
              {playedCard.type === CardType.ATTACK && <Swords className="w-64 h-64 rotate-12" />}
              {playedCard.type === CardType.DEFENSE && <Shield className="w-64 h-64 -rotate-12" />}
              {playedCard.type === CardType.HEAL && <Heart className="w-64 h-64" />}
              {playedCard.type === CardType.SPECIAL && <Zap className="w-64 h-64 rotate-45" />}
            </div>

            {playedCard.rarity !== 'common' && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-1/2 -skew-x-12 animate-shine" />
              </div>
            )}

            <div className="flex justify-between items-start relative z-10">
              <div className="bg-black/40 px-3 py-1 rounded text-sm font-mono font-bold text-amber-400 border border-amber-500/30">
                {playedCard.cost}
              </div>
              <div className="text-xs uppercase tracking-widest opacity-50 font-bold">
                {playedCard.type === CardType.ATTACK ? '攻击' : playedCard.type === CardType.DEFENSE ? '防御' : playedCard.type === CardType.HEAL ? '治疗' : '特殊'}
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 relative z-10">
              <div className={cn(
                "p-4 rounded-full relative",
                playedCard.rarity === 'legendary' && "bg-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.5)]",
                playedCard.rarity === 'epic' && "bg-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.4)]",
                playedCard.rarity === 'rare' && "bg-blue-500/20",
                playedCard.rarity === 'common' && "bg-white/5"
              )}>
                {playedCard.type === CardType.ATTACK && <Swords className="w-12 h-12 text-red-400" />}
                {playedCard.type === CardType.DEFENSE && <Shield className="w-12 h-12 text-blue-400" />}
                {playedCard.type === CardType.HEAL && <Heart className="w-12 h-12 text-green-400" />}
                {playedCard.type === CardType.SPECIAL && <Zap className="w-12 h-12 text-purple-400" />}
              </div>
              <h3 className="font-serif italic text-2xl leading-tight">{playedCard.name}</h3>
            </div>

            <p className="text-sm text-stone-300 text-center leading-relaxed">
              {playedCard.description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header / Enemy Stats */}
      <div className="w-full max-w-4xl flex flex-col items-center gap-6">
        <div className="flex items-center gap-8 glass-panel p-6 w-full justify-between">
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <motion.div 
                animate={combatFeedback.some(f => f.target === 'enemy' && f.type === 'damage') ? {
                  x: [-10, 10, -10, 10, 0],
                  backgroundColor: ['rgba(127, 29, 29, 0.5)', 'rgba(239, 68, 68, 0.8)', 'rgba(127, 29, 29, 0.5)'],
                  transition: { duration: 0.4 }
                } : {}}
                className="w-24 h-24 rounded-full bg-red-950/50 border-2 border-red-500/30 flex items-center justify-center animate-float"
              >
                <Skull className="w-12 h-12 text-red-500" />
              </motion.div>
              
              {/* Enemy Floating Feedback */}
              <AnimatePresence>
                {combatFeedback.filter(f => f.target === 'enemy').map(f => (
                  <motion.div
                    key={f.id}
                    initial={{ y: 0, opacity: 0, scale: 0.5 }}
                    animate={{ y: -80, opacity: [0, 1, 1, 0], scale: [0.5, 1.5, 1.5, 1] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className={cn(
                      "absolute -top-4 left-1/2 -translate-x-1/2 font-mono font-bold text-2xl z-50 pointer-events-none",
                      f.type === 'damage' ? "text-red-500" : "text-blue-400"
                    )}
                  >
                    {f.type === 'damage' ? `-${f.value}` : `+${f.value}`}
                  </motion.div>
                ))}
              </AnimatePresence>

              {gameState.enemy.shield > 0 && (
                <motion.div 
                  animate={combatFeedback.some(f => f.target === 'enemy' && f.type === 'shield') ? {
                    scale: [1, 1.5, 1],
                    transition: { duration: 0.3 }
                  } : {}}
                  className="absolute -bottom-2 -right-2 bg-blue-600 text-white px-2 py-1 rounded-lg flex items-center gap-1 text-sm font-bold shadow-lg"
                >
                  <Shield className="w-4 h-4" /> {gameState.enemy.shield}
                </motion.div>
              )}
            </div>
            <span className="text-red-400 font-serif italic tracking-widest uppercase text-xs">虚空守卫</span>
          </div>

          <div className="flex-1 max-w-md">
            <div className="flex justify-between mb-2">
              <span className="text-xs font-mono text-red-400 uppercase tracking-tighter">生命力</span>
              <span className="text-xs font-mono text-red-400">{gameState.enemy.hp} / {gameState.enemy.maxHp}</span>
            </div>
            <div className="h-3 bg-stone-900 rounded-full overflow-hidden border border-white/5 relative">
              {/* Damage Flash */}
              <motion.div 
                animate={combatFeedback.some(f => f.target === 'enemy' && f.type === 'damage') ? {
                  opacity: [0, 1, 0],
                  transition: { duration: 0.2 }
                } : { opacity: 0 }}
                className="absolute inset-0 bg-white z-10"
              />
              <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: `${(gameState.enemy.hp / gameState.enemy.maxHp) * 100}%` }}
                className="h-full bg-gradient-to-r from-red-900 to-red-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Battle Log (Floating) */}
      <div className="fixed left-8 top-1/2 -translate-y-1/2 hidden xl:flex flex-col w-64 glass-panel p-4 max-h-[400px]">
        <div className="flex items-center gap-2 mb-4 border-bottom border-white/10 pb-2">
          <History className="w-4 h-4 text-stone-500" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-stone-500">战斗日志</span>
        </div>
        <div ref={scrollRef} className="overflow-y-auto space-y-2 pr-2 scrollbar-hide">
          {gameState.logs.map((log, i) => (
            <div key={i} className="text-[11px] font-mono text-stone-400 leading-relaxed border-l border-stone-800 pl-2">
              {log}
            </div>
          ))}
        </div>
      </div>

      {/* Player Stats & Hand */}
      <div className="w-full max-w-6xl flex flex-col items-center gap-8">
        {/* Player Status Bar */}
        <div className="flex items-center gap-12 glass-panel px-8 py-4 relative">
          {/* Player Floating Feedback */}
          <AnimatePresence>
            {combatFeedback.filter(f => f.target === 'player').map(f => (
              <motion.div
                key={f.id}
                initial={{ y: 0, opacity: 0, scale: 0.5 }}
                animate={{ y: -100, opacity: [0, 1, 1, 0], scale: [0.5, 1.5, 1.5, 1] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                className={cn(
                  "absolute -top-8 left-1/2 -translate-x-1/2 font-mono font-bold text-2xl z-50 pointer-events-none",
                  f.type === 'damage' ? "text-red-500" : (f.type === 'shield' ? "text-blue-400" : "text-green-400")
                )}
              >
                {f.type === 'damage' ? `-${f.value}` : `+${f.value}`}
              </motion.div>
            ))}
          </AnimatePresence>

          <motion.div 
            animate={combatFeedback.some(f => f.target === 'player' && f.type === 'damage') ? {
              x: [-10, 10, -10, 10, 0],
              backgroundColor: ['rgba(0, 0, 0, 0)', 'rgba(239, 68, 68, 0.2)', 'rgba(0, 0, 0, 0)'],
              transition: { duration: 0.4 }
            } : {}}
            className="flex flex-col gap-2 min-w-[140px]"
          >
            <div className="flex items-center gap-3">
              <motion.div 
                animate={combatFeedback.some(f => f.target === 'player' && f.type === 'heal') ? {
                  scale: [1, 1.4, 1],
                  backgroundColor: ['rgba(239, 68, 68, 0.1)', 'rgba(34, 197, 94, 0.4)', 'rgba(239, 68, 68, 0.1)'],
                  transition: { duration: 0.4 }
                } : {}}
                className="p-2 bg-red-500/10 rounded-lg"
              >
                <Heart className="w-5 h-5 text-red-500 fill-red-500/20" />
              </motion.div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">生命值</div>
                <div className="text-xl font-mono font-bold text-red-400">{gameState.player.hp}</div>
              </div>
            </div>
            <div className="h-1.5 w-full bg-stone-900 rounded-full overflow-hidden relative border border-white/5">
              {/* Damage Flash */}
              <motion.div 
                animate={combatFeedback.some(f => f.target === 'player' && f.type === 'damage') ? {
                  opacity: [0, 1, 0],
                  transition: { duration: 0.2 }
                } : { opacity: 0 }}
                className="absolute inset-0 bg-white z-10"
              />
              {/* Ghost bar (delayed) */}
              <motion.div 
                initial={false}
                animate={{ width: `${(gameState.player.hp / gameState.player.maxHp) * 100}%` }}
                transition={{ duration: 1, ease: "circOut" }}
                className="absolute inset-0 bg-red-400/30"
              />
              {/* Main health bar */}
              <motion.div 
                initial={false}
                animate={{ width: `${(gameState.player.hp / gameState.player.maxHp) * 100}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="absolute inset-0 bg-gradient-to-r from-red-900 to-red-500"
              />
            </div>
          </motion.div>

          <div className="flex items-center gap-3">
            <motion.div 
              animate={combatFeedback.some(f => f.target === 'player' && f.type === 'shield') ? {
                scale: [1, 1.3, 1],
                backgroundColor: ['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.4)', 'rgba(59, 130, 246, 0.1)'],
                transition: { duration: 0.3 }
              } : {}}
              className="p-2 bg-blue-500/10 rounded-lg"
            >
              <Shield className="w-5 h-5 text-blue-500 fill-blue-500/20" />
            </motion.div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">护甲</div>
              <div className="text-xl font-mono font-bold text-blue-400">{gameState.player.shield}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500/20" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">能量</div>
              <div className="text-xl font-mono font-bold text-amber-400">{gameState.player.mana} / {gameState.player.maxMana}</div>
            </div>
          </div>
        </div>

        {/* Hand */}
        <div className="relative w-full flex justify-center h-72 items-end">
          <AnimatePresence>
            {gameState.hand.map((card, i) => (
              <motion.div
                key={card.id}
                layoutId={card.id}
                initial={{ y: 100, opacity: 0, rotate: (i - (gameState.hand.length - 1) / 2) * 5 }}
                animate={{ 
                  y: preparingCardId === card.id ? -120 : (selectedCard?.id === card.id ? -40 : 0), 
                  x: preparingCardId === card.id ? [0, -2, 2, -2, 2, 0] : 0,
                  opacity: 1, 
                  rotate: (i - (gameState.hand.length - 1) / 2) * 5,
                  scale: preparingCardId === card.id ? 1.2 : (selectedCard?.id === card.id ? 1.1 : 1),
                  zIndex: preparingCardId === card.id ? 100 : (selectedCard?.id === card.id ? 50 : i)
                }}
                transition={{
                  x: preparingCardId === card.id ? { repeat: Infinity, duration: 0.1 } : { duration: 0.3 }
                }}
                exit={{ 
                  y: -300, 
                  scale: 1.5, 
                  opacity: 0,
                  filter: "brightness(2) blur(8px)",
                  transition: { duration: 0.4, ease: "backIn" }
                }}
                whileHover={{ 
                  y: preparingCardId === card.id ? -120 : -60, 
                  scale: preparingCardId === card.id ? 1.2 : 1.1, 
                  zIndex: 100,
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                  transition: { type: "spring", stiffness: 400, damping: 25 } 
                }}
                onClick={() => {
                  if (selectedCard?.id === card.id) {
                    if (preparingCardId) return;
                    setPreparingCardId(card.id);
                    setTimeout(() => {
                      playCard(card, i);
                      setSelectedCard(null);
                      setPreparingCardId(null);
                    }, 500);
                  } else {
                    setSelectedCard(card);
                  }
                }}
                className={cn(
                  "absolute w-44 h-64 rounded-xl border-2 p-4 cursor-pointer transition-all flex flex-col justify-between shadow-2xl overflow-hidden",
                  card.rarity === 'common' && "card-common",
                  card.rarity === 'rare' && "card-rare",
                  card.rarity === 'epic' && "card-epic",
                  card.rarity === 'legendary' && "card-legendary",
                  selectedCard?.id === card.id && "border-amber-400 ring-4 ring-amber-400/20 animate-pulse",
                  gameState.player.mana < card.cost && "opacity-50 grayscale cursor-not-allowed"
                )}
                style={{ 
                  marginLeft: `${(i - (gameState.hand.length - 1) / 2) * 120}px`,
                }}
              >
                {/* Card Background Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                  {card.type === CardType.ATTACK && <Swords className="w-40 h-40 rotate-12" />}
                  {card.type === CardType.DEFENSE && <Shield className="w-40 h-40 -rotate-12" />}
                  {card.type === CardType.HEAL && <Heart className="w-40 h-40" />}
                  {card.type === CardType.SPECIAL && <Zap className="w-40 h-40 rotate-45" />}
                </div>

                {/* Rarity Specific Effects */}
                {card.rarity === 'legendary' && (
                  <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 to-transparent pointer-events-none" />
                )}
                {card.rarity === 'epic' && (
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent pointer-events-none" />
                )}

                {card.rarity !== 'common' && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent w-1/2 -skew-x-12 animate-shine" />
                  </div>
                )}

                <div className="flex justify-between items-start relative z-10">
                  <div className="bg-black/40 px-2 py-1 rounded text-xs font-mono font-bold text-amber-400 border border-amber-500/30">
                    {card.cost}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest opacity-50 font-bold">
                    {card.type === CardType.ATTACK ? '攻击' : card.type === CardType.DEFENSE ? '防御' : card.type === CardType.HEAL ? '治疗' : '特殊'}
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
                  <div className={cn(
                    "p-3 rounded-full relative",
                    card.rarity === 'legendary' && "bg-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.4)]",
                    card.rarity === 'epic' && "bg-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.3)]",
                    card.rarity === 'rare' && "bg-blue-500/20",
                    card.rarity === 'common' && "bg-white/5"
                  )}>
                    {card.type === CardType.ATTACK && <Swords className="w-8 h-8 text-red-400" />}
                    {card.type === CardType.DEFENSE && <Shield className="w-8 h-8 text-blue-400" />}
                    {card.type === CardType.HEAL && <Heart className="w-8 h-8 text-green-400" />}
                    {card.type === CardType.SPECIAL && <Zap className="w-8 h-8 text-purple-400" />}
                  </div>
                  <h3 className="font-serif italic text-lg leading-tight">{card.name}</h3>
                </div>

                <p className="text-[11px] text-stone-400 text-center leading-tight min-h-[3em]">
                  {preparingCardId === card.id ? (
                    <span className="text-white font-bold animate-pulse block mt-2">释放中...</span>
                  ) : selectedCard?.id === card.id ? (
                    <span className="text-amber-400 font-bold animate-bounce block mt-2">再次点击出牌</span>
                  ) : (
                    card.description
                  )}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={endTurn}
            disabled={gameState.turn !== 'player' || gameState.isGameOver}
            className="px-12 py-3 rounded-full bg-stone-800 border border-white/10 font-bold uppercase tracking-widest text-sm hover:bg-stone-700 transition-all disabled:opacity-50 shadow-lg"
          >
            结束回合
          </button>
        </div>
      </div>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {gameState.isGameOver && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-panel p-12 max-w-md w-full text-center flex flex-col items-center gap-6"
            >
              {gameState.winner === 'player' ? (
                <>
                  <div className="w-24 h-24 bg-amber-500/20 rounded-full flex items-center justify-center mb-2">
                    <Trophy className="w-12 h-12 text-amber-500" />
                  </div>
                  <h2 className="text-4xl font-serif italic text-amber-400">胜利！</h2>
                  <p className="text-stone-400">虚空守卫已被击败。你的策略无懈可击。</p>
                </>
              ) : (
                <>
                  <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-2">
                    <Skull className="w-12 h-12 text-red-500" />
                  </div>
                  <h2 className="text-4xl font-serif italic text-red-400">战败</h2>
                  <p className="text-stone-400">你的灵魂已被虚空吞噬。祝你在下一世好运。</p>
                </>
              )}
              
              <button
                onClick={resetGame}
                className="mt-4 w-full py-4 bg-white text-black rounded-full font-bold uppercase tracking-widest hover:bg-stone-200 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" /> 再试一次
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <div className="fixed bottom-4 right-4 flex items-center gap-4 text-stone-600">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold">
          <Info className="w-3 h-3" />
          牌堆: {gameState.deck.length} | 弃牌堆: {gameState.discard.length}
        </div>
      </div>
    </div>
  );
};

export default App;
