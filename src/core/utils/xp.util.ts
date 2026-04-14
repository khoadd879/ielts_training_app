/**
 * Utility functions for XP calculation and level progression
 */

import { Level } from '@prisma/client';

export const XP_PER_LEVEL = [
  0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500, 6600, 7800,
  9100, 10500, 12000, 13600, 15300, 17100, 19000,
];

export interface XpUpdateResult {
  xpForNextLevel: number;
  currentLevelXp: number;
  nextLevelXp: number;
}

/**
 * Calculate XP thresholds for next level
 */
export function calculateXpForNextLevel(currentXp: number): XpUpdateResult {
  const currentLevel = calculateLevelFromXp(currentXp);

  if (currentLevel >= XP_PER_LEVEL.length - 1) {
    return {
      xpForNextLevel: XP_PER_LEVEL[currentLevel],
      currentLevelXp: XP_PER_LEVEL[currentLevel],
      nextLevelXp: XP_PER_LEVEL[currentLevel],
    };
  }

  return {
    xpForNextLevel: XP_PER_LEVEL[currentLevel + 1],
    currentLevelXp: XP_PER_LEVEL[currentLevel],
    nextLevelXp: XP_PER_LEVEL[currentLevel + 1],
  };
}

/**
 * Calculate level from XP amount
 */
export function calculateLevelFromXp(xp: number): number {
  for (let i = XP_PER_LEVEL.length - 1; i >= 0; i--) {
    if (xp >= XP_PER_LEVEL[i]) {
      return i + 1;
    }
  }
  return 1;
}

/**
 * Calculate XP needed to reach a specific level
 */
export function xpToReachLevel(level: number): number {
  if (level <= 0) return 0;
  if (level >= XP_PER_LEVEL.length) return XP_PER_LEVEL[XP_PER_LEVEL.length - 1];
  return XP_PER_LEVEL[level - 1];
}

/**
 * Check if XP qualifies for level up
 */
export function shouldLevelUp(currentXp: number, newXp: number): boolean {
  const oldLevel = calculateLevelFromXp(currentXp);
  const newLevel = calculateLevelFromXp(newXp);
  return newLevel > oldLevel;
}

/**
 * Get XP required for next level (using Level enum-based system)
 */
export function updateXpToNext(level: Level): number {
  switch (level) {
    case Level.Low:
      return 100;
    case Level.Mid:
      return 350;
    case Level.High:
      return 1000;
    default:
      return 100;
  }
}