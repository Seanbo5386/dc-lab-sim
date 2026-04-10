# Realism Audit Findings Report

**Date:** 2026-04-10
**Auditor:** Claude (Automated Research Audit)
**Scope:** Full realism overhaul of DC Lab Simulator

---

## 1. Executive Summary

_To be completed after all phases are done._

---

## 2. Layer 1 — Hardware Specs & Version Compatibility

### 2.1 DGX-A100

#### [Critical] Memory bandwidth rounded, loses precision

- **File:** src/data/hardwareSpecs.ts:91
- **Current Value:** `memoryBandwidthTBs: 2.0`
- **Correct Value:** `2.039` (2,039 GB/s)
- **Source:** NVIDIA A100 80GB Datasheet
- **Impact:** Students may encounter the exact 2,039 GB/s number on the exam.

#### [High] NVLink per-link bandwidth inconsistency

- **File:** src/data/hardwareSpecs.ts:109-110
- **Current Value:** `perLinkBandwidthGBs: 25` with `totalBandwidthGBs: 600`
- **Correct Value:** Per-link should be `50` (bidirectional) to be consistent with total (12 x 50 = 600). Current: 12 x 25 = 300 ≠ 600.
- **Source:** NVLink 3.0 spec: 25 GB/s per direction, 50 GB/s bidirectional per link. NVIDIA convention uses bidirectional.
- **Impact:** Internal math inconsistency between per-link and total values.

#### [Medium] System memory 1024 GB is base config

- **File:** src/data/hardwareSpecs.ts:82
- **Current Value:** `systemMemoryGB: 1024`
- **Note:** Correct for standard/base configuration. Some vendors offer 2TB upgrades.

#### Verified Correct

GPU model, count, memory (80GB HBM2e, 81920 MiB), TDP (400W), FP16 (312 dense), TF32 (156 dense), FP64 (19.5), PCI ID (20B2), clocks (1095/1410/1215), SM count (108), arch (ga100), CC (8.0), BAR1 (131072), SXM4, NVLink 3.0 (12 links), NVSwitch count (6), NVSwitch gen ("2nd Gen" = NVSwitch 2.0), ConnectX-6 (8x HDR 200Gb/s), CPU (2x AMD EPYC 7742 64-core), storage (2x1.92TB + 4x3.84TB).

---

### 2.2 DGX-H100

#### [Critical] Base clock is PCIe value, not SXM5

- **File:** src/data/hardwareSpecs.ts:150
- **Current Value:** `baseClockMHz: 1095`
- **Correct Value:** `1590` (H100 SXM5)
- **Source:** TechPowerUp, CpuTronic H100 SXM5 specs

#### [Critical] Boost clock understated

- **File:** src/data/hardwareSpecs.ts:151
- **Current Value:** `boostClockMHz: 1830`
- **Correct Value:** `1980` (H100 SXM5 consensus across multiple sources)
- **Source:** TechPowerUp, CpuTronic, Axiom GPU Database

#### [High] NVSwitch generation "4th Gen" should be "3rd Gen"

- **File:** src/data/hardwareSpecs.ts:165
- **Current Value:** `nvSwitchGeneration: "4th Gen"`
- **Correct Value:** `"3rd Gen"` (NVSwitch 3.0). NVLink is v4.0 but NVSwitch chip is 3rd generation.
- **Source:** NVIDIA Developer Blog: "Third-Generation NVSwitch"

#### [Medium] Memory clock is effective rate, not base

- **File:** src/data/hardwareSpecs.ts:152
- **Current Value:** `memoryClockMHz: 2619`
- **Correct Value:** nvidia-smi reports `1593` MHz. 2619 is the effective data rate.
- **Source:** CpuTronic, technical.city

#### [Medium] HCA count 8 vs 10 total

- **File:** src/data/hardwareSpecs.ts:170
- **Current Value:** `hcaCount: 8`
- **Correct Value:** DGX H100 datasheet says "10x ConnectX-7 400Gb/s" (8 compute + 2 management/storage)
- **Source:** NVIDIA DGX H100 Datasheet

#### [Medium] FP16/TF32 are dense values — need annotation

- **File:** src/data/hardwareSpecs.ts:146-147
- **Current Value:** `fp16Tflops: 989, tf32Tflops: 495`
- **Note:** These are correct for dense (non-sparsity). NVIDIA marketing uses sparsity numbers (FP16: 1979, TF32: 989). Consider adding annotation.

#### Verified Correct

GPU model (H100-SXM5-80GB), count (8), memory (80GB HBM3, 3.35 TB/s), TDP (700W), FP64 (34), PCI ID (2330), SM count (132), arch (gh100), CC (9.0), BAR1 (131072), NVLink 4.0 (18 links, 900 GB/s total), NVSwitch count (4), NDR 400Gb/s, CPU (2x Xeon 8480C 56-core), 2048GB RAM, storage.

---

### 2.3 DGX-H200

#### [Critical] FP16 TFLOPS wrong (shifted by one row)

- **File:** src/data/hardwareSpecs.ts:199
- **Current Value:** `fp16Tflops: 989`
- **Correct Value:** `1979` (same as H100 — the 989 value is actually TF32)
- **Source:** NVIDIA H200 Datasheet

#### [Critical] TF32 TFLOPS wrong (shifted by one row)

- **File:** src/data/hardwareSpecs.ts:200
- **Current Value:** `tf32Tflops: 495`
- **Correct Value:** `989`
- **Source:** NVIDIA H200 Datasheet

#### [Critical] Base clock copied from H100 PCIe

- **File:** src/data/hardwareSpecs.ts:203
- **Current Value:** `baseClockMHz: 1095`
- **Correct Value:** `1590` (H200 SXM)
- **Source:** CpuTronic, VideoCardz

#### [Critical] Boost clock copied from H100

- **File:** src/data/hardwareSpecs.ts:204
- **Current Value:** `boostClockMHz: 1830`
- **Correct Value:** `1980`
- **Source:** CpuTronic, VideoCardz

#### [Critical] Memory clock wrong (HBM3 value used for HBM3e)

- **File:** src/data/hardwareSpecs.ts:205
- **Current Value:** `memoryClockMHz: 2619`
- **Correct Value:** `1313` (HBM3e effective rate differs from HBM3)
- **Source:** CpuTronic, RunPod

#### [High] HCA count wrong (8 vs 10)

- **File:** src/data/hardwareSpecs.ts:223
- **Current Value:** `hcaCount: 8`
- **Correct Value:** `10` (8 OSFP + 2 QSFP112)
- **Source:** NVIDIA DGX H200 Datasheet

#### [High] Inter-node bandwidth understated

- **File:** src/data/hardwareSpecs.ts:226
- **Current Value:** `interNodeBandwidthGBs: 50`
- **Correct Value:** Higher than H100 due to 10 NICs (DGX H200 has 1 TB/s bidirectional)
- **Source:** NVIDIA DGX H200 product page

**Systemic issue:** The H100 entry has the SAME FP16/TF32 errors — values are shifted by one row in the TFLOPS ladder for both Hopper GPUs.

#### Verified Correct

GPU model (H200-SXM-141GB), count (8), memory (141GB HBM3e, 144384 MiB, 4.8 TB/s), TDP (700W), FP64 (34), PCI ID (2335), SM (132), arch (gh100), CC (9.0), NVLink 4.0 (18 links, 900 GB/s), NVSwitch (4, "4th Gen"), ConnectX-7 NDR 400Gb/s, CPU (2x Xeon 8480C), 2048GB RAM.

---

### 2.4 DGX-B200

#### [Critical] GPU memory is 180GB, not 192GB (user-addressable vs die-level)

- **File:** src/data/hardwareSpecs.ts:247-248
- **Current Value:** `memoryGB: 192, memoryMiB: 196608`
- **Correct Value:** `memoryGB: 180, memoryMiB: 184320`
- **Source:** NVIDIA DGX B200 Datasheet ("1,440 GB total GPU memory" = 8 x 180)

#### [Critical] Total GPU memory wrong (follows from per-GPU error)

- **File:** src/data/hardwareSpecs.ts:242
- **Current Value:** `totalGpuMemoryGB: 1536`
- **Correct Value:** `1440` (8 x 180)

#### [Critical] GPU model name references 192GB

- **File:** src/data/hardwareSpecs.ts:245
- **Current Value:** `model: "NVIDIA B200-SXM-192GB"`
- **Correct Value:** `"NVIDIA B200-SXM-180GB"` or `"NVIDIA B200"`

#### [Critical] FP16 TFLOPS underestimated

- **File:** src/data/hardwareSpecs.ts:252
- **Current Value:** `fp16Tflops: 1800`
- **Correct Value:** `2250` (dense Tensor Core) or `4500` (sparse)
- **Source:** NVIDIA Blackwell B200 Datasheet

#### [Critical] TF32 TFLOPS underestimated

- **File:** src/data/hardwareSpecs.ts:253
- **Current Value:** `tf32Tflops: 900`
- **Correct Value:** `1200` (dense) or `2250` (sparse)

#### [Critical] SM count wrong (die count vs enabled count)

- **File:** src/data/hardwareSpecs.ts:259
- **Current Value:** `smCount: 192`
- **Correct Value:** `148` (74 per die x 2 dies enabled)
- **Source:** Chips and Cheese B200 analysis, NVIDIA Blackwell Tuning Guide

#### [High] SXM version wrong

- **File:** src/data/hardwareSpecs.ts:263
- **Current Value:** `sxmVersion: "SXM5"`
- **Correct Value:** `"SXM6"` (SXM5 is Hopper generation)
- **Source:** Lenovo HGX B200 Product Guide

#### [High] Architecture label non-standard

- **File:** src/data/hardwareSpecs.ts:260
- **Current Value:** `architecture: "gb100"`
- **Correct Value:** `"blackwell"` (nvidia-smi reports architecture name, not die name)

#### [High] FP64 TFLOPS slightly high

- **File:** src/data/hardwareSpecs.ts:254
- **Current Value:** `fp64Tflops: 45`
- **Correct Value:** `40` (most commonly cited official figure)

#### [Medium] Memory bandwidth should be 7.7 TB/s for 180GB SKU

- **File:** src/data/hardwareSpecs.ts:250
- **Current Value:** `memoryBandwidthTBs: 8.0`
- **Correct Value:** `7.7` (180GB variant shipped in DGX B200)

#### Verified Correct

GPU count (8), memory type (HBM3e), TDP (1000W), NVLink 5.0 (18 links, 50 GB/s/link, 1800 GB/s total), NVSwitch (2, "5th Gen"), ConnectX-7 NDR 400Gb/s (8 HCAs), CPU (2x Xeon 8570 56-core), 2048GB RAM, CC (10.0), storage.

---

### 2.5 DGX-GB200

#### [Critical] Entire system model is architecturally wrong

- **File:** src/data/hardwareSpecs.ts:289-340
- **Current Value:** Modeled as 8-GPU DGX box (like A100/H100)
- **Correct Value:** "DGX GB200 NVL72" is a full-rack liquid-cooled system with 72 B200 GPUs, 36 Grace CPUs, 18 NVSwitches. NOT a traditional DGX box.
- **Source:** NVIDIA DGX GB200 product page, GB200 NVL72 docs
- **Recommendation:** Either rename to "DGX-B200" and model the actual DGX B200 (8 GPU box), or rewrite specs for NVL72.

#### [Critical] Generation labeled "Blackwell Ultra" — GB200 is Blackwell

- **File:** src/data/hardwareSpecs.ts:292
- **Current Value:** `generation: "Blackwell Ultra"`
- **Correct Value:** `"Blackwell"` — "Blackwell Ultra" is B300/GB300

#### [Critical] GPU model "GB200" conflates superchip with GPU

- **File:** src/data/hardwareSpecs.ts:298
- **Current Value:** `model: "NVIDIA GB200-SXM-192GB"`
- **Correct Value:** GPU die is B200, not GB200. "GB200" = Grace Blackwell superchip (1 Grace CPU + 2 B200 GPUs)

#### [Critical] GPU count 8 is wrong for NVL72 (should be 72)

- **File:** src/data/hardwareSpecs.ts:299

#### [Critical] CPU sockets=2 misrepresents architecture

- **File:** src/data/hardwareSpecs.ts:293
- **Note:** NVL72 has 36 Grace CPUs across 18 compute trays, not a dual-socket server

#### [Critical] NVSwitch count=2 is wrong (NVL72 has 18)

- **File:** src/data/hardwareSpecs.ts:323

#### [High] SM count=192 is wrong (B200 has 148 enabled SMs)

- **File:** src/data/hardwareSpecs.ts:312

#### [High] SXM version "SXM5" wrong (B200 uses SXM6, NVL72 uses custom trays)

- **File:** src/data/hardwareSpecs.ts:316

#### [High] TDP 1200W is NVL72 variant (DGX B200 box is 1000W)

- **File:** src/data/hardwareSpecs.ts:304

#### [High] FP64=56 doesn't match any published spec

- **File:** src/data/hardwareSpecs.ts:307
- **Correct Value:** ~40 TFLOPS (non-tensor FP64)

#### [High] PCI Device ID "2950" unverified (B200 appears to be 2901)

- **File:** src/data/hardwareSpecs.ts:308

#### [High] Clock speeds (1380/2250/3200) appear fabricated

- **File:** src/data/hardwareSpecs.ts:309-311
- **Note:** B200 boost is ~975 MHz, memory ~2000 MHz. 2250 MHz boost is unrealistically high for a datacenter GPU.

---

### 2.6 DGX-VR200 (Rubin)

#### [Critical] "DGX-VR200" is not a real product

- **File:** src/data/hardwareSpecs.ts:342-344
- **Correct Value:** Official products are "DGX Vera Rubin NVL72" (72 GPU, Vera CPU) or "DGX Rubin NVL8" (8 GPU, Intel Xeon 6)
- **Source:** NVIDIA product pages for DGX Vera Rubin NVL72 and DGX Rubin NVL8

#### [Critical] CPU config contradicts official products

- **File:** src/data/hardwareSpecs.ts:346
- **Current Value:** Vera (Olympus) CPU, 1 socket, 88 cores
- **Correct Value:** The 8-GPU DGX Rubin NVL8 uses 2x Intel Xeon 6776P, NOT Vera. Vera CPUs only appear in NVL72.
- **Source:** Tom's Hardware: Intel Xeon 6 selected for DGX Rubin NVL8

#### [High] SM count wrong

- **File:** src/data/hardwareSpecs.ts:365
- **Current Value:** `smCount: 256`
- **Correct Value:** `224` (officially announced at GTC 2026)

#### [High] FP16 severely underestimated

- **File:** src/data/hardwareSpecs.ts:358
- **Current Value:** `fp16Tflops: 1800` (same as B200)
- **Correct Value:** ~8,000 TFLOPS (estimated from FP8 ~16,000)

#### [High] TDP likely underestimated

- **File:** src/data/hardwareSpecs.ts:357
- **Current Value:** `tdpWatts: 1500`
- **Correct Value:** ~1,800W (industry estimates)

#### [High] NVSwitch count wrong for NVL8

- **File:** src/data/hardwareSpecs.ts:376
- **Current Value:** `nvSwitchCount: 2`
- **Correct Value:** `4` (DGX Rubin NVL8)

#### [Medium] ConnectX-9 protocol "XDR2" doesn't exist

- **File:** src/data/hardwareSpecs.ts:383
- **Current Value:** `protocol: "XDR2", portRateGbs: 1600`
- **Correct Value:** `protocol: "XDR", portRateGbs: 800` (ConnectX-9 is 800Gb/s per port)
- **Source:** NVIDIA ConnectX-9 SuperNIC documentation

#### Verified Correct

GPU memory (288GB HBM4), memory bandwidth (22 TB/s), NVLink 6.0 total bandwidth (3600 GB/s), Vera 88 cores (correct for Vera, wrong CPU for NVL8).

---

### 2.7 Driver/CUDA/Kernel Version Compatibility

#### [High] Rubin driver 570.10.01 / CUDA 13.0 — wrong driver series

- **File:** src/utils/clusterFactory.ts:319
- **Current Value:** `driver: "570.10.01", cuda: "13.0"`
- **Correct Value:** CUDA 13.0 requires R580+ drivers. Driver 570.10.01 doesn't exist. R570 pairs with CUDA 12.8.
- **Source:** CUDA 13.0 Release Notes

#### [Medium] Blackwell Ultra driver 565.47.01 doesn't exist

- **File:** src/utils/clusterFactory.ts:318
- **Current Value:** `driver: "565.47.01", cuda: "12.8"`
- **Correct Value:** Real driver is 565.57.01. CUDA 12.8 pairs with R570 (e.g., 570.86.15).
- **Source:** NVIDIA Driver 565.57.01 Release Notes

#### [Low] Kernel version inconsistencies across files

- Various JSON files use `-88`, `-86`, `-50` variants vs canonical `5.15.0-91-generic`
- narrativeScenarios.json references fabricated version "535.154"

#### Verified Correct

Ampere (535.129.03/12.2), Hopper (550.54.15/12.4), Blackwell (560.35.03/12.6) all verified. Kernel 5.15.0-91-generic is a real Ubuntu 22.04 kernel.

---

### 2.8 Firmware Version Strings

#### [High] ConnectX-8 firmware wrong major version

- **File:** src/utils/clusterFactory.ts:192
- **Current Value:** `"32.41.1000"`
- **Correct Value:** CX-8 uses major version **40** (e.g., 40.48.1000)
- **Source:** NVIDIA ConnectX-8 firmware release notes

#### [High] BlueField device ID mt41692 is BF-3, wrong for DGX-A100

- **File:** src/utils/clusterFactory.ts:138
- **Current Value:** `mt41692` (BF-3) used for ALL system types
- **Correct Value:** DGX-A100 shipped with BF-2 (mt41686). BF-3 (mt41692) correct for H100+.

#### [High] BMC MAC OUI 00:0a:f7 belongs to Broadcom, not NVIDIA

- **File:** src/utils/clusterFactory.ts:298
- **Current Value:** `00:0a:f7`
- **Correct Value:** Should use Mellanox/NVIDIA OUI (e.g., b8:ce:f6, e4:1d:2d)
- **Source:** IEEE OUI database

#### [Medium] BlueField firmware/device ID mismatch

- **File:** src/utils/clusterFactory.ts:138-139
- **Note:** Device ID mt41692 is BF-3, but firmware 24.35.2000 is BF-2 format. BF-3 firmware uses 32.xx series.

#### [Medium] mellanoxSimulator uses fictitious device ID mt4119

- **File:** src/simulators/mellanoxSimulator.ts:38+
- **Note:** Help text and examples reference mt4119 which doesn't exist. Should use mt4123 (CX-6) or mt4129 (CX-7).

#### [Medium] Inconsistent device IDs across JSON data files

- Some files use mt4125 (CX-6 Dx), others mt4123 (CX-6 VPI), simulator uses mt4119 (fictitious)

#### [Medium] mlxup --online hardcodes CX-6 firmware regardless of system type

- **File:** src/simulators/mellanoxSimulator.ts:583-584

#### [Low] BMC firmware version "3.47.00" doesn't match DGX BMC format (should be 00.xx.xx)

#### Verified Correct

ConnectX-6 device ID (mt4123), ConnectX-7 device ID (mt4129), ConnectX-8 device ID (mt4131), CX-6 firmware (20.35.1012), CX-7 firmware (28.39.1002).

---

## 3. Layer 2 — Data File Accuracy

### 3.1 nvidia-smi Command Syntax

~280 nvidia-smi references audited across 5 data files. **1 code fix needed, 4 explanation enhancements recommended.**

#### [Medium] `pci.link` should be `pcie.link` in correct answer

- **File:** src/data/explanationGates.json:632
- **Current Value:** `nvidia-smi --query-gpu=pci.link.gen.current,pci.link.width.current --format=csv`
- **Correct Value:** `pcie.link.gen.current` and `pcie.link.width.current` (with the 'e')
- **Impact:** Wrong query field name in a correct-answer position.

#### [High] Distracter explanations don't clarify `-pm` vs `-pl` confusion

- **Files:** examQuestions.json:2641 (`-pm 300`), explanationGates.json:151 (`-pm 350`)
- **Issue:** `-pm` is persistence mode (0/1 only), not power limit. Distracters are correctly wrong, but explanations never clarify WHY they're wrong.
- **Fix:** Add to explanations: "-pm sets persistence mode (0/1), not power limit. Use -pl for power limits."

#### [High] Fabricated flags in distracters lack explanation

- **Files:** explanationGates.json:152 (`--tdp 350`), examQuestions.json:2638 (`--power-limit=300`)
- **Issue:** `--tdp` and `--power-limit` don't exist in nvidia-smi. Explanations should note these are invalid.

#### Verified Correct

All ~30 commands in correct-answer positions verified valid. All subcommands (nvlink, topo, mig, dmon, pmon), query fields, and flag syntax confirmed accurate.

---

### 3.2 dcgmi & ipmitool Command Syntax

#### [High] `dcgmi reset` is not a valid subcommand

- **File:** src/data/explanationGates.json:356
- **Current Value:** `dcgmi reset -g 0` (distracter)
- **Issue:** No `reset` subcommand in dcgmi. GPU reset is via `nvidia-smi --gpu-reset`.

#### [High] `dcgmi health -c` described as "configures watches" — it checks status

- **File:** src/data/narrativeScenarios.json:6356, 6820
- **Current Value:** Hints say "dcgmi health -c configures watches"
- **Correct Value:** `-c` = check health status. To configure watches: `dcgmi health -s <systems>`

#### [High] `dcgmi stats --enable` — long flag not documented

- **File:** src/data/narrativeScenarios.json:6089
- **Correct Value:** `dcgmi stats -e` (short flag)

#### [Medium] `dcgmi diag -r 4` marked correct but level 4 doesn't exist

- **File:** src/data/examQuestions.json:2961
- **Issue:** DCGM only supports `-r 1`, `-r 2`, `-r 3`. No level 4.

#### [Medium] Explanation says `--mode 2` is alternative to `-r 2`

- **File:** src/data/examQuestions.json:387
- **Correct Value:** Long form is `--run 2`, not `--mode 2`

#### [Low] `ipmitool power status` should be `ipmitool chassis power status`

- **Files:** narrativeScenarios.json:1136, examQuestions.json:3025

---

### 3.3 InfiniBand & Slurm Command Syntax

#### [High] `ibportstate -R` is invalid syntax (in correct answer)

- **File:** src/data/examQuestions.json:~1254
- **Current Value:** `ibportstate -R` marked as correct
- **Correct Value:** `ibportstate <lid> <port> reset` (positional args, no -R flag)

#### [Medium] `iblinkinfo -l` means `--load-cache`, not `--line`

- **File:** src/data/narrativeScenarios.json:~6607
- **Current Value:** `iblinkinfo -l` as expectedCommand
- **Correct Value:** `iblinkinfo --line` (no short form for --line)

#### [Medium] `mlxlink -d mlx5_0` should use MST device path

- **Files:** narrativeScenarios.json:~1900, ~2108, ~6954; explanationGates.json:~590
- **Current Value:** `mlxlink -d mlx5_0 -p 1 -c`
- **Correct Value:** `mlxlink -d /dev/mst/mt4123_pciconf0 -p 1 -c`

#### [Low] `ibdiagnet --pc` description inconsistency

- ibdiagnet.json says "Reset port counters" but it actually "Collects port counters"

#### Verified Correct

All Slurm commands (sinfo, squeue, scontrol, sacct, sbatch, scancel) verified. All state names correct. perfquery -x, ibstat -s, ibdiagnet flags all valid. All distracter wrong answers correctly marked.

---

### 3.4 XID Error Code Accuracy

28 XID codes audited against official NVIDIA XID documentation. **5 High, 4 Medium, 2 Low issues.**

#### [High] XID 54: Entirely wrong — described as "Hardware Watchdog Timeout"

- **File:** src/data/xidErrors.ts:193-208
- **Correct Value:** XID 54 = "Auxiliary power connector not connected" (power cable unplugged)
- **Impact:** Entire description, name, cause, and remediation are wrong. Also breaks the thermal cascade quiz scenario (t3-thermal-cascade) which uses 43→54→79.

#### [High] XID 43: Wrong severity and category

- **File:** src/data/xidErrors.ts:143-144
- **Current:** severity='Critical', category='Hardware'
- **Correct:** severity='Warning', category='Application'. GPU remains healthy; this is a user application fault.

#### [High] XID 62: Wrong — described as informational "Spurious Host Interrupt"

- **File:** src/data/xidErrors.ts:242-255
- **Correct:** "PMU Halt Error" — Critical severity, requires full power cycle. NOT informational.

#### [High] XID 63: Inverted — describes failure but means success

- **File:** src/data/xidErrors.ts:257-271
- **Current:** "Row Remapping Failure"
- **Correct:** XID 63 = successful row remapping/page retirement. XID 64 is the failure case.

#### [Medium] XID 64: Wrong description ("threshold exceeded")

- **Correct:** Failure to record row-remapping entry. Requires immediate reboot.

#### [Medium] XID 72: Wrong name ("NVLink Flow Control Error")

- **Correct:** "ROBUST_CHANNEL_CE5_ERROR" — Copy Engine error, not NVLink.

#### [Medium] XID 76: Wrong name ("NVLink Training Error")

- **Correct:** "ROBUST_CHANNEL_CE7_ERROR" — Copy Engine error, not NVLink.

#### [Low] XID 56: Deprecated/unused in modern GPUs

#### [Low] XID 94: Severity should be Informational, not Warning

#### Verified Correct

XIDs 13, 23, 24, 27, 31, 32, 38, 45, 48, 57, 68, 69, 74, 77, 78, 79, 92, 95, 119 — all acceptable or correct.

---

### 3.5 Quiz, Scenario & Mastery Questions

~65 quiz questions, 32 scenarios, ~100 mastery questions audited.

#### [Medium] `head -f` as quiz distracter (nonexistent flag)

- **File:** src/data/narrativeScenarios.json:148
- **Issue:** `head` has no `-f` flag. Better distracter: `head -n 50 /var/log/syslog`

#### [Medium] `gpu-burn -d 300` marked wrong but is valid

- **File:** src/data/toolMasteryQuestions.ts:2838-2843
- **Issue:** `-d` = double-precision mode, not invalid. Both `gpu-burn 300` and `gpu-burn -d 300` run 5 minutes.

#### [Medium] nvidia-smi `--pm`/`--mig` double-dash vs canonical single-dash

- **File:** src/data/toolMasteryQuestions.ts:39, 107
- **Issue:** Correct answers use `--pm 1` and `--mig 1` but canonical form is `-pm 1` and `-mig 1`

#### [Low] Hardcoded GPU models in validation patterns

- **Files:** narrativeScenarios.json:~464 ("H100|GPU"), ~1195 ("A100|GPU")
- **Issue:** Patterns should use template variables or just "GPU"

#### Verified Correct

All quiz correct answers verified accurate. Tool descriptions correct. Troubleshooting flows realistic. Output interpretation questions use realistic formats. Best practices are sound.

---

## 4. Layer 3 — Simulator Output Formats

### 4.1 nvidia-smi Simulator

#### [High] Temperature thresholds incorrect for all GPU models

- **File:** src/simulators/nvidiaSmiFormatters.ts:61-62
- **Current:** Shutdown=90°C, Slowdown=85°C, Max Op=83°C (hardcoded for all models)
- **Correct (A100 SXM):** Shutdown=92°C, Slowdown=89°C, Max Op=85°C
- **Impact:** Every GPU model has different thermal limits. These should come from hardwareSpecs.ts.

#### [High] ECC column shows "N/A" instead of "0" when no errors

- **File:** src/simulators/nvidiaSmiSimulator.ts:1363-1366
- **Correct:** Datacenter GPUs always support ECC. Zero errors = "0", not "N/A" (N/A means ECC unsupported)

#### [Medium] `topo -m` missing legend block

- **File:** src/simulators/nvidiaSmiSimulator.ts:1129-1141
- **Correct:** Real nvidia-smi topo -m always prints a legend after the matrix explaining NV#, SYS, PHB, etc.

#### [Medium] Performance state column hardcoded to "P0" in default table

- **File:** src/simulators/nvidiaSmiSimulator.ts:1390
- **Correct:** Should vary with utilization (P0=active, P2=moderate, P8=idle)

#### [Medium] pmon uses "MB" units, should be "MiB"

- **File:** src/simulators/nvidiaSmiSimulator.ts:1038

#### [Medium] `-q` reserved memory hardcoded 625 MiB vs 2% formula in formatter

- **Files:** nvidiaSmiSimulator.ts:1524 vs nvidiaSmiFormatters.ts:11
- **Impact:** Same GPU shows different reserved memory values from `-q` vs `-d MEMORY`

#### [Medium] `-q` ECC section: SRAM and DRAM use same error counters

- **File:** src/simulators/nvidiaSmiSimulator.ts:1549-1557
- **Correct:** SRAM and DRAM are independent counters

#### [Medium] Memory temperature sign is inverted between `-q` and `-d TEMPERATURE`

- **File:** nvidiaSmiSimulator.ts:1565 (`-5`) vs nvidiaSmiFormatters.ts:66 (`+5`)
- **Correct:** HBM memory is warmer than GPU die, so `+5` is correct (formatter is right)

#### [Low] Timestamp uses ISO 8601 in `-q` output, should match nvidia-smi format

- **File:** src/simulators/nvidiaSmiSimulator.ts:1455

#### [Low] dmon mtemp column shows "-" (should show actual temp for A100+)

### 4.2 dcgmi/Slurm/IB Simulators

_Pending re-audit (agent hit rate limit)..._

---

## 5. Layer 4 — Benchmark & Performance Scaling

#### [High] NCCL burn-in bandwidth hardcoded 280-300 GB/s regardless of system type

- **File:** src/simulators/benchmarkSimulator.ts:673
- **Correct:** Should vary: A100~240 GB/s, H100~380 GB/s, B200~760 GB/s, VR200~1520 GB/s
- **Impact:** H100 showing 280-300 GB/s is significantly low; B200/VR200 are wildly wrong

#### [High] HPL burn-in TFLOPS hardcoded 450-500 regardless of system type

- **File:** src/simulators/benchmarkSimulator.ts:399
- **Correct:** A100~130-140 TFLOPS, H100~230-245 TFLOPS, B200~306-324 TFLOPS
- **Impact:** 450-500 TFLOPS is impossibly high for A100 (3x theoretical peak)

#### [Medium] NCCL single-node efficiency factor too aggressive (0.8)

- **File:** src/simulators/benchmarkSimulator.ts:1015
- **Correct:** Real NCCL achieves 85-95% NVLink efficiency at large messages. Use 0.88-0.92.

#### [Medium] gpu-burn output format doesn't match real tool

- **File:** src/simulators/benchmarkSimulator.ts:766-828
- **Real format:** `GPU 0: 93% proc'd: 4096 (8192) - 26251.1 Gflop/s - temp: 74C`
- **Current:** Shows progress bar and per-GPU pass/fail — entirely different format

#### [Low] gpu-burn doesn't report GFLOPS per GPU

- Real gpu-burn's primary output IS the GFLOPS measurement. A100~19,000, H100~30,000+ Gflop/s.

#### Verified Correct

ib_write_bw/ib_read_bw bandwidth calculations (97%/95% efficiency factors), InfiniBand per-port throughput for HDR/NDR/XDR.

---

## 6. Layer 5 — Topology & Fault Systems

### 6.1 NVLink Topology (dgxLayouts.ts)

#### [Medium] DGX H100 NVSwitch connectivity model shows partitioned fabric

- **File:** src/data/dgxLayouts.ts:119-124
- **Current:** SW0=[0,1,6,7], SW1=[0,1,2,3], SW2=[2,3,4,5], SW3=[4,5,6,7] — appears ring-like
- **Correct:** All 4 NVSwitches connect to all 8 GPUs for true full-mesh (same as A100). All 28 GPU pairs should show NV18 in nvidia-smi topo -m.

#### [Low] DGX B200 NVSwitch count may be 4, not 2

- **File:** src/data/dgxLayouts.ts (and hardwareSpecs.ts)
- **Note:** 2 NVSwitches is internally consistent but may be wrong (published specs suggest 4)

#### Verified Correct

A100 topology (6 NVSwitch, full mesh, 28 pairs), H200 reuses H100 layout (correct — same baseboard), all GPU counts (8 per system).

### 6.2 Fault Propagation (faultPropagationRules.ts)

#### [Medium] XID 79 description says "bus reset" — misleading

- **File:** src/data/faultPropagationRules.ts:73
- **Note:** XID 79 = GPU fallen off bus (gone), not reset. Description should say "GPU unreachable on PCIe"

#### [Low] Incident template: IB link down uses nvlink-failure fault type

- **File:** src/data/incidentTemplates.ts:353
- **Correct:** Should use IB-specific fault type, not nvlink-failure

#### Verified Correct

XID 43 timing (5→10→15s), XID 48 timing (2→8→12s), thermal cascade timing (10→20→45s), NVLink failure timing (5→15s), power anomaly timing (5→15→30s), IB bandwidth calculations (97%/95% efficiency).

---

## 7. Layer 6 — Cluster Factory & Cross-System Consistency

_Pending re-audit (agent hit rate limit)..._

---

## 8. Cross-System Consistency Findings

_Pending re-audit (agent hit rate limit)..._

---

## 9. Appendix: Verification Sources

### DGX-A100

- NVIDIA DGX A100 Datasheet
- NVIDIA A100 80GB Datasheet
- NVIDIA A100 Tensor Core GPU Datasheet
- DGX A100 User Guide

### DGX-H100

- NVIDIA DGX H100 Datasheet
- NVIDIA H100 GPU Datasheet
- TechPowerUp H100 SXM5 Specs
- NVIDIA Developer Blog: Third-Generation NVSwitch

### DGX-H200

- NVIDIA H200 Tensor Core GPU Datasheet
- NVIDIA DGX H200 Datasheet
- CpuTronic H200 SXM Specs

### DGX-B200

- NVIDIA DGX B200 Datasheet
- NVIDIA Blackwell Tuning Guide
- Lenovo HGX B200 Product Guide
- Chips and Cheese B200 Analysis

### DGX-GB200

- NVIDIA DGX GB200 Product Page
- NVIDIA GB200 NVL72 Docs
- NVIDIA DGX GB Rack Scale User Guide

### DGX-VR200

- NVIDIA DGX Vera Rubin NVL72 Product Page
- NVIDIA DGX Rubin NVL8 Product Page
- NVIDIA Technical Blog: Inside the Vera Rubin Platform
- NVIDIA ConnectX-9 SuperNIC Documentation

### Driver/CUDA

- NVIDIA CUDA Toolkit Release Notes (12.2, 12.4, 12.6, 12.8, 13.0)
- NVIDIA Data Center GPU Driver Release Notes (535, 550, 560, 565)

### Firmware

- NVIDIA ConnectX-6/7/8 Firmware Release Notes
- NVIDIA BlueField-2/3 Firmware Release Notes
- IEEE OUI Database
