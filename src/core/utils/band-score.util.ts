/**
 * Utility functions for IELTS band score calculations
 */

/**
 * Round band score to nearest 0.5
 * e.g., 6.25 -> 6.5, 5.75 -> 6.0, 7.0 -> 7.0
 */
export function roundBandScore(score: number): number {
  return Math.round(score * 2) / 2;
}

/**
 * Calculate overall band score from component scores
 */
export function calculateOverallBand(
  listening: number,
  reading: number,
  writing: number,
  speaking: number,
): number {
  const avg = (listening + reading + writing + speaking) / 4;
  return roundBandScore(avg);
}

/**
 * Validate band score is within valid range (0-9)
 */
export function isValidBandScore(score: number): boolean {
  return score >= 0 && score <= 9 && Number.isFinite(score);
}

/**
 * Convert numeric score to band description
 */
export function getBandDescription(band: number): string {
  if (band >= 9) return 'Expert User';
  if (band >= 8) return 'Very Good User';
  if (band >= 7) return 'Good User';
  if (band >= 6) return 'Competent User';
  if (band >= 5) return 'Modest User';
  if (band >= 4) return 'Limited User';
  if (band >= 3) return 'Extremely Limited User';
  if (band >= 2) return 'Intermittent User';
  if (band >= 1) return 'Non User';
  return 'Did not attempt the test';
}