# **Architectural Specification and Functional Source of Truth for High-Fidelity NVIDIA CLI Emulation**

## **1\. Executive Summary**

The development of a high-fidelity virtual simulator for NVIDIA data center infrastructure—spanning DGX systems, HGX baseboards, and SuperPOD clusters—requires a rigorous adherence to the behavioral and aesthetic operational realities of the native command-line interface (CLI) ecosystem. This report serves as the definitive reference specification for systems architects and developers tasked with engineering a persistent CLI simulator. The objective is to create a virtual environment indistinguishable from physical hardware, capable of supporting advanced validation, training, and automation workflows without access to the underlying capital-intensive infrastructure.

Realism in simulation is not merely the reproduction of static string outputs; it is the accurate emulation of state retention, relational data integrity, and the intricate "shell-within-a-shell" paradigms found in tools like the NVIDIA System Management (NVSM) CLI and the Cluster Management Shell (cmsh). A simulated GPU marked as "Critical" in NVSM must arguably reflect corresponding Xid error codes in kernel logs, show degraded link speeds in PCIe topology tools, and trigger alerts in the Baseboard Management Controller (BMC). This report establishes the frameworks for simulating these interdependencies across the entire stack, from low-level firmware tools (MFT) to high-level workload orchestrators (Slurm).

The analysis herein synthesizes official documentation, technical user guides, and field output samples to construct a "Golden Master" specification. It provides the exact syntax, formatting nuances, and state-logic required to emulate the following core domains:

1. **System Health & Inventory:** The NVSM framework and its interactive shell.  
2. **Cluster Orchestration:** The Base Command Manager (BCM) and cmsh.  
3. **Out-of-Band Management:** IPMI, BMC sensor data repositories, and raw command execution.  
4. **Fabric & Interconnects:** InfiniBand/Ethernet state, firmware management, and cabling topology.  
5. **Workload Scheduling:** Slurm job lifecycle and partition management.  
6. **Containerization:** NGC registry interactions and Enroot runtime behaviors.  
7. **Integrated Fault Injection:** Realistic propagation of hardware failures across the software stack.

## ---

**2\. NVIDIA System Management (NVSM) Architecture**

The NVIDIA System Management (NVSM) framework acts as the primary health monitoring engine for DGX nodes. Unlike transient command-line tools that execute and exit, NVSM operates as a client-server architecture where the CLI communicates with a persistent background daemon (nvsm-core). A realistic simulator must replicate this persistent relationship, including the service status reporting and the distinct interactive shell mode.

### **2.1. Service Layer Emulation**

Before a user interacts with the NVSM CLI, they often verify the health of the underlying services. The simulator must implement a mock systemd interface that accurately reports the status of the NVSM service suite.

**Command Simulation:** systemctl status nvsm-core

The simulator must generate output that includes a dynamic timestamp (reflecting the simulated system uptime), the correct process ID (PID), and the standard CGroup hierarchy. The service must be shown as active (running).

**Golden Output Reference:**

$ sudo systemctl status nvsm-core  
● nvsm-core.service \- NVSM Core Service  
   Loaded: loaded (/usr/lib/systemd/system/nvsm-core.service; enabled; vendor preset: enabled)  
   Active: active (running) since Wed 2026-01-14 08:00:00 UTC; 4h 12min ago  
 Main PID: 1234 (nvsm-core)  
    Tasks: 18 (limit: 4915\)  
   CGroup: /system.slice/nvsm-core.service  
           └─1234 /usr/bin/nvsm-core

1

**Implementation Guideline:** The simulator must support the \-all flag functionality to display the entire suite of NVSM services. A realistic response to sudo systemctl status \-all nvsm\* must list not just the core, but also the API gateway (nvsm-api-gateway), the notification service (nvsm-notifier), and the plugin monitors (e.g., nvsm-plugin-monitor-storage, nvsm-plugin-monitor-system). In a fault injection scenario where the "NVSM daemon is down," these outputs must switch to inactive (dead) or failed states, and subsequent CLI commands must return connection errors.1

### **2.2. The Interactive NVSM Shell (nvsm-\>)**

A critical distinguishing feature of NVSM is its interactive mode, which functions similarly to a restricted shell environment with its own navigation verbs (cd, show, set). The simulator must trap the nvsm command when invoked without arguments and transition the user's prompt to nvsm-\>.

Navigation Logic and Target Hierarchy:  
The simulator must maintain a "Current Working Target" (CWT) variable. The file-system-like hierarchy is virtual and represents hardware objects.

* **Root:** /  
* **Systems:** /systems/localhost  
* **Chassis:** /chassis/localhost

Interactive Session Transcript Simulation:  
The following transcript illustrates the required behavior for navigating to storage volumes. The simulator must replicate the command prompt changes and the specific output format of the show verb.

user@dgx-2:\~$ sudo nvsm  
\[sudo\] password for user:  
nvsm-\> cd /systems/localhost/storage/  
nvsm(/systems/localhost/storage/)-\> show

2

Output Structure Analysis:  
When show is executed, the output is structured into three distinct sections: Properties, Targets, and Verbs. The Properties section uses Key \= Value formatting. The Targets section lists navigable sub-objects (which act like directories). The Verbs section lists valid commands for the current context.  
**Storage Target Output:**

/systems/localhost/storage/  
Properties:  
  DriveCount \= 10  
  Volumes \= \[ md0, md1, nvme0n1p1, nvme1n1p1 \]  
Targets:  
  alerts  
  drives  
  policy  
  volumes  
Verbs:  
  cd  
  show

3

**Implementation Note:** The list of Volumes in the properties must be dynamic. If the simulator is configured with a different storage topology (e.g., a DGX Station with fewer drives versus a DGX SuperPOD node), this list must reflect the specific simulated hardware configuration.

### **2.3. Health Monitoring and Aggregation**

The show health command is the primary diagnostic tool used by administrators. The simulator must generate a comprehensive report that aggregates individual health checks from memory, CPU, GPU, PCIe, and thermal subsystems.

**Command:** sudo nvsm show health

**Output Formatting Rules:**

1. **Header:** A simple dashed line under "Checks".  
2. **Check Lines:** Each check consists of a descriptive string, a series of leader dots (.....), and a status result (Healthy, Warning, Critical).  
3. **Summary Footer:** A summary section explicitly counting the total checks and providing an overall system status.

**Golden Output Reference:**

Checks  
\------  
Verify installed DIMM memory sticks.......................... Healthy  
Number of logical CPU cores ............................. Healthy  
GPU link speed \[0000:39:00.0\]......................... Healthy  
GPU link width \[0000:39:00.0\]\[x16\]........................... Healthy  
Root file system usage....................................... Healthy  
...  
Health Summary  
\--------------  
205 out of 205 checks are Healthy  
Overall system status is Healthy

2

Detailed Health Drill-Down:  
A realistic simulator must support drilling down into specific subsystems to investigate "Critical" statuses. For instance, if the overall health is critical due to a GPU issue, the user will navigate to the GPU target to inspect the Status\_HealthRollup property.  
**Command:** nvsm(/systems/localhost/gpus)-\> show \-display properties

Fault Scenario Output:  
In this scenario, one GPU has failed. Note the distinction between Status\_Health (the health of the container object itself) and Status\_HealthRollup (the aggregated health of its children).

/systems/localhost/gpus  
Properties:  
  Status\_HealthRollup \= Critical  
  Status\_Health \= OK

2

The simulator must then allow the user to use wildcards to identify the specific faulty component:  
Command: show \-display properties=\*health /systems/localhost/gpus/\*  
This command iterates through all GPU objects (GPU0 through GPU7 or GPU15) and prints their health properties. The specific failing GPU (e.g., GPU14) must report Status\_Health \= Critical.7

### **2.4. Health Dump Generation**

The dump health command is used to generate diagnostic tarballs. While the simulator does not need to create a valid binary tarball with real logs, it *must* simulate the file creation interaction and the naming convention of the output file.

**Command:** sudo nvsm dump health

Output Behavior:  
The command should pause briefly (simulating log collection latency) before printing the success message. The filename should include the hostname and a timestamp.

Writing output to /tmp/nvsm-health-dgx-1-20260114083045.tar.xz  
Done.

2

## ---

**3\. Cluster Management: Base Command Manager (BCM) and cmsh**

For simulators emulating NVIDIA DGX SuperPOD environments, the Base Command Manager (BCM) and its CLI, cmsh, are essential. cmsh operates as a powerful, stateful shell environment distinct from the standard bash shell. It uses a "mode" system where the prompt changes based on the user's location in the configuration hierarchy.

### **3.1. cmsh Architecture and Prompt Logic**

The cmsh environment is hierarchical. Users enter "modes" (e.g., device, category, partition) to manage specific aspects of the cluster. The simulator must update the prompt dynamically to reflect this context.

**Prompt Syntax:** \[\<user\>@\<headnode\>-\>\<mode\>\[\<object\>\]\]%

**State Transitions:**

1. **Initial Login:** \[root@dgx-headnode\]%  
2. **Enter Device Mode:** device \-\> \[root@dgx-headnode-\>device\]%  
3. **Select a Node:** use dgx-node01 \-\> \[root@dgx-headnode-\>device\[dgx-node01\]\]%

This visual feedback is critical for the user to know which object they are manipulating. The simulator must track the current\_mode and current\_object variables to render this prompt correctly.9

### **3.2. Device Management and Listings**

In device mode, administrators list and manage physical nodes. The simulator must support the list command, which renders a table of devices, their status, and network information.

**Command Sequence:**

\[root@dgx-headnode\]% device  
\[root@dgx-headnode-\>device\]% list

Golden Output Reference:  
The table must include columns for Name, Network, IP, Mac, and Category. The simulator should populate this with a realistic list of compute nodes (e.g., dgx01 through dgx08) and the head node.

| Name (key) | Network | IP | Mac | Category |
| :---- | :---- | :---- | :---- | :---- |
| dgx-headnode | internalnet | 10.141.0.1 | FA:16:3E:C4:28:1C | headnode |
| dgx-node01 | internalnet | 10.141.0.2 | FA:16:3E:C4:28:1D | dgx-gb200 |
| dgx-node02 | internalnet | 10.141.0.3 | FA:16:3E:C4:28:1E | dgx-gb200 |

9

Implementation Note on JSON Output:  
cmsh supports JSON output formatting for automation, which is highly relevant for a simulator intended to test scripts. The simulator must support the \-d (delimiter) and \-f (fields) flags. If \-d {} is passed, the output must be valid JSON.  
**Command:** list \-t computenode \-d {} \-f hostname,ip,category

**Output:**

JSON

\[  
  {  
    "category": "dgx-gb200",  
    "hostname (key)": "dgx-node01",  
    "ip": "10.141.0.2"  
  },  
  {  
    "category": "dgx-gb200",  
    "hostname (key)": "dgx-node02",  
    "ip": "10.141.0.3"  
  }  
\]

11

### **3.3. Category and Configuration Overlays**

BCM uses "categories" to group nodes and apply configurations (e.g., software images, Slurm roles). The simulator must allow users to navigate to a category and inspect its settings.

**Command Sequence:**

\[root@dgx-headnode\]% category  
\[root@dgx-headnode-\>category\]% use dgx-gb200  
\[root@dgx-headnode-\>category\[dgx-gb200\]\]% show

Output Structure:  
The show command in cmsh typically outputs a vertical list of parameters and values. The simulator must reproduce this key-value alignment.

Parameter                       Value  
\------------------------------- \----------------------------------------  
Name                            dgx-gb200  
Software image                  baseos-image-v10  
Slurm client                    yes  
Slurm submit                    yes  
Assign to role                  default

10

### **3.4. Software Image Management**

A critical workflow in BCM is managing boot images. The simulator must provide a softwareimage mode where users can list available images.

**Command:** softwareimage \-\> list

**Output Table:**

| Name (key) | Path (key) | Kernel version | Nodes |
| :---- | :---- | :---- | :---- |
| baseos-image-v10 | /cm/images/baseos-image-v10 | 5.15.0-1035-nvidia | 32 |
| maintenance-image | /cm/images/maintenance-image | 5.15.0-1035-nvidia | 0 |
| 10 |  |  |  |

## ---

**4\. Baseboard Management Controller (IPMI) Simulation**

For out-of-band management simulation, accurately replicating the Intelligent Platform Management Interface (IPMI) via ipmitool is mandatory. This tool interacts directly with the BMC sensors and firmware.

### **4.1. Sensor Data Repository (SDR) and Thresholds**

The ipmitool sensor list command provides a snapshot of the physical environment (temperatures, fan speeds, voltages, power draw). The simulator must render this data in a fixed-width table format that matches the specific column layout of standard IPMI implementations.

**Command:** ipmitool sensor list

**Simulation Requirements:**

* **Column Alignment:** The pipe | character is used as a delimiter.  
* **Unit Consistency:** Temperature in degrees C, Fan speed in RPM, Power in Watts.  
* **Status Indicators:** ok is the nominal state. cr (critical) or nr (non-recoverable) should be used in fault scenarios.  
* **Thresholds:** The simulator must define static thresholds (lower/upper critical) for every sensor to populate the right-side columns.

**Golden Output Reference:**

CPU Temp | 37.000 | degrees C | ok | 0.000 | 0.000 | 0.000 | 95.000 | 98.000 | 100.000  
System Temp | 30.000 | degrees C | ok | \-9.000 | \-7.000 | \-5.000 | 80.000 | 85.000 | 90.000  
PCH Temp | 48.000 | degrees C | ok | \-11.000 | \-8.000 | \-5.000 | 90.000 | 95.000 | 100.000  
PWR\_SYSTEM | 1872.000 | Watts | ok | na | na | na | 19890.000 | 19890.000 | na  
Fan 1 RPM | 5400.000 | RPM | ok | 300.000 | 500.000 | 800.000 | na | na | na

12

**Insight:** Note the use of na for thresholds that are not applicable (e.g., lower power limit). The simulator must handle these special cases to maintain realism.

### **4.2. Raw Command Execution and OEM extensions**

Advanced NVIDIA DGX administration often involves sending raw hex bytes to the BMC to trigger OEM-specific functions, such as power capping or factory resets. The simulator must function as a state machine that parses these specific hex strings.

Power Capping Scenario:  
To enable power capping, a user sends a raw command sequence. The simulator must recognize the specific bytes 0x3c 0x81 0x05 (Set Power Limit).  
**Command:** ipmitool raw 0x3c 0x81 0x05 0xE0 0x2E

* **Interpretation:** The last two bytes 0xE0 0x2E represent the power limit (12,000 Watts in little-endian hex).  
* **Simulator Action:** The simulator must update its internal power\_limit state variable to 12000\.  
* **Output:** (No output on success, or a single space/newline).

Query Power Limit:  
Command: ipmitool raw 0x3c 0x80 0x05

* **Simulator Action:** Read the internal power\_limit state.  
* **Output:** E0 2E (Returns the hex bytes of the current limit).

15

### **4.3. DCMI Power Readings**

The Data Center Manageability Interface (DCMI) extensions provide aggregated power data.

**Command:** ipmitool dcmi power reading

**Golden Output Reference:**

Instantaneous power reading:                   1885 Watts  
Minimum during sampling period:                1800 Watts  
Maximum during sampling period:                7852 Watts  
Average power reading over sample period:      1885 Watts  
IPMI timestamp:                                Fri Jan 14 09:20:45 2026  
Sampling period:                               00000005 Seconds  
Power reading state is:                        activated

12

## ---

**5\. Fabric and Interconnects: MFT and InfiniBand**

For a simulator to support multi-node clustering scenarios, it must accurately emulate the NVIDIA (Mellanox) networking stack. This includes the InfiniBand/Ethernet interfaces and the Mellanox Firmware Tools (MFT).

### **5.1. IB Device Status (ibstat)**

ibstat is the standard tool for verifying Host Channel Adapter (HCA) status. A DGX system typically contains multiple HCAs (e.g., mlx5\_0 through mlx5\_9).

**Command:** ibstat

Golden Output Reference:  
The simulator must iterate through all defined adapters.

CA 'mlx5\_0'  
    CA type: MT4129  
    Number of ports: 1  
    Firmware version: 28.39.1002  
    Hardware version: 0  
    Node GUID: 0x0002c90300000001  
    System image GUID: 0x0002c90300000001  
    Port 1:  
        State: Active  
        Physical state: LinkUp  
        Rate: 400  
        Base lid: 4  
        LMC: 0  
        SM lid: 1  
        Capability mask: 0x2651e848  
        Port GUID: 0x0002c90300000001  
        Link layer: InfiniBand  
CA 'mlx5\_1'  
    CA type: MT4129  
   ...

18

**State Integrity:** If the simulator's "cable" state is disconnected for a specific port, the State should report Down and Physical state should report LinkDown or Polling.

### **5.2. Interface Mapping (ibdev2netdev)**

A critical aspect of networking simulation is the mapping between the IB device (hardware) and the netdevice (kernel interface). The simulator must provide consistent mappings.

**Command:** ibdev2netdev \-v

**Golden Output Reference:**

0000:17:00.0 mlx5\_0 (MT4129 \- ConnectX-7) fw 28.39.1002 port 1 (ACTIVE) \==\> ib0 (Up)  
0000:21:00.0 mlx5\_1 (MT4129 \- ConnectX-7) fw 28.39.1002 port 1 (ACTIVE) \==\> ib1 (Up)  
0000:4b:00.0 mlx5\_2 (MT4129 \- ConnectX-7) fw 28.39.1002 port 1 (DOWN  ) \==\> enp75s0 (Down)

21

**Insight:** Note the differentiation between InfiniBand interfaces (ibX) and Ethernet interfaces (enpXsY). The simulator must respect the configured protocol for each card.

### **5.3. Mellanox Firmware Tools (MFT)**

The MFT suite allows low-level configuration. The simulator must mimic the mst service which creates character devices for the adapters.

**Command:** mst status

**Output:**

MST modules:  
\------------  
    MST PCI module loaded  
    MST PCI configuration module loaded

MST devices:  
\------------  
/dev/mst/mt4129\_pciconf0         \- PCI configuration cycles  
/dev/mst/mt4129\_pciconf0.1       \- PCI configuration cycles

24

**Command:** mlxconfig \-d /dev/mst/mt4129\_pciconf0 query

The simulator must render the configuration parameters of the adapter.

**Output:**

Device \#1:  
\----------  
Device type:    ConnectX7  
Name:           MCX753105A-NEAT  
Description:    ConnectX-7 VPI adapter card; NDR IB (400Gb/s) and 400GbE  
Device:         /dev/mst/mt4129\_pciconf0

Configurations:                                      Next Boot  
         SRIOV\_EN                                    True(1)  
         NUM\_OF\_VFS                                  8  
         LINK\_TYPE\_P1                                IB(1)

27

## ---

**6\. Workload Orchestration: Slurm Simulation**

In a DGX SuperPOD simulator, users expect to schedule jobs using Slurm. The simulator must maintain a job queue state machine and replicate the output of the Slurm client tools.

### **6.1. Job Submission (sbatch)**

The sbatch command submits a job script. The simulator must parse the script for \#SBATCH directives (like \--nodes, \--partition) to validate the request against simulated resources.

**Command:** sbatch job\_script.sh

**Output:**

Submitted batch job 1001

**State Action:** The simulator creates a new job object with ID 1001 in the PENDING state. It must also simulate the creation of an output file slurm-1001.out in the current directory.29

### **6.2. Queue Status (squeue)**

The squeue command is sensitive to column formatting. Scripts often parse this using fixed widths.

**Command:** squeue

**Golden Output Reference:**

             JOBID PARTITION     NAME     USER ST       TIME  NODES NODELIST(REASON)  
              1001       gpu   my\_job    user1  R      00:15      1 dgx-01  
              1002       gpu  train\_X    user2 PD       0:00      2 (Priority)

31

**State Transitions:** The simulator must logically transition jobs from PD (Pending) to R (Running) and eventually CG (Completing) based on a simulated clock or manual triggers.

### **6.3. Node Information (sinfo)**

**Command:** sinfo

**Output:**

PARTITION AVAIL  TIMELIMIT  NODES  STATE NODELIST  
gpu\*         up 2-00:00:00      4   idle dgx-\[01-04\]  
cpu          up   infinite      2  alloc cpu-\[01-02\]

32

## ---

**7\. Containerization Ecosystem: NGC and Enroot**

NVIDIA systems utilize the NGC catalog for software distribution. Simulating these tools allows users to validate their container workflows.

### **7.1. NGC Registry CLI**

The simulator must mimic the ngc binary, specifically the image listing commands which connect to the virtual registry.

**Command:** ngc registry image list

Golden Output Reference:  
The output is a table with ASCII borders.

\+--------------------------------+-----------+-------+

| Repository | Tag | Size |  
\+--------------------------------+-----------+-------+

| nvidia/pytorch | 22.04-py3 | 4.5GB |  
| nvidia/tensorflow | 22.03-tf2 | 3.8GB |  
\+--------------------------------+-----------+-------+

33

### **7.2. Enroot Runtime**

Enroot is the preferred container runtime on DGX clusters. The list command displays downloaded images.

**Command:** enroot list \--fancy

**Golden Output Reference:**

NAME                              SIZE      PID    STATE    STARTED  
nvidia+pytorch+22.04-py3          4.5GB     \-      \-        \-  
nvidia+tensorflow+22.03-tf2       3.8GB     12345  S+       10:00

35

## ---

**8\. Integrated Fault Injection Scenarios**

The true value of a simulator lies in its ability to model failure. This section defines "Fault Scenarios" that the simulator must implement, ensuring that a single fault event propagates correctly across all CLI tools.

### **8.1. Scenario A: "GPU Falling Off the Bus"**

**Trigger:** Admin sets simulated\_fault \= gpu\_bus\_error on GPU 0 (PCI 07:00.0).

**Required Artifacts:**

1. Kernel Log (journalctl):  
   The simulator must append Xid 79 errors to the log stream.  
   Jan 14 10:30:00 dgx-01 kernel: NVRM: GPU at PCI:0000:07:00: GPU-b850f46d-d5ea-c752-ddf3-c4453e44d3f7  
   Jan 14 10:30:00 dgx-01 kernel: NVRM: Xid (PCI:0000:07:00): 79, GPU has fallen off the bus

   36  
2. NVSM Health:  
   sudo nvsm show health must now report:  
   GPU link speed \[0000:07:00.0\]................................ Critical

3. PCI Topology (lspci):  
   The device might disappear or show a generic error state.  
   07:00.0 3D controller: NVIDIA Corporation (rev ff)

   (Note: rev ff is a common signature of a device that has dropped off the bus but is technically still enumerated as a dead endpoint).  
4. IPMI/BMC:  
   ipmitool sel list (System Event Log) should show a corresponding OEM event indicating a PCIe fatal error.

### **8.2. Scenario B: Overheating Event**

**Trigger:** Admin sets GPU 0 temperature to 95C.

**Required Artifacts:**

1. IPMI Sensor:  
   ipmitool sensor list must show the temperature crossing the Upper Non-Critical (UNC) threshold.  
   GPU0 Temp | 95.000 | degrees C | nc |...

   (nc indicates Non-Critical high threshold crossed).  
2. NVSM Alerts:  
   The interactive shell /systems/localhost/storage/alerts or GPU alerts target must populate with a new alert object.  
3. Throttling:  
   nvidia-smi (if simulated) would show "SW Thermal Slowdown".

## ---

**9\. Simulator Architecture Guidelines**

To successfully implement the behavior described above, the simulator software architecture must adhere to specific principles.

### **9.1. State Persistence Model**

The simulator cannot function as a stateless "echo" server. It must maintain a persistent JSON or SQLite database representing the hardware state.

* **Action:** When a user runs ipmitool raw to set a power cap, the simulator updates the power\_limit value in the state DB.  
* **Result:** A subsequent dcmi power reading command queries this DB to calculate the returned values. If the simulator is restarted, this state should persist.

### **9.2. Latency and Asynchrony**

Real hardware commands are rarely instantaneous. To avoid the "uncanny valley" of instant responses:

* **MFT/Flash:** Commands like mlxup \-u (firmware update) must simulate a progress bar and a 5-10 second delay.  
* **Job Scheduling:** A job submitted via sbatch should not go immediately to Running. It should sit in Pending for a configurable duration (e.g., 2 seconds) to allow the user to see the state transition via squeue.

### **9.3. Output Fidelity and Whitespace**

Many automation scripts rely on regex or column counting.

* **Guideline:** Do not approximate whitespace. Use the exact spacing found in the Golden Output References.  
* **Guideline:** Implement specific error codes. If a user tries to run nvsm as a non-root user, the simulator must return exit code 1 or 13 (Permission denied) and print nothing or the standard Linux permission error, depending on the tool.

By adhering to this specification, the virtual simulator will provide a robust, reliable, and realistic source of truth for NVIDIA ecosystem development.

#### **Works cited**

1. Introduction — NVIDIA System Management User Guide 24.03 documentation, accessed January 14, 2026, [https://docs.nvidia.com/datacenter/nvsm/nvsm-user-guide/24.03/introduction.html](https://docs.nvidia.com/datacenter/nvsm/nvsm-user-guide/24.03/introduction.html)  
2. nvsm-user-guide.pdf \- NVIDIA Documentation, accessed January 14, 2026, [https://docs.nvidia.com/datacenter/nvsm/latest/pdf/nvsm-user-guide.pdf](https://docs.nvidia.com/datacenter/nvsm/latest/pdf/nvsm-user-guide.pdf)  
3. Using the NVSM CLI — NVIDIA System Management User Guide 25.03 documentation, accessed January 14, 2026, [https://docs.nvidia.com/datacenter/nvsm/nvsm-user-guide/latest/using-nvsm-cli.html](https://docs.nvidia.com/datacenter/nvsm/nvsm-user-guide/latest/using-nvsm-cli.html)  
4. Using the NVSM CLI — NVIDIA System Management User Guide 21.07 documentation, accessed January 14, 2026, [https://docs.nvidia.com/datacenter/nvsm/nvsm-user-guide/21.07/topic\_3.html](https://docs.nvidia.com/datacenter/nvsm/nvsm-user-guide/21.07/topic_3.html)  
5. NVIDIA System Management, accessed January 14, 2026, [https://docs.nvidia.com/datacenter/nvsm/20.09/pdf/nvsm-user-guide.pdf](https://docs.nvidia.com/datacenter/nvsm/20.09/pdf/nvsm-user-guide.pdf)  
6. NVIDIA DGX A100 \- User Guide, accessed January 14, 2026, [https://docs.nvidia.com/dgx/pdf/dgxa100-user-guide.pdf](https://docs.nvidia.com/dgx/pdf/dgxa100-user-guide.pdf)  
7. nvsm-user-guide.pdf \- NVIDIA Documentation, accessed January 14, 2026, [https://docs.nvidia.com/datacenter/nvsm/19.06/pdf/nvsm-user-guide.pdf](https://docs.nvidia.com/datacenter/nvsm/19.06/pdf/nvsm-user-guide.pdf)  
8. Using the NVSM CLI — NVIDIA System Management User Guide 20.09 documentation, accessed January 14, 2026, [https://docs.nvidia.com/datacenter/nvsm/nvsm-user-guide/20.09/topic\_3.html](https://docs.nvidia.com/datacenter/nvsm/nvsm-user-guide/20.09/topic_3.html)  
9. Cluster Management — NVIDIA DGX SuperPOD, accessed January 14, 2026, [https://docs.nvidia.com/dgx-superpod/administration-guide-dgx-superpod/latest/cluster-management.html](https://docs.nvidia.com/dgx-superpod/administration-guide-dgx-superpod/latest/cluster-management.html)  
10. Node and Category Management — NVIDIA Mission Control Software with GB200 NVL72 Systems Administration Guide, accessed January 14, 2026, [https://docs.nvidia.com/mission-control/docs/systems-administration-guide/2.0.0/node-category-management.html](https://docs.nvidia.com/mission-control/docs/systems-administration-guide/2.0.0/node-category-management.html)  
11. Scripting with cmsh | Bright Cluster Manager Knowledge Base, accessed January 14, 2026, [https://kb.brightcomputing.com/knowledge-base/scripting-with-cmsh/](https://kb.brightcomputing.com/knowledge-base/scripting-with-cmsh/)  
12. DGX H100 power consumption \- NVIDIA Developer Forums, accessed January 14, 2026, [https://forums.developer.nvidia.com/t/dgx-h100-power-consumption/278762](https://forums.developer.nvidia.com/t/dgx-h100-power-consumption/278762)  
13. How To: Change IPMI Sensor Thresholds using ipmitool | TrueNAS Community, accessed January 14, 2026, [https://www.truenas.com/community/resources/how-to-change-ipmi-sensor-thresholds-using-ipmitool.35/](https://www.truenas.com/community/resources/how-to-change-ipmi-sensor-thresholds-using-ipmitool.35/)  
14. Using IPMITool sdr list command to display sensor information in-band or out-of-band on Lenovo ThinkSystem servers, accessed January 14, 2026, [https://support.lenovo.com/us/en/solutions/ht516340-using-ipmitool-sdr-list-command-to-display-sensor-information-in-band-or-out-of-band-on-lenovo-thinksystem-servers](https://support.lenovo.com/us/en/solutions/ht516340-using-ipmitool-sdr-list-command-to-display-sensor-information-in-band-or-out-of-band-on-lenovo-thinksystem-servers)  
15. Managing Power Capping — NVIDIA DGX B300 User Guide, accessed January 14, 2026, [https://docs.nvidia.com/dgx/dgxb300-user-guide/power-capping.html](https://docs.nvidia.com/dgx/dgxb300-user-guide/power-capping.html)  
16. Using the BMC — NVIDIA DGX A100 Station User Guide, accessed January 14, 2026, [https://docs.nvidia.com/dgx/dgx-station-a100-user-guide/using-bmc.html](https://docs.nvidia.com/dgx/dgx-station-a100-user-guide/using-bmc.html)  
17. NVIDIA OEM Commands \- NVIDIA Docs, accessed January 14, 2026, [https://docs.nvidia.com/networking/display/bluefieldbmcv282/nvidia+oem+commands](https://docs.nvidia.com/networking/display/bluefieldbmcv282/nvidia+oem+commands)  
18. InfiniBand Commands \- NVIDIA Docs, accessed January 14, 2026, [https://docs.nvidia.com/networking/display/ufmenterpriseapplianceswv190/infiniband+commands](https://docs.nvidia.com/networking/display/ufmenterpriseapplianceswv190/infiniband+commands)  
19. Commands for InfiniBand Diagnostics \- NVIDIA Docs, accessed January 14, 2026, [https://docs.nvidia.com/networking/display/ufmsdnappumv4184/commands+for+infiniband+diagnostics](https://docs.nvidia.com/networking/display/ufmsdnappumv4184/commands+for+infiniband+diagnostics)  
20. InfiniBand Command Examples, accessed January 14, 2026, [https://docs.oracle.com/cd/E19914-01/820-6705-10/appendix2.html](https://docs.oracle.com/cd/E19914-01/820-6705-10/appendix2.html)  
21. Dual-DAC Interconnect Configuration Guide for DGX ... \- NADDOD, accessed January 14, 2026, [https://resource.naddod.com/files/2025-11-27/naddod-dual-dac-interconnect-configuration-guide-for-dgx-spark-systems-013472.pdf](https://resource.naddod.com/files/2025-11-27/naddod-dual-dac-interconnect-configuration-guide-for-dgx-spark-systems-013472.pdf)  
22. Enabling RDMA \- NVIDIA Docs, accessed January 14, 2026, [https://docs.nvidia.com/holoscan/sdk-user-guide/set\_up\_gpudirect\_rdma.html](https://docs.nvidia.com/holoscan/sdk-user-guide/set_up_gpudirect_rdma.html)  
23. How-To Validate InfiniBand Hardware and Test RDMA Connectivity for GPU VMs in Crusoe Cloud, accessed January 14, 2026, [https://support.crusoecloud.com/hc/en-us/articles/38559194513691-How-to-Validate-InfiniBand-Hardware-and-Test-RDMA-Connectivity-for-GPU-VMs-in-Crusoe-Cloud](https://support.crusoecloud.com/hc/en-us/articles/38559194513691-How-to-Validate-InfiniBand-Hardware-and-Test-RDMA-Connectivity-for-GPU-VMs-in-Crusoe-Cloud)  
24. NVIDIA Firmware Tools (MFT) Documentation v4.34.0, accessed January 14, 2026, [https://resource.fs.com/mall/resource/nvidia-firmware-tools-mft-documentation.pdf](https://resource.fs.com/mall/resource/nvidia-firmware-tools-mft-documentation.pdf)  
25. mst Synopsis \- FreeBSD \- NVIDIA Docs, accessed January 14, 2026, [https://docs.nvidia.com/networking/display/mft/mst+synopsis+-+freebsd](https://docs.nvidia.com/networking/display/mft/mst+synopsis+-+freebsd)  
26. NVIDIA Firmware Tools (MFT) Documentation v4.30.0, accessed January 14, 2026, [https://docs.nvidia.com/networking/display/nvidia-firmware-tools-mft-documentation-v4-30-0.0.pdf](https://docs.nvidia.com/networking/display/nvidia-firmware-tools-mft-documentation-v4-30-0.0.pdf)  
27. Examples of mlxconfig Usage \- NVIDIA Docs, accessed January 14, 2026, [https://docs.nvidia.com/networking/display/mftv422/examples+of+mlxconfig+usage](https://docs.nvidia.com/networking/display/mftv422/examples+of+mlxconfig+usage)  
28. Using mlxconfig \- NVIDIA Docs, accessed January 14, 2026, [https://docs.nvidia.com/networking/display/mft/using+mlxconfig](https://docs.nvidia.com/networking/display/mft/using+mlxconfig)  
29. Job Scripts | Ohio Supercomputer Center, accessed January 14, 2026, [https://www.osc.edu/supercomputing/batch-processing-at-osc/job-scripts](https://www.osc.edu/supercomputing/batch-processing-at-osc/job-scripts)  
30. sbatch \- Slurm Workload Manager \- SchedMD, accessed January 14, 2026, [https://slurm.schedmd.com/sbatch.html](https://slurm.schedmd.com/sbatch.html)  
31. Batch-Related Command Summary | Ohio Supercomputer Center, accessed January 14, 2026, [https://www.osc.edu/supercomputing/batch-processing-at-osc/batch-related-command-summary](https://www.osc.edu/supercomputing/batch-processing-at-osc/batch-related-command-summary)  
32. Advanced Topics \- Slurm \- sinfo (Monitor Resources) \- ITS Documentation, accessed January 14, 2026, [https://documentation.its.umich.edu/node/4991](https://documentation.its.umich.edu/node/4991)  
33. NGC Registry CLI \- NVIDIA Documentation, accessed January 14, 2026, [https://docs.nvidia.com/dgx/pdf/ngc-registry-cli-user-guide.pdf](https://docs.nvidia.com/dgx/pdf/ngc-registry-cli-user-guide.pdf)  
34. NGC Registry CLI User Guide :: DGX Systems Documentation, accessed January 14, 2026, [https://docs.nvidia.com/dgx/ngc-registry-cli-user-guide/index-bak.html](https://docs.nvidia.com/dgx/ngc-registry-cli-user-guide/index-bak.html)  
35. enroot/doc/cmd/list.md at main \- GitHub, accessed January 14, 2026, [https://github.com/NVIDIA/enroot/blob/master/doc/cmd/list.md](https://github.com/NVIDIA/enroot/blob/master/doc/cmd/list.md)  
36. Working with Xid Errors \- NVIDIA Documentation, accessed January 14, 2026, [https://docs.nvidia.com/deploy/xid-errors/working-with-xid-errors.html](https://docs.nvidia.com/deploy/xid-errors/working-with-xid-errors.html)  
37. \[Solved\] Nvidia GPU has fallen off the bus / Kernel & Hardware / Arch Linux Forums, accessed January 14, 2026, [https://bbs.archlinux.org/viewtopic.php?id=304020](https://bbs.archlinux.org/viewtopic.php?id=304020)