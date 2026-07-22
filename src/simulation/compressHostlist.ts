/**
 * Compress a list of hostnames into Slurm's hostlist notation, e.g.
 * ["dgx-00","dgx-01","dgx-02"] -> "dgx-[00-02]". Real Slurm groups nodes
 * that share a common alphabetic prefix and a fixed-width numeric suffix
 * into bracketed ranges (a contiguous run collapses to "start-end"; runs
 * within the same prefix that aren't contiguous join with commas inside
 * one bracket pair, e.g. "dgx-[00-03,05-06]"); a lone node in a prefix
 * group, and any hostname with no trailing numeric suffix, is left
 * unbracketed. Different prefixes become separate comma-joined segments.
 */
export function compressHostlist(nodeIds: string[]): string {
  if (nodeIds.length === 0) return "";

  const groups = new Map<
    string,
    { prefix: string; width: number; nums: number[] }
  >();
  const unmatched: string[] = [];

  for (const id of nodeIds) {
    const match = id.match(/^(.*?)(\d+)$/);
    if (!match) {
      unmatched.push(id);
      continue;
    }
    const [, prefix, digits] = match;
    const width = digits.length;
    const key = `${prefix} ${width}`;
    const entry = groups.get(key) ?? { prefix, width, nums: [] };
    entry.nums.push(parseInt(digits, 10));
    groups.set(key, entry);
  }

  const segments: string[] = [];
  for (const { prefix, width, nums } of groups.values()) {
    const sorted = [...new Set(nums)].sort((a, b) => a - b);

    if (sorted.length === 1) {
      segments.push(`${prefix}${String(sorted[0]).padStart(width, "0")}`);
      continue;
    }

    const ranges: string[] = [];
    let start = sorted[0];
    let prev = sorted[0];

    for (let i = 1; i <= sorted.length; i++) {
      const current = sorted[i];
      if (current === prev + 1) {
        prev = current;
        continue;
      }
      ranges.push(
        start === prev
          ? String(start).padStart(width, "0")
          : `${String(start).padStart(width, "0")}-${String(prev).padStart(width, "0")}`,
      );
      if (current !== undefined) {
        start = current;
        prev = current;
      }
    }

    segments.push(`${prefix}[${ranges.join(",")}]`);
  }

  return [...segments, ...unmatched].join(",");
}
