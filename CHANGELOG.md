# Changelog

## [0.11.0] - 2026-02-16

### Added

- Expanded Tool Selection quizzes from 4 to 10 questions per family (36 new questions across 6 families)
- Expanded Deep Mastery quizzes from 13 to 25 questions per family (72 new questions across 6 families)
- Shuffle and random selection for Tool Selection quizzes (matches Deep Mastery pattern)
- 30+ new glossary terms covering GPU, networking, hardware, cluster, and firmware acronyms
- CPU, GPU count, HCA count, and storage rows to Architecture Comparison table

### Changed

- Architecture Comparison now shows all 4 DGX generations by default (A100, H100, H200, B200)
- Architecture Comparison columns ordered least-to-most powerful
- Cluster Overview section is now architecture-agnostic (generic SuperPOD layout)
- Network Fabric Architecture section is now architecture-agnostic (conceptual network planes)
- Passing threshold for Tool Selection quizzes changed from 75% to 80%
- ToolQuizCard displays updated question counts (10 for Tool Selection, 25 for Deep Mastery)

### Removed

- Redundant "Hardware Specifications (Per Node)" section (merged into Architecture Comparison)

## [0.10.0] - 2026-02-15

### Added

- `man` command for Linux/HPC tool manual pages
- Tool Selection and Deep Mastery quizzes in Recent Activity feed

### Fixed

- Man page box border alignment
- Man command scoped to Linux/HPC tools only
