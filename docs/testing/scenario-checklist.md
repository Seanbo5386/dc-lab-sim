# Scenario Testing Checklist

Validation checklist for lab scenarios to ensure realistic behavior and educational value.

## Pre-Test Setup
- [ ] Clear browser cache/localStorage
- [ ] Reset simulation state
- [ ] Dev server running
- [ ] Browser console open for errors

---

## Fault Injection Verification

### XID Errors
| XID | Expected Behavior |
|-----|-------------------|
| XID 79 | GPU NOT in `nvidia-smi`, reset FAILS |
| Other XIDs | GPU visible but unhealthy |

### Thermal Issues
| Condition | Expected Behavior |
|-----------|-------------------|
| >85°C | Throttling shown, clocks reduced |
| >95°C | Critical alerts triggered |

### ECC Errors
| Type | Expected Behavior |
|------|-------------------|
| Single-bit | Corrected counter increases |
| Double-bit | Uncorrectable counter, alerts |

### NVLink/PCIe
| Issue | Expected Behavior |
|-------|-------------------|
| NVLink down | "Down" in `nvidia-smi nvlink -s` |
| PCIe error | Degraded link speed in `lspci` |

---

## Command Validation

### Syntax
- [ ] Invalid flags rejected with helpful error
- [ ] Missing parameters show usage
- [ ] Valid flag variations accepted

### State Dependencies
- [ ] MIG commands require MIG enabled
- [ ] Container commands require runtime
- [ ] Lustre commands require mount

---

## Step Progression

### Validation Rules
- [ ] Output matters, not just command
- [ ] Multiple valid approaches accepted
- [ ] Failed attempts give feedback
- [ ] `requireAllCommands` blocks until all run

### Hints System
- [ ] Initial hints are generic
- [ ] Later hints more specific
- [ ] Hints match current state

---

## Realistic Behavior

### Hardware Constraints
- [ ] Can't query GPUs off bus
- [ ] Can't reset with critical failures
- [ ] Thermal throttling affects performance

### Software Dependencies
- [ ] Driver required for GPU commands
- [ ] DCGM daemon for DCGM commands
- [ ] Slurm config for job submission

---

## Error Messages
- [ ] Match real hardware messages
- [ ] Error codes correct (XID numbers)
- [ ] Suggest appropriate resolution
- [ ] Educational value

---

## Quick Verification Commands

```bash
# Basic GPU
nvidia-smi
nvidia-smi -q

# Error checking
dmesg | grep -i xid
dmesg | grep -i error

# Diagnostics
dcgmi diag -r 3
dcgmi discovery -l

# System
lspci | grep NVIDIA
lsmod | grep nvidia

# Fault scenarios
nvidia-smi --gpu-reset -i <gpu_id>
```

---

## Sign-Off Checklist
- [ ] All learning objectives achievable
- [ ] No way to "cheat" scenario
- [ ] Failure states educational
- [ ] Commands match documentation
- [ ] Progress saved correctly