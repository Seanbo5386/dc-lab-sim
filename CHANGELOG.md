# Changelog

## [1.6.2] - 2026-11-21

### Fixed

- Review Mistakes no longer freezes on a loading screen: it now shows the questions you most recently got wrong, or tells you there is nothing to review yet
- Timed exams submit themselves when the clock reaches zero, and leaving an exam with answers asks first
- Weak Area Focus now uses your own exam history to pick the domains where you score below 70%
- Exam attempts are now timestamped, and history merged from another device through cloud sync is kept in the order the exams were taken
- Dialogs no longer pull keyboard focus back to their first button while the simulation is running
- The step-complete message in missions no longer claims to move to the next step by itself

### Removed

- The Exam Gauntlet has been removed for now: it could not be completed and recorded failed attempts

Releases 1.1.0 through 1.6.1 are documented in the in-app changelog (About tab).

## [1.0.0] - 2026-02-17

### Official Release

- 20 command simulators with 229 CLI definitions across 17 categories
- 32 story-driven scenarios with sandbox isolation and auto-fault injection
- 199 exam questions, 60 tool selection quizzes, and 150 deep mastery quizzes
- Multi-architecture support: DGX A100, H100, H200, and B200
- Guided spotlight tours for all 5 tabs
- InfiniBand fabric topology with interactive hover highlights
- Alphabetized glossary with 78 searchable terms
- Accurate README and OpenGraph metadata
- 3,200+ unit tests with full CI/CD pipeline

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
