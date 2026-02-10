# Linux Crash Course Design

## Overview

A minimal, optional learning path that teaches essential Linux terminal skills before users dive into NCP-AII domain content. Positioned as the 6th learning path (first in display order) within the existing Learn tab.

**Target audience:** NCP-AII candidates who range from terminal beginners to those needing a quick refresher on datacenter-relevant Linux concepts.

**Design principle:** Get users functional in the terminal fast (~25-30 minutes total), then let the 5 domain paths teach datacenter-specific commands in context.

## Structure

```
Linux Crash Course (Path)
├── Module 1: Getting Around
│   ├── Lesson 1: Filesystem Navigation (pwd, cd, ls)       ~6 min
│   └── Lesson 2: Reading Files (cat, head, tail, less)      ~6 min
├── Module 2: Working With Output
│   ├── Lesson 3: Pipes & Filtering (|, grep, wc, sort)     ~8 min
│   └── Lesson 4: Permissions & Ownership (ls -l, chmod)     ~5 min
```

**Total:** 4 lessons, ~25 min, 2 modules.

## Lesson Content

### Lesson 1: Filesystem Navigation (~6 min, 5 steps)

| #   | Type    | Content                                                                                                      |
| --- | ------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | concept | The Linux directory tree: `/`, `/home`, `/var/log`, `/etc`, `/dev`. Where datacenter config and logs live.   |
| 2   | concept | `pwd` — where am I? Typical DGX system paths.                                                                |
| 3   | observe | Example `ls -la /var/log` output. Introduces long listing format (permissions column explained in Lesson 4). |
| 4   | concept | `cd` — absolute vs relative paths, `..`, `~`, `-` to go back.                                                |
| 5   | quiz    | "A technician needs to check NVIDIA driver logs. Which path would they navigate to?" Answer: `/var/log`      |

### Lesson 2: Reading Files (~6 min, 5 steps)

| #   | Type    | Content                                                                                                  |
| --- | ------- | -------------------------------------------------------------------------------------------------------- |
| 1   | concept | `cat` — dump entire file. Good for short configs, bad for large logs.                                    |
| 2   | observe | Example `cat /etc/hostname` showing a DGX node hostname.                                                 |
| 3   | concept | `head` and `tail` — first/last N lines. `tail -f` for following live logs.                               |
| 4   | observe | Example `tail -20 /var/log/syslog` showing GPU-related kernel messages.                                  |
| 5   | quiz    | "You need to watch a log file in real-time as a GPU training job runs. Which command?" Answer: `tail -f` |

### Lesson 3: Pipes & Filtering (~8 min, 7 steps)

| #   | Type    | Content                                                                                      |
| --- | ------- | -------------------------------------------------------------------------------------------- |
| 1   | concept | The pipe `\|` operator — output of one command becomes input of the next.                    |
| 2   | command | `nvidia-smi \| grep GPU` — interactive, real simulated output.                               |
| 3   | concept | `grep` flags: `-i` (case-insensitive), `-c` (count), `-v` (invert).                          |
| 4   | command | `sinfo \| grep idle` — find available nodes.                                                 |
| 5   | concept | `wc -l` for counting, `sort` for ordering.                                                   |
| 6   | command | `squeue \| wc -l` — count running jobs.                                                      |
| 7   | quiz    | "How would you count the number of GPUs showing errors?" Answer: pipe to `grep` then `wc -l` |

### Lesson 4: Permissions & Ownership (~5 min, 4 steps)

| #   | Type    | Content                                                                                                                          |
| --- | ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | concept | Reading `ls -l` output: the `rwxr-xr-x` format, user/group/other.                                                                |
| 2   | observe | Example `ls -l /usr/bin/nvidia-smi` showing root ownership and execute permissions.                                              |
| 3   | concept | `chmod` (numeric and symbolic) and `chown`. When needed: running diagnostic scripts, fixing permission errors on shared storage. |
| 4   | quiz    | "A script at `/opt/scripts/gpu-check.sh` won't execute. Permissions show `-rw-r--r--`. What fixes this?" Answer: `chmod +x`      |

## Implementation

### Files to create

| File                                                    | Purpose                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------- |
| `src/utils/learningPaths/domains/linuxBasics.ts`        | Path, module, and lesson content (same pattern as domain1.ts-domain5.ts)  |
| `src/utils/learningPaths/__tests__/linuxBasics.test.ts` | Structure validation: all lessons have steps, required fields, unique IDs |

### Files to modify

| File                                | Change                                                                |
| ----------------------------------- | --------------------------------------------------------------------- |
| `src/utils/learningPaths/types.ts`  | Widen `domainId` type to accept `linux-basics`                        |
| `src/utils/learningPaths/engine.ts` | Import linux-basics path, insert at index 0 in `LEARNING_PATHS` array |

### Key decisions

- **examWeight: 0** — Does not affect readiness score calculations.
- **No prerequisites** — Anyone can start it. Domain paths do NOT require it.
- **No new simulators** — `ls`, `cd`, `cat`, `chmod` are not simulated as standalone commands.
- **No new step types** — Uses existing `concept`, `observe`, `command`, `quiz`.
- **No new UI** — Appears in existing Learn tab path list.
- **No spaced repetition** — Not integrated with review scheduling (not a command family).
- **Progress tracking** — Uses existing localStorage system with no changes.

### Interactive commands (Lesson 3)

The simulator already supports pipe filters via `src/utils/pipeHandler.ts`:

- `grep` (with `-i`, `-c`, `-v`)
- `head` / `tail` (with `-N`)
- `wc` (with `-l`, `-w`, `-c`)
- `sort` (with `-r`, `-n`)
- `uniq`, `cut`, `awk`

Lesson 3 command steps pipe real simulated output (nvidia-smi, sinfo, squeue) through these filters.

## Scope boundaries

- No new simulators for standalone Linux commands
- No new tab or navigation changes
- No exam weight contribution
- No prerequisite gating on domain paths
- No new step types
- No spaced repetition integration
