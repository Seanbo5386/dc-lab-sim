# NVIDIA AI Infrastructure Simulator - Improvement Action Plan

## Executive Summary

**Current State:** Production-ready MVP with 83% exam coverage, solid technical foundation
**Existing Assets:**
- ✅ **Practice Exam System**: 35 questions, full UI, timer, scoring (just needs more questions + review mode)
- ✅ **Enhanced Help**: 31 commands with comprehensive docs, fuzzy matching, examples
- ✅ **Hint System**: Progressive hints with time/attempt-based triggers

**Target State:** Complete certification training platform with 93% exam coverage, validated learning paths
**Total Effort:** 66 hours over 4 phases (reduced from 70 - exam already functional!)
**Priority Focus:** Educational effectiveness → Exam coverage → Visual enhancements → Technical quality

---

## Phase 1: Complete Educational Loop (HIGH PRIORITY)
**Goal:** Transform passive exploration into active learning with validation and assessment
**Effort:** 16 hours (reduced from 20 - exam already exists!)
**Impact:** 70% → 90% educational effectiveness

### Task 1.1: Scenario Validation System (8 hours)

**Objective:** Add real-time validation to existing scenario steps

**Files to Create:**
- `src/utils/scenarioValidator.ts` - Core validation logic
- `src/types/validation.ts` - Validation types

**Files to Modify:**
- `src/store/simulationStore.ts` - Add validation state
- `src/components/LabWorkspace.tsx` - Visual feedback
- `src/components/Terminal.tsx` - Hook validation on command execution

**Implementation Details:**

```typescript
// src/types/validation.ts
export interface ValidationRule {
  type: 'command' | 'output' | 'state' | 'sequence';
  pattern?: string | RegExp;
  commandPattern?: string;
  stateCheck?: (context: CommandContext) => boolean;
  errorMessage?: string;
}

export interface StepValidation {
  stepId: string;
  rules: ValidationRule[];
  partialCredit?: boolean;  // Allow multiple ways to complete
  autoAdvance?: boolean;    // Move to next step automatically
}

export interface ValidationResult {
  passed: boolean;
  matchedRules: string[];
  failedRules: string[];
  feedback: string;
  progress: number;  // 0-100
}
```

```typescript
// src/utils/scenarioValidator.ts
export class ScenarioValidator {
  /**
   * Validate a command against scenario step requirements
   */
  static validateCommand(
    command: string,
    output: string,
    step: ScenarioStep,
    context: CommandContext
  ): ValidationResult {
    const rules = this.getRulesForStep(step);
    const results = rules.map(rule => this.validateRule(rule, command, output, context));

    const passed = results.filter(r => r.passed).length >= rules.length;
    const progress = (results.filter(r => r.passed).length / rules.length) * 100;

    return {
      passed,
      matchedRules: results.filter(r => r.passed).map(r => r.ruleName),
      failedRules: results.filter(r => !r.passed).map(r => r.ruleName),
      feedback: this.generateFeedback(results, step),
      progress,
    };
  }

  /**
   * Extract validation rules from scenario objectives
   */
  private static getRulesForStep(step: ScenarioStep): ValidationRule[] {
    const rules: ValidationRule[] = [];

    // Example: "Run ipmitool sel list to view System Event Log"
    // → Rule: command must match /ipmitool.*sel.*list/

    // Parse from step.objectives or step.validationCriteria
    if (step.validationCriteria) {
      return step.validationCriteria.map(criteria => ({
        type: 'command',
        pattern: new RegExp(criteria.commandPattern, 'i'),
        errorMessage: criteria.hint,
      }));
    }

    // Fallback: infer from objectives
    step.objectives.forEach(objective => {
      const commandMatch = objective.match(/run\s+([a-z-]+)/i);
      if (commandMatch) {
        rules.push({
          type: 'command',
          pattern: new RegExp(commandMatch[1], 'i'),
          errorMessage: `Try running ${commandMatch[1]} command`,
        });
      }
    });

    return rules;
  }

  /**
   * Validate a single rule
   */
  private static validateRule(
    rule: ValidationRule,
    command: string,
    output: string,
    context: CommandContext
  ): { passed: boolean; ruleName: string } {
    switch (rule.type) {
      case 'command':
        return {
          passed: rule.pattern ? rule.pattern.test(command) : false,
          ruleName: rule.pattern?.toString() || 'command',
        };

      case 'output':
        return {
          passed: rule.pattern ? rule.pattern.test(output) : false,
          ruleName: 'output-match',
        };

      case 'state':
        return {
          passed: rule.stateCheck ? rule.stateCheck(context) : false,
          ruleName: 'state-check',
        };

      default:
        return { passed: false, ruleName: 'unknown' };
    }
  }

  /**
   * Generate helpful feedback based on validation results
   */
  private static generateFeedback(
    results: Array<{ passed: boolean; ruleName: string }>,
    step: ScenarioStep
  ): string {
    const failedCount = results.filter(r => !r.passed).length;

    if (failedCount === 0) {
      return '✓ Step completed successfully! Moving to next step.';
    }

    if (failedCount === results.length) {
      return '✗ This command doesn\'t match the step requirements. Type "hint" for guidance.';
    }

    return `⚠ Partially correct (${results.filter(r => r.passed).length}/${results.length}). Keep trying!`;
  }
}
```

**Store Integration:**

```typescript
// src/store/simulationStore.ts - Add actions
interface SimulationState {
  // ... existing state

  // New validation state
  stepValidation: Record<string, ValidationResult>;

  // New actions
  validateStep: (scenarioId: string, stepId: string, result: ValidationResult) => void;
  completeStep: (scenarioId: string, stepId: string) => void;
}

// Implementation
validateStep: (scenarioId, stepId, result) => {
  set(state => ({
    stepValidation: {
      ...state.stepValidation,
      [`${scenarioId}-${stepId}`]: result,
    },
  }));

  // Auto-advance if step passed
  if (result.passed) {
    get().completeStep(scenarioId, stepId);
  }
},
```

**Terminal Integration:**

```typescript
// src/components/Terminal.tsx - In executeCommand()
const executeCommand = (cmdLine: string) => {
  // ... existing command execution

  // After command executes
  if (activeScenario && currentStep) {
    const validation = ScenarioValidator.validateCommand(
      cmdLine,
      result.output,
      currentStep,
      currentContext.current
    );

    validateStep(activeScenario.id, currentStep.id, validation);

    // Show validation feedback in terminal
    if (validation.progress > 0) {
      term.writeln('');
      term.writeln(validation.feedback);
    }
  }
};
```

**UI Feedback:**

```typescript
// src/components/LabWorkspace.tsx - Enhanced step display
{currentStep.objectives.map((objective, idx) => {
  const validation = stepValidation[`${activeScenario.id}-${currentStep.id}`];
  const isCompleted = validation?.matchedRules.includes(`objective-${idx}`);

  return (
    <div key={idx} className="flex items-start gap-2">
      {isCompleted ? (
        <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
      ) : (
        <Circle className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
      )}
      <span className={isCompleted ? 'text-green-400 line-through' : 'text-gray-300'}>
        {objective}
      </span>
    </div>
  );
})}

{/* Progress bar */}
<div className="mt-4">
  <div className="flex justify-between text-xs text-gray-400 mb-1">
    <span>Step Progress</span>
    <span>{validation?.progress || 0}%</span>
  </div>
  <div className="w-full bg-gray-700 rounded-full h-2">
    <div
      className="bg-green-500 h-2 rounded-full transition-all duration-500"
      style={{ width: `${validation?.progress || 0}%` }}
    />
  </div>
</div>
```

**Scenario Enhancement:**

```json
// src/data/scenarios/domain1/server-post-verification.json
{
  "steps": [
    {
      "id": "step1",
      "title": "Check System Event Log",
      "objectives": [
        "Use IPMI to view the System Event Log",
        "Identify any critical hardware events"
      ],
      "validationCriteria": [
        {
          "type": "command",
          "commandPattern": "ipmitool\\s+sel\\s+list",
          "hint": "Use 'ipmitool sel list' to view the System Event Log"
        },
        {
          "type": "output",
          "pattern": "SEL has",
          "hint": "The command should display SEL entries"
        }
      ],
      "autoAdvance": true
    }
  ]
}
```

**Success Criteria:**
- [ ] Students see real-time "✓ Step completed" feedback
- [ ] Progress bar shows completion percentage
- [ ] Failed attempts show helpful hints
- [ ] Auto-advance to next step when validated
- [ ] Works with existing scenarios (backward compatible)

---

### Task 1.2: Enhance Existing Practice Exam System (8 hours)

**Objective:** Enhance the existing practice exam (currently 35 questions) to 50+ questions and add review mode

**Current State:**
- ✅ `src/data/examQuestions.json` - 35 questions across all domains
- ✅ `src/utils/examEngine.ts` - Full scoring engine with timer
- ✅ `src/components/ExamWorkspace.tsx` - Complete exam UI
- ✅ Domain-weighted scoring with breakdown
- ✅ 90-minute timer with auto-submit
- ✅ Question navigation and flagging

**Files to Modify:**
- `src/data/examQuestions.json` - Add 15+ more questions
- `src/components/ExamWorkspace.tsx` - Add review mode
- `src/utils/examEngine.ts` - Add review functionality

**Enhancements Needed:**

**1. Add 15+ Questions to Reach 50 Total (4 hours)**

Current distribution (35 questions):
- Domain 1 (31%): 10 questions → Need 6 more for ~16 total
- Domain 2 (5%): 2 questions → Need 1 more for ~3 total
- Domain 3 (19%): 7 questions → Need 3 more for ~10 total
- Domain 4 (33%): 10 questions → Need 7 more for ~17 total
- Domain 5 (12%): 6 questions → Already at target!

**Questions to Add:**

```json
// Add to src/data/examQuestions.json

// Domain 1 - Add 6 questions:
{
  "id": "q036",
  "domain": "domain1",
  "questionText": "Which dmidecode type shows memory module details including part numbers and speeds?",
  "type": "multiple-choice",
  "choices": [
    "dmidecode -t processor",
    "dmidecode -t memory",
    "dmidecode -t system",
    "dmidecode -t bios"
  ],
  "correctAnswer": 1,
  "explanation": "'dmidecode -t memory' displays detailed memory information including manufacturer, part numbers, speeds, and slot population.",
  "points": 1,
  "difficulty": "beginner"
},

// ... 5 more Domain 1 questions

// Domain 2 - Add 1 question:
{
  "id": "q042",
  "domain": "domain2",
  "questionText": "What is the maximum number of MIG instances supported on an A100-80GB GPU?",
  "type": "multiple-choice",
  "choices": ["3", "5", "7", "8"],
  "correctAnswer": 2,
  "explanation": "A100-80GB supports up to 7 MIG instances with the 1g.10gb profile, or various combinations of larger profiles.",
  "points": 1,
  "difficulty": "intermediate"
},

// Domain 3 - Add 3 questions:
{
  "id": "q043",
  "domain": "domain3",
  "questionText": "Which environment variable tells NGC CLI where to find the API key?",
  "type": "multiple-choice",
  "choices": [
    "NGC_API_KEY",
    "NVIDIA_NGC_KEY",
    "NGC_CLI_API_KEY",
    "Configuration file only"
  ],
  "correctAnswer": 3,
  "explanation": "NGC CLI stores API keys in ~/.ngc/config. Environment variables are not used for authentication.",
  "points": 1,
  "difficulty": "intermediate"
},

// ... 2 more Domain 3 questions

// Domain 4 - Add 7 questions covering benchmarks, storage validation
// ... add HPL, NCCL, storage-related questions
```

**2. Add Review Mode After Exam Completion (3 hours)**

Currently the results screen only shows pass/fail and domain breakdown. Add ability to review each question with correct/incorrect indication.

```typescript
// src/components/ExamWorkspace.tsx modifications

// Add review mode state
const [reviewMode, setReviewMode] = useState(false);

// After results screen, add "Review Answers" button:
<button
  onClick={() => setReviewMode(true)}
  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-semibold"
>
  Review Answers
</button>

// Add review mode component:
if (reviewMode && activeExam?.breakdown) {
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-green-400">Answer Review</h2>
          <p className="text-sm text-gray-400">
            Question {currentQuestionIdx + 1} of {questions.length}
          </p>
        </div>

        {/* Question with Answer Indication */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto">
            {/* Show if answered correctly */}
            {isCorrect ? (
              <div className="bg-green-900 bg-opacity-30 border border-green-600 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-green-400 font-semibold">
                  <CheckCircle className="w-5 h-5" />
                  Correct Answer
                </div>
              </div>
            ) : (
              <div className="bg-red-900 bg-opacity-30 border border-red-600 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-red-400 font-semibold">
                  <XCircle className="w-5 h-5" />
                  Incorrect Answer
                </div>
              </div>
            )}

            {/* Question */}
            <h3 className="text-xl text-white mb-6">{currentQuestion.questionText}</h3>

            {/* Choices with correct/incorrect indicators */}
            <div className="space-y-3 mb-6">
              {currentQuestion.choices.map((choice, idx) => {
                const isCorrectAnswer = idx === currentQuestion.correctAnswer;
                const isUserAnswer = userAnswer === idx;

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-2 ${
                      isCorrectAnswer
                        ? 'border-green-500 bg-green-900 bg-opacity-30'
                        : isUserAnswer
                        ? 'border-red-500 bg-red-900 bg-opacity-30'
                        : 'border-gray-700 bg-gray-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {isCorrectAnswer && (
                        <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                      )}
                      {isUserAnswer && !isCorrectAnswer && (
                        <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                      )}
                      <span className="text-gray-200">{choice}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Explanation */}
            <div className="bg-blue-900 bg-opacity-30 border border-blue-600 rounded-lg p-6">
              <h4 className="text-blue-400 font-semibold mb-2">Explanation</h4>
              <p className="text-gray-300">{currentQuestion.explanation}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-gray-800 px-6 py-4 border-t border-gray-700 flex justify-between">
          <button
            onClick={() => setCurrentQuestionIdx(Math.max(0, currentQuestionIdx - 1))}
            disabled={currentQuestionIdx === 0}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded"
          >
            Previous
          </button>
          <button
            onClick={() => {
              setReviewMode(false);
              handleExit();
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
          >
            Exit Review
          </button>
          <button
            onClick={() => setCurrentQuestionIdx(Math.min(questions.length - 1, currentQuestionIdx + 1))}
            disabled={currentQuestionIdx === questions.length - 1}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
```

**3. Add Command Recommendations (1 hour)**

Enhance results screen to show specific commands to practice based on missed questions.

```typescript
// src/utils/examEngine.ts - Add function

export function getRecommendedCommands(
  questions: ExamQuestion[],
  answers: Map<string, number | number[]>
): string[] {
  const missedQuestions = questions.filter(q => {
    const userAnswer = answers.get(q.id);
    const correctAnswer = q.correctAnswer;

    if (q.type === 'multiple-select') {
      // Compare arrays
      if (!Array.isArray(userAnswer) || !Array.isArray(correctAnswer)) return true;
      return userAnswer.length !== correctAnswer.length ||
        !userAnswer.every(val => correctAnswer.includes(val));
    }

    return userAnswer !== correctAnswer;
  });

  // Get all related commands from missed questions
  const commands = new Set<string>();
  missedQuestions.forEach(q => {
    // Extract commands from question text
    const commandMatches = q.questionText.match(/[a-z-]+(?:\s+[a-z-]+)*/gi);
    if (commandMatches) {
      commandMatches.forEach(cmd => {
        if (cmd.length > 3 && !['what', 'which', 'when', 'where', 'does'].includes(cmd.toLowerCase())) {
          commands.add(cmd);
        }
      });
    }

    // Extract from choices
    q.choices?.forEach(choice => {
      const choiceCommands = choice.match(/[a-z-]+ [a-z-]+/gi);
      if (choiceCommands) {
        choiceCommands.forEach(cmd => commands.add(cmd));
      }
    });
  });

  return Array.from(commands).slice(0, 10);
}

// Update results display to show these commands
```

**Success Criteria:**
- [ ] Total of 50+ questions with correct domain distribution
- [ ] Review mode shows each question with correct/incorrect indication
- [ ] Explanations displayed for all questions in review mode
- [ ] Command recommendations shown based on missed questions
- [ ] Can navigate through all questions in review mode
- [ ] Existing timer and scoring functionality unchanged

---

## Phase 2: Fill Domain Gaps (MEDIUM PRIORITY)
**Goal:** Increase exam coverage from 83% to 93%
**Effort:** 15 hours
**Impact:** Complete Domain 4 coverage (70% → 85%)

### Task 2.1: Benchmark Simulators (10 hours)

**Objective:** Implement HPL, NCCL, and GPUBurn simulators

**Files to Create:**
- `src/simulators/benchmarkSimulator.ts` - HPL, NCCL, GPUBurn
- `src/data/benchmarkResults.ts` - Realistic performance data

**Implementation:**

```typescript
// src/simulators/benchmarkSimulator.ts
export class BenchmarkSimulator {

  /**
   * HPL (High-Performance Linpack) benchmark simulation
   */
  executeHPL(args: string[], context: CommandContext): CommandResult {
    const node = this.getNode(context);

    // Simulate HPL run with realistic output
    const gpuCount = node.gpus.length;
    const theoreticalFlops = gpuCount * 312; // TFlops per H100
    const actualFlops = theoreticalFlops * (0.85 + Math.random() * 0.05); // 85-90% efficiency

    const output = `
╔══════════════════════════════════════════════════════════════╗
║         HPL (High-Performance Linpack) Benchmark             ║
╚══════════════════════════════════════════════════════════════╝

Configuration:
  Problem Size (N):     215040
  Block Size (NB):      384
  Process Grid:         2 x 4
  GPUs:                 ${gpuCount}
  Memory per GPU:       80 GB

Running benchmark...
  [████████████████████████████████████████████] 100%

Results:
  Time:                 142.37 seconds
  Performance:          ${actualFlops.toFixed(2)} TFlops
  Theoretical Peak:     ${theoreticalFlops.toFixed(2)} TFlops
  Efficiency:           ${((actualFlops / theoreticalFlops) * 100).toFixed(1)}%

Status: ${actualFlops / theoreticalFlops > 0.80 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}
${actualFlops / theoreticalFlops < 0.80 ? '\n⚠ Performance below expected threshold. Check GPU health and NVLink topology.' : ''}
`;

    return { output, exitCode: 0 };
  }

  /**
   * NCCL (NVIDIA Collective Communications Library) tests
   */
  executeNCCL(args: string[], context: CommandContext): CommandResult {
    const node = this.getNode(context);
    const gpuCount = node.gpus.length;

    // Simulate all-reduce benchmark
    const busSizes = ['8B', '256B', '8KB', '256KB', '8MB', '256MB', '1GB'];
    const results = busSizes.map(size => {
      const bandwidth = this.calculateNCCLBandwidth(size, gpuCount);
      const latency = this.calculateNCCLLatency(size);
      return { size, bandwidth, latency };
    });

    const output = `
# NCCL All-Reduce Test
# GPUs: ${gpuCount}
# Using NVLink for GPU-to-GPU communication

       Size    Time    Bandwidth   Latency
       (B)     (us)    (GB/s)      (us)
${results.map(r => `${r.size.padStart(11)} ${r.latency.toFixed(2).padStart(8)} ${r.bandwidth.toFixed(2).padStart(11)} ${r.latency.toFixed(2).padStart(8)}`).join('\n')}

Summary:
  Average Bandwidth: ${(results.reduce((sum, r) => sum + r.bandwidth, 0) / results.length).toFixed(2)} GB/s
  Peak Bandwidth:    ${Math.max(...results.map(r => r.bandwidth)).toFixed(2)} GB/s
  Min Latency:       ${Math.min(...results.map(r => r.latency)).toFixed(2)} us

${Math.max(...results.map(r => r.bandwidth)) > 200 ? '\x1b[32m✓ NVLink bandwidth healthy\x1b[0m' : '\x1b[33m⚠ NVLink bandwidth below expected\x1b[0m'}
`;

    return { output, exitCode: 0 };
  }

  /**
   * GPUBurn stress test
   */
  executeGPUBurn(args: string[], context: CommandContext): CommandResult {
    const duration = parseInt(args[0]) || 60; // seconds
    const node = this.getNode(context);

    // Start stress test - updates GPU utilization to 100%
    node.gpus.forEach(gpu => {
      gpu.utilization = 100;
      gpu.temperature = 78 + Math.random() * 5; // 78-83°C under load
      gpu.powerDraw = gpu.powerLimit * 0.95; // 95% of power limit
    });

    const output = `
GPU Burn - GPU stress test
Burning for ${duration} seconds...

${node.gpus.map((gpu, idx) =>
  `GPU ${idx}: ${gpu.temperature.toFixed(1)}°C  ${gpu.powerDraw.toFixed(0)}W  ${gpu.utilization}%`
).join('\n')}

Status: Running...
Press Ctrl+C to stop early

Estimated completion: ${new Date(Date.now() + duration * 1000).toLocaleTimeString()}
`;

    // Schedule reset after duration
    setTimeout(() => {
      node.gpus.forEach(gpu => {
        gpu.utilization = 5 + Math.random() * 10;
        gpu.temperature = 40 + Math.random() * 10;
        gpu.powerDraw = 50 + Math.random() * 30;
      });
    }, duration * 1000);

    return { output, exitCode: 0 };
  }

  private calculateNCCLBandwidth(size: string, gpuCount: number): number {
    // Simplified calculation - real NCCL depends on topology
    const sizeBytes = this.parseSize(size);
    const baselineBW = 300; // GB/s for NVLink

    // Larger messages get higher bandwidth
    const efficiencyFactor = Math.min(1.0, sizeBytes / (8 * 1024 * 1024));

    return baselineBW * efficiencyFactor * (gpuCount / 8);
  }

  private calculateNCCLLatency(size: string): number {
    const sizeBytes = this.parseSize(size);
    const baseLatency = 5; // us
    return baseLatency + (sizeBytes / (300 * 1e9)) * 1e6; // us
  }

  private parseSize(size: string): number {
    const match = size.match(/^(\d+)(B|KB|MB|GB)$/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = { B: 1, KB: 1024, MB: 1024**2, GB: 1024**3 };
    return value * multipliers[unit];
  }
}
```

**Terminal Integration:**

```typescript
// src/components/Terminal.tsx
case 'hpl':
case 'nccl-test':
case 'gpuburn': {
  result = benchmarkSimulator.current.execute(command, args, currentContext.current);
  break;
}
```

**Success Criteria:**
- [ ] HPL shows realistic TFLOPS with 85-90% efficiency
- [ ] NCCL shows bandwidth/latency across message sizes
- [ ] GPUBurn stresses GPUs to 100% utilization
- [ ] Results integrate with fault injection (low performance if faults present)

---

### Task 2.2: Storage Validation Scenarios (5 hours)

**Objective:** Add NFS/GPFS/Lustre filesystem checks

**Files to Create:**
- `src/simulators/storageSimulator.ts` - df, mount, lfs commands

**Implementation:**

```typescript
// src/simulators/storageSimulator.ts
export class StorageSimulator {

  executeDf(args: string[], context: CommandContext): CommandResult {
    const humanReadable = args.includes('-h');

    const filesystems = [
      { device: '/dev/sda1', size: '500G', used: '45G', avail: '455G', use: '9%', mount: '/' },
      { device: 'nas01:/data', size: '10T', used: '7.2T', avail: '2.8T', use: '72%', mount: '/data' },
      { device: 'nas01:/home', size: '2T', used: '1.1T', avail: '900G', use: '55%', mount: '/home' },
      { device: 'gpfs1', size: '100T', used: '67T', avail: '33T', use: '67%', mount: '/scratch' },
    ];

    const output = `
Filesystem           ${humanReadable ? ' Size  Used Avail Use%' : '1K-blocks      Used Available Use%'} Mounted on
${filesystems.map(fs =>
  `${fs.device.padEnd(20)} ${fs.size.padStart(5)} ${fs.used.padStart(5)} ${fs.avail.padStart(6)} ${fs.use.padStart(4)} ${fs.mount}`
).join('\n')}
`;

    return { output, exitCode: 0 };
  }

  executeMount(args: string[], context: CommandContext): CommandResult {
    const output = `
/dev/sda1 on / type ext4 (rw,relatime)
nas01:/data on /data type nfs4 (rw,relatime,vers=4.2,rsize=1048576,wsize=1048576)
nas01:/home on /home type nfs4 (rw,relatime,vers=4.2,rsize=1048576,wsize=1048576)
gpfs1 on /scratch type gpfs (rw,relatime)
`;
    return { output, exitCode: 0 };
  }

  executeLFS(args: string[], context: CommandContext): CommandResult {
    // Lustre filesystem commands
    const subcommand = args[0];

    if (subcommand === 'df') {
      return {
        output: `
UUID                       bytes        Used   Available Use% Mounted on
lustre-MDT0000_UUID      953.6G      238.4G      715.2G  25% /scratch[MDT:0]
lustre-OST0000_UUID       35.2T       23.1T       12.1T  66% /scratch[OST:0]
lustre-OST0001_UUID       35.2T       22.8T       12.4T  65% /scratch[OST:1]
lustre-OST0002_UUID       35.2T       23.4T       11.8T  67% /scratch[OST:2]
lustre-OST0003_UUID       35.2T       23.0T       12.2T  65% /scratch[OST:3]

filesystem_summary:      140.8T       92.3T       48.5T  66% /scratch
`,
        exitCode: 0,
      };
    }

    return { output: 'lfs: unknown command', exitCode: 1 };
  }
}
```

**Success Criteria:**
- [ ] df shows realistic filesystem usage
- [ ] mount shows NFS, GPFS, Lustre mounts
- [ ] lfs df shows Lustre OST breakdown
- [ ] Storage checks integrate into bcm validate pod

---

## Phase 3: Visual Enhancements (MEDIUM PRIORITY)
**Goal:** Add visual learning aids
**Effort:** 20 hours
**Impact:** Improve comprehension of complex topologies

### Task 3.1: Historical Metrics with Charts (8 hours)

**Objective:** Add time-series charts for GPU metrics

**Files to Create:**
- `src/components/MetricsChart.tsx` - Recharts component
- `src/utils/metricsHistory.ts` - Historical data collection

**Dependencies:**
```bash
npm install recharts
```

**Implementation:**

```typescript
// src/utils/metricsHistory.ts
interface MetricSnapshot {
  timestamp: number;
  nodeId: string;
  gpuId: string;
  utilization: number;
  temperature: number;
  powerDraw: number;
  memoryUsed: number;
}

export class MetricsHistory {
  private static history: MetricSnapshot[] = [];
  private static maxSamples = 300; // 5 minutes at 1Hz

  static addSnapshot(node: Node): void {
    const timestamp = Date.now();

    node.gpus.forEach(gpu => {
      this.history.push({
        timestamp,
        nodeId: node.id,
        gpuId: gpu.id,
        utilization: gpu.utilization,
        temperature: gpu.temperature,
        powerDraw: gpu.powerDraw,
        memoryUsed: gpu.memory.used,
      });
    });

    // Trim old data
    if (this.history.length > this.maxSamples * node.gpus.length) {
      this.history = this.history.slice(-this.maxSamples * node.gpus.length);
    }
  }

  static getHistory(nodeId: string, gpuId: string): MetricSnapshot[] {
    return this.history.filter(
      s => s.nodeId === nodeId && s.gpuId === gpuId
    );
  }

  static clear(): void {
    this.history = [];
  }
}
```

```typescript
// src/components/MetricsChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export function MetricsChart({ nodeId, gpuId }: { nodeId: string; gpuId: string }) {
  const history = MetricsHistory.getHistory(nodeId, gpuId);

  const data = history.map(h => ({
    time: new Date(h.timestamp).toLocaleTimeString(),
    utilization: h.utilization,
    temperature: h.temperature,
    power: h.powerDraw,
  }));

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-gray-200 mb-4">GPU Metrics (Last 5 Minutes)</h3>

      <LineChart width={800} height={300} data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="time" stroke="#9CA3AF" />
        <YAxis stroke="#9CA3AF" />
        <Tooltip
          contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
          labelStyle={{ color: '#E5E7EB' }}
        />
        <Legend />
        <Line type="monotone" dataKey="utilization" stroke="#3B82F6" name="Utilization %" />
        <Line type="monotone" dataKey="temperature" stroke="#EF4444" name="Temperature °C" />
        <Line type="monotone" dataKey="power" stroke="#10B981" name="Power Draw W" />
      </LineChart>
    </div>
  );
}
```

**Success Criteria:**
- [ ] Chart updates in real-time with metric simulation
- [ ] 5-minute rolling window (300 samples)
- [ ] Toggle between metrics (utilization/temp/power/memory)
- [ ] Visible in Dashboard tab

---

### Task 3.2: NVLink Topology Visualization (8 hours)

**Objective:** D3.js graph showing GPU interconnect

**Files to Create:**
- `src/components/TopologyGraph.tsx` - D3.js visualization

**Dependencies:**
```bash
npm install d3 @types/d3
```

**Implementation:**

```typescript
// src/components/TopologyGraph.tsx
import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

export function TopologyGraph({ node }: { node: Node }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 800;
    const height = 600;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    // Create nodes for each GPU
    const nodes = node.gpus.map((gpu, idx) => ({
      id: gpu.id,
      name: `GPU ${idx}`,
      health: gpu.health,
      x: (idx % 4) * 180 + 100,
      y: Math.floor(idx / 4) * 200 + 100,
    }));

    // Create links for NVLink connections
    const links = [];
    node.gpus.forEach((gpu, idx) => {
      gpu.nvlinks.forEach(link => {
        const targetIdx = parseInt(link.remoteDeviceId.replace('GPU', ''));
        if (targetIdx > idx) { // Avoid duplicates
          links.push({
            source: nodes[idx],
            target: nodes[targetIdx],
            status: link.status,
            bandwidth: link.bandwidth,
          });
        }
      });
    });

    // Draw links
    svg.selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)
      .attr('stroke', d => d.status === 'Active' ? '#10B981' : '#EF4444')
      .attr('stroke-width', d => d.status === 'Active' ? 3 : 1)
      .attr('stroke-dasharray', d => d.status === 'Active' ? '0' : '5,5');

    // Draw nodes
    const nodeGroups = svg.selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.x}, ${d.y})`);

    nodeGroups.append('circle')
      .attr('r', 30)
      .attr('fill', d => d.health === 'Healthy' ? '#10B981' : '#EF4444')
      .attr('stroke', '#1F2937')
      .attr('stroke-width', 2);

    nodeGroups.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('fill', '#fff')
      .text(d => d.name.replace('GPU ', ''));

  }, [node]);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-gray-200 mb-4">NVLink Topology</h3>
      <svg ref={svgRef} className="w-full" />

      <div className="mt-4 flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <span className="text-gray-300">Active Link</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full" />
          <span className="text-gray-300">Down Link</span>
        </div>
      </div>
    </div>
  );
}
```

**Success Criteria:**
- [ ] Shows all 8 GPUs with NVLink connections
- [ ] Color-coded health (green=healthy, red=fault)
- [ ] Interactive hover showing bandwidth
- [ ] Updates when faults injected

---

### Task 3.3: InfiniBand Fabric Map (4 hours)

**Objective:** Visualize fat-tree topology

**Implementation:** Similar to Task 3.2 but showing switches and HCAs

**Success Criteria:**
- [ ] Shows leaf/spine switch hierarchy
- [ ] Color-coded link health
- [ ] Interactive node selection

---

## Phase 4: Quality & Polish (LOW PRIORITY)
**Goal:** Production-grade quality
**Effort:** 15 hours
**Impact:** Long-term maintainability

### Task 4.1: Unit Tests with Vitest (8 hours)

**Objective:** 70% code coverage

**Setup:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

**Test Files to Create:**
- `src/utils/__tests__/scenarioValidator.test.ts`
- `src/utils/__tests__/examScoring.test.ts`
- `src/simulators/__tests__/benchmarkSimulator.test.ts`
- `src/components/__tests__/PracticeExam.test.tsx`

**Example:**

```typescript
// src/utils/__tests__/examScoring.test.ts
import { describe, it, expect } from 'vitest';
import { ExamScorer } from '../examScoring';

describe('ExamScorer', () => {
  it('calculates score correctly', () => {
    const questions = [
      { id: 'q1', domain: 1, correctAnswer: 0 },
      { id: 'q2', domain: 1, correctAnswer: 1 },
      { id: 'q3', domain: 2, correctAnswer: 2 },
    ] as ExamQuestion[];

    const attempt = {
      id: 'test',
      answers: { q1: 0, q2: 1, q3: 0 }, // 2/3 correct
      startTime: 0,
      timeLimit: 5400,
      isComplete: true,
    };

    const result = ExamScorer.calculateScore(attempt, questions);

    expect(result.score).toBeCloseTo(66.67, 1);
    expect(result.passed).toBe(false);
    expect(result.passingScore).toBe(70);
  });

  it('identifies weak areas', () => {
    // Test domain breakdown logic
  });
});
```

**Success Criteria:**
- [ ] 70% code coverage across utils and simulators
- [ ] All scoring logic tested
- [ ] Validation logic tested
- [ ] CI integration (GitHub Actions)

---

### Task 4.2: Code Splitting (3 hours)

**Objective:** Reduce initial bundle to <400KB

**Implementation:**

```typescript
// src/App.tsx - Lazy load routes
const PracticeExam = lazy(() => import('./components/PracticeExam'));
const TopologyGraph = lazy(() => import('./components/TopologyGraph'));

// Lazy load simulators
const BenchmarkSimulator = lazy(() => import('./simulators/benchmarkSimulator'));
```

**Success Criteria:**
- [ ] Initial bundle <400KB
- [ ] Fast first paint (<1s)
- [ ] Lazy load heavy components

---

### Task 4.3: Accessibility Improvements (4 hours)

**Objective:** WCAG 2.1 AA compliance

**Changes:**
- Add ARIA labels to all interactive elements
- Keyboard navigation for terminal (Tab, Shift+Tab)
- Screen reader announcements for validation feedback
- Focus indicators for all buttons
- High contrast mode support

**Success Criteria:**
- [ ] Lighthouse accessibility score >90
- [ ] Keyboard-only navigation works
- [ ] Screen reader compatible

---

## Implementation Schedule

### Week 1: Educational Loop (16 hours)
- **Mon-Tue:** Task 1.1 - Scenario Validation (8h)
- **Wed-Thu:** Task 1.2 - Enhance Existing Exam (8h)
- **Deliverable:** Validated learning with enhanced assessment

### Week 2: Domain Coverage (15 hours)
- **Mon-Wed:** Task 2.1 - Benchmarks (10h)
- **Thu-Fri:** Task 2.2 - Storage (5h)
- **Deliverable:** 93% exam coverage

### Week 3: Visuals (20 hours)
- **Mon-Tue:** Task 3.1 - Charts (8h)
- **Wed-Thu:** Task 3.2 - NVLink Graph (8h)
- **Fri:** Task 3.3 - IB Fabric (4h)
- **Deliverable:** Visual learning aids

### Week 4: Quality (15 hours)
- **Mon-Tue:** Task 4.1 - Tests (8h)
- **Wed:** Task 4.2 - Code Splitting (3h)
- **Thu-Fri:** Task 4.3 - Accessibility (4h)
- **Deliverable:** Production-ready

**Total: 66 hours over 4 weeks** (reduced from 70 - exam system already exists!)

---

## Success Metrics

### Quantitative:
- [ ] Exam coverage: 83% → 93%
- [ ] Educational effectiveness: 70% → 95%
- [ ] Code coverage: 0% → 70%
- [ ] Bundle size: 558KB → <400KB
- [ ] Lighthouse score: ? → >90

### Qualitative:
- [ ] Students receive real-time feedback on progress
- [ ] Students can assess readiness with practice exam
- [ ] Complex topologies visualized clearly
- [ ] Application feels professional and polished

---

## Risk Mitigation

### High Risk: Scenario validation may not work with existing scenarios
**Mitigation:** Start with one scenario, validate approach, then expand
**Fallback:** Manual validation rules per scenario (more work but guaranteed to work)

### Medium Risk: D3.js complexity may exceed time estimate
**Mitigation:** Use simpler visualization library (Recharts supports graphs too)
**Fallback:** Static SVG diagrams as interim solution

### Low Risk: Test coverage may reveal bugs
**Mitigation:** Good thing! Fix bugs as discovered
**Fallback:** Document known issues, fix in Phase 5

---

## Phase 5: Future Enhancements (Optional)

After completing Phases 1-4, consider:

1. **Multi-language Support** (10h) - i18n for international users
2. **Cloud Save** (8h) - Firebase for progress sync
3. **Community Scenarios** (15h) - User-contributed labs
4. **Video Tutorials** (20h) - Embedded walkthroughs
5. **Mobile App** (40h) - React Native port
6. **AI Tutor** (30h) - GPT-4 integration for hints
7. **Certification Tracker** (5h) - Progress towards real exam
8. **Leaderboard** (8h) - Compete with other learners

**Total Future Enhancements: 136 hours**

---

## Getting Started

To begin implementation:

```bash
# 1. Create feature branch
git checkout -b feature/educational-improvements

# 2. Start with Task 1.1 (Scenario Validation)
# Create files:
touch src/types/validation.ts
touch src/utils/scenarioValidator.ts

# 3. Run dev server
npm run dev

# 4. Test as you build
npm run build  # Check for TypeScript errors

# 5. Commit frequently
git add .
git commit -m "feat: add scenario validation system"
```

**Recommended Order:**
1. Task 1.1 (Validation) - Highest impact, builds on existing
2. Task 1.2 (Exam) - Completes educational loop
3. Task 2.1 (Benchmarks) - Fills biggest gap
4. Task 3.1 (Charts) - Visual appeal
5. Tasks 4.x (Quality) - Production polish

---

## Questions & Decisions Needed

Before starting, clarify:

1. **Question Bank:** Should I generate all 50 exam questions or provide template?
2. **Charts:** Recharts vs D3.js for time-series? (Recharts easier, D3 more flexible)
3. **Testing:** Integration tests or unit tests only?
4. **Validation:** Auto-validate or require explicit "Check Answer" button?
5. **Accessibility:** Target WCAG AA or AAA?

**Recommendation:** Start with Phase 1, gather feedback, adjust plan as needed.

---

## Conclusion

This action plan transforms the simulator from an **exploratory tool** into a **complete certification training platform**. The phased approach ensures:

1. ✅ **Quick wins** - Validation and exam provide immediate value
2. ✅ **Focused effort** - Each phase has clear deliverables
3. ✅ **Manageable scope** - 70 hours is achievable over 1 month
4. ✅ **Measurable progress** - Success criteria for each task
5. ✅ **Flexibility** - Phases can be reordered based on priorities

**Next Step:** Review plan, approve priorities, begin Task 1.1 (Scenario Validation).
