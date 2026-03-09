# README Cluster Animation Design

**Date:** 2026-03-08
**Status:** Approved
**File:** `docs/cluster-animation.svg`

## Goal

Replace the static GIF hero image in README.md with an animated SVG showing an 8-node DGX SuperPOD cluster dashboard where one GPU subtly degrades from healthy to faulted. Captivates datacenter-experienced visitors with realistic monitoring aesthetics.

## Approach

Pure SVG with embedded CSS `@keyframes` animations. No JavaScript (stripped by GitHub's SVG sanitizer). Single self-contained file, ~20-30KB, vector-crisp at any size.

## Layout

- **Canvas:** ~960x420px, dark background (#0D1117), rounded corners
- **Status bar:** Top strip — cluster name, node/GPU counts, health indicator
- **Node cards:** 4x2 grid, dark gray (#161B22) with subtle border (#30363D), monospace labels
- **GPU indicators:** 8 small squares per node, NVIDIA green (#76B900) when healthy
- **Per-node info:** Hostname, average temp, status text

## Animation Timeline (15s loop)

| Phase | Time | Description |
|-------|------|-------------|
| Healthy steady-state | 0s-4s | All 64 GPUs pulse green. Status: "HEALTHY" |
| Degradation | 4s-7s | dgx-03 GPU 3 goes green to amber. Temp 47C to 85C. ECC: 8 fades in |
| Fault detected | 7s-10s | GPU 3 turns red. XID 63 badge appears. Status: "DEGRADED" (amber). Card border goes amber |
| Hold and reset | 10s-13s hold, 13s-15s cross-fade reset to Phase 1 |

## Color Palette

| Element | Color |
|---------|-------|
| Background | #0D1117 |
| Node card fill | #161B22 |
| Node card border | #30363D |
| GPU healthy | #76B900 (NVIDIA green) |
| GPU degraded | #D4A017 (amber) |
| GPU fault | #E5534B (red) |
| Status healthy | #76B900 |
| Status degraded | #D4A017 |
| Label text | #8B949E |
| Hostname text | #C9D1D9 |
| Font | Consolas, monospace |

## Visual Details

- Healthy GPU dots: subtle opacity pulse (0.85 to 1.0, 2s cycle, staggered per node)
- dgx-03 card gets faint amber glow via SVG filter during fault phase
- Temperature/ECC "counter" effect: cross-fade between stacked labels at keyframe moments
- ECC and XID labels use smaller font, positioned below GPU dots

## Technical Constraints

- No `<script>`, `<foreignObject>`, or external references (GitHub strips them)
- CSS @keyframes and animation properties work on GitHub
- SVG `<filter>` for subtle glow effects — supported
- Embedded font-family fallback: Consolas, monospace

## README Integration

```markdown
![DGX SuperPOD Cluster Dashboard](docs/cluster-animation.svg)
```

Replaces current `demo-optimized.gif` reference. GIF retained as fallback.

## Decisions

- 8-node full grid over single-node deep-dive (shows cluster scale)
- Dark terminal aesthetic matching app theme (not blueprint or modern SaaS)
- Subtle/realistic fault animation over dramatic pulsing (authentic monitoring feel)
- Pure SVG+CSS over GIF/APNG (vector-crisp, 20KB vs 503KB, trivially editable)
- 15s loop with 4 phases (tightened from initial 20s)
