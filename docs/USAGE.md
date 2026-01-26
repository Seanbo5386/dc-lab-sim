# Usage Guide - NVIDIA AI Infrastructure Simulator

## Table of Contents
1. [First Steps](#first-steps)
2. [Terminal Commands](#terminal-commands)
3. [MIG Configuration Walkthrough](#mig-configuration-walkthrough)
4. [Troubleshooting Scenarios](#troubleshooting-scenarios)
5. [Tips & Best Practices](#tips--best-practices)

## First Steps

### 1. Understanding the Interface

When you first open the simulator, you'll see:

- **Dashboard Tab**: Real-time cluster overview
  - Cluster health summary
  - Node selector
  - GPU status cards with metrics
  - Node details panel

- **Terminal Tab**: Command-line interface
  - Simulated bash shell
  - Full command history
  - Color-coded output

- **Labs & Scenarios Tab**: Guided exercises
  - Organized by exam domain
  - Step-by-step instructions
  - Practice scenarios

- **Documentation Tab**: Reference materials
  - Quick start guide
  - XID error reference
  - Common commands

### 2. Selecting a Node

The simulator starts with an 8-node DGX A100 cluster. To work on a specific node:

1. Go to the **Dashboard** tab
2. Click on a node button (dgx-00 through dgx-07)
3. The terminal automatically switches to that node
4. GPU metrics update to show the selected node's hardware

### 3. Your First Commands

Open the **Terminal** tab and try these commands to get familiar:

```bash
# See what's available
help

# Check GPU status
nvidia-smi

# Get detailed info on GPU 0
nvidia-smi -q -i 0

# Check system sensors
ipmitool sensor list

# View InfiniBand status
ibstat
```

## Terminal Commands

### GPU Management with nvidia-smi

#### Basic Status
```bash
# Show all GPUs
nvidia-smi

# Show specific GPU
nvidia-smi -i 0

# Detailed query
nvidia-smi -q

# Query specific GPU
nvidia-smi -q -i 0
```

#### NVLink Information
```bash
# Check NVLink status
nvidia-smi nvlink --status

# Show topology matrix
nvidia-smi topo -m
```

#### Power Management
```bash
# Set power limit to 350W on GPU 0
nvidia-smi -i 0 -pl 350

# Enable persistence mode
nvidia-smi -i 0 -pm 1
```

### DCGM Operations

#### Discovery and Health
```bash
# Discover GPUs
dcgmi discovery -l

# Check health
dcgmi health --check
```

#### Diagnostics
```bash
# Quick diagnostic (2 seconds)
dcgmi diag --mode 1

# Medium diagnostic (10 seconds)
dcgmi diag --mode 2

# Long diagnostic (30 seconds) - stress test
dcgmi diag --mode 3
```

#### Group Management
```bash
# Create a GPU group
dcgmi group -c training-gpus

# List groups
dcgmi group -l
```

### BMC Management with ipmitool

#### Sensor Monitoring
```bash
# List all sensors
ipmitool sensor list

# Show SDR (Sensor Data Repository)
ipmitool sdr list
```

#### System Information
```bash
# BMC firmware info
ipmitool mc info

# Chassis status
ipmitool chassis status

# Power status
ipmitool chassis power status

# FRU (Field Replaceable Unit) info
ipmitool fru print
```

#### Network Configuration
```bash
# Show BMC LAN config
ipmitool lan print 1
```

#### User Management
```bash
# List BMC users
ipmitool user list 1
```

### InfiniBand Tools

#### Port Status
```bash
# Show HCA and port information
ibstat

# Show port state
ibportstate
```

#### Error Monitoring
```bash
# Check error counters (critical for troubleshooting)
ibporterrors

# Performance counters
perfquery
```

#### Fabric Discovery
```bash
# Show fabric links
iblinkinfo

# Verbose output with errors
iblinkinfo -v

# Full fabric diagnostic
ibdiagnet
```

## MIG Configuration Walkthrough

Multi-Instance GPU (MIG) allows you to partition A100/H100 GPUs into smaller instances. Here's a complete workflow:

### Step 1: Check Current Status
```bash
# Check if MIG is enabled
nvidia-smi

# Look for "MIG M." column - should show "Disabled" initially
```

### Step 2: Enable MIG Mode
```bash
# Enable MIG on GPU 0
nvidia-smi -i 0 -mig 1

# You'll see a message about GPU reset being required
# The simulator handles this automatically
```

### Step 3: List Available Profiles
```bash
# Show what MIG profiles are available
nvidia-smi mig -lgip

# You'll see profiles like:
# - MIG 1g.5gb (7 instances max)
# - MIG 2g.10gb (3 instances max)
# - MIG 3g.20gb (2 instances max)
# - MIG 7g.40gb (1 instance max)
```

### Step 4: Create GPU Instances
```bash
# Create three 1g.5gb instances on GPU 0
nvidia-smi mig -i 0 -cgi 19,19,19 -C

# The -C flag also creates compute instances
# Profile ID 19 = 1g.5gb
```

### Step 5: Verify Instances
```bash
# List GPU instances
nvidia-smi mig -lgi

# List devices (you'll see MIG-GPU-0/0, MIG-GPU-0/1, etc.)
nvidia-smi -L
```

### Step 6: Clean Up
```bash
# Destroy all instances
nvidia-smi mig -i 0 -dgi

# Disable MIG mode
nvidia-smi -i 0 -mig 0

# Verify back to normal
nvidia-smi
```

### Common MIG Profile IDs
- **19**: 1g.5gb (4.75 GB, 14 SMs) - Max 7 instances
- **20**: 1g.10gb (9.62 GB, 14 SMs) - Max 4 instances
- **14**: 2g.10gb (9.62 GB, 28 SMs) - Max 3 instances
- **9**: 3g.20gb (19.50 GB, 42 SMs) - Max 2 instances
- **5**: 4g.20gb (19.50 GB, 56 SMs) - Max 1 instance
- **0**: 7g.40gb (39.25 GB, 98 SMs) - Max 1 instance (full GPU)

## Troubleshooting Scenarios

### Scenario 1: High GPU Temperature

**Problem**: GPU temperature is above 80°C

**Investigation**:
```bash
# Check current temperature and power
nvidia-smi -q -i 0 -d TEMPERATURE,POWER

# Check BMC cooling sensors
ipmitool sensor list | grep -i fan
ipmitool sensor list | grep -i temp

# Look for thermal throttling
nvidia-smi -q -i 0 -d CLOCK | grep "Throttle"
```

**Resolution**:
- Verify fan speeds are adequate
- Check inlet/exhaust temperatures
- Reduce power limit if needed: `nvidia-smi -i 0 -pl 300`

### Scenario 2: ECC Errors

**Problem**: GPU showing ECC errors

**Investigation**:
```bash
# Check ECC error counts
nvidia-smi -q -i 0 -d ECC

# Run DCGM diagnostic
dcgmi diag --mode 2 -r 0

# Check for XID errors in detailed query
nvidia-smi -q -i 0
```

**What to look for**:
- **Single-bit errors**: Usually correctable, monitor for trends
- **Double-bit errors**: Critical - GPU replacement needed if persistent
- **XID 48**: Double-bit ECC error - serious hardware issue

### Scenario 3: InfiniBand Link Errors

**Problem**: Degraded network performance

**Investigation**:
```bash
# Check port status
ibstat

# Look at error counters
ibporterrors

# Check link information
iblinkinfo -v

# Performance counters
perfquery
```

**Key error counters**:
- **SymbolErrors > 0**: Bad cable or transceiver
- **LinkDowned > expected**: Flapping link
- **PortRcvErrors**: Physical layer issues
- **PortXmitWait high**: Congestion

**Resolution**:
- Identify the problematic port
- Check cable seating
- Verify cable type matches requirements
- Replace cable if errors persist

### Scenario 4: NVLink Degradation

**Problem**: Slow multi-GPU communication

**Investigation**:
```bash
# Check NVLink status
nvidia-smi nvlink --status

# Look for:
# - Links showing "Down" instead of "Active"
# - Error counters (TX/RX errors)

# Check topology
nvidia-smi topo -m

# Should show NV12 or NV6 between GPUs
```

**Resolution**:
- Reset GPU if link is down: `nvidia-smi --gpu-reset -i 0`
- Check for XID 74 (NVLink error)
- Verify GPU seating in chassis

## Tips & Best Practices

### Effective Use of the Simulator

1. **Start with the Dashboard**: Get a visual overview before diving into commands
2. **Use Command History**: Press ↑/↓ to recall previous commands
3. **Practice Incrementally**: Master one tool at a time
4. **Save Your Progress**: Use Export to save interesting cluster configurations
5. **Read the Output**: The simulator produces realistic output - practice reading it

### Exam Preparation Strategy

1. **Know the Domain Weights**:
   - Focus most on Cluster Test (33%) and Systems Bring-Up (31%)
   - Don't neglect smaller domains - they still matter

2. **Command Fluency**:
   - Memorize common nvidia-smi flags
   - Know ipmitool sensor commands
   - Understand InfiniBand error counters

3. **Troubleshooting Process**:
   - Always start with health checks
   - Check logs and error counters
   - Verify configuration settings
   - Test incrementally

4. **MIG Mastery**:
   - Understand profile IDs and memory allocation
   - Practice the full workflow multiple times
   - Know when to use MIG vs. full GPUs

### Common Pitfalls to Avoid

1. **Not checking current state first**: Always run status commands before making changes
2. **Ignoring warnings**: Warning messages often indicate real issues
3. **Forgetting to verify**: After configuration changes, verify they took effect
4. **Mixing up flag syntax**: nvidia-smi uses `-i` for GPU index, others may differ
5. **Not reading error counters**: Many issues show up in counters before failing

### Keyboard Shortcuts

- **↑/↓**: Navigate command history
- **Ctrl+C**: Cancel current command
- **Ctrl+L**: Clear terminal screen
- **Tab**: Auto-complete (coming soon)

### Next Steps

1. Complete the labs in order (Domain 1 → Domain 5)
2. Practice troubleshooting scenarios multiple times
3. Create your own failure scenarios with fault injection
4. Time yourself on common tasks
5. Take the practice exam when confident

## Getting Help

- Type `help` in the terminal for command list
- Check the **Documentation** tab for reference materials
- Review XID error codes in the docs
- Consult the official NVIDIA certification resources

---

**Remember**: This simulator is a practice environment. Real hardware may behave slightly differently, but the commands and concepts are identical. Build muscle memory here, then apply it confidently in the real world.
