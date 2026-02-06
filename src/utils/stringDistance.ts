/**
 * Calculate Levenshtein distance between two strings.
 * Lower distance = more similar.
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find similar strings from a list based on Levenshtein distance.
 *
 * @param input - The input string to match
 * @param candidates - List of valid candidates
 * @param maxDistance - Maximum edit distance to consider (default: 3)
 * @returns Sorted array of similar candidates (closest first), max 3
 */
export function findSimilarStrings(
  input: string,
  candidates: string[],
  maxDistance = 3,
): string[] {
  const adjustedMaxDistance = Math.min(
    maxDistance,
    Math.max(2, Math.floor(input.length / 2)),
  );

  return candidates
    .map((candidate) => ({
      candidate,
      distance: levenshteinDistance(
        input.toLowerCase(),
        candidate.toLowerCase(),
      ),
    }))
    .filter(({ distance }) => distance <= adjustedMaxDistance && distance > 0)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map(({ candidate }) => candidate);
}
