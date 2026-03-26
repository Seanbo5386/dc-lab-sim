import { useState, useEffect, useRef, useCallback } from "react";
import {
  executeCommand,
  resetFallbackIndex,
  type CommandResult,
} from "../data/easterEggShell";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LineType =
  | "briefing"
  | "narrative"
  | "prompt"
  | "command"
  | "output"
  | "blank";

interface SequenceLine {
  type: LineType;
  text: string;
  /** Delay in ms *before* this line appears */
  delay: number;
}

// ---------------------------------------------------------------------------
// Sequence data — full terminal (wide screens)
// ---------------------------------------------------------------------------

// Every line is exactly 75 characters (3-column format matching real nvidia-smi)
const NVIDIA_SMI_OUTPUT = [
  "+---------------------------------+----------------------+----------------+",
  "| GPU  Name        Persistence-M  | Bus-Id        Disp.A | Volatile ECC   |",
  "| Fan  Temp  Perf  Pwr:Usage/Cap  |      Memory-Usage    | GPU-Util       |",
  "|=================================+======================+================|",
  "|   0  A100-SXM4-80GB        On   | 00000000:07:00.0 Off |              0 |",
  "| N/A   62C    P0   287W / 400W   |  76431MiB / 81920MiB |     96%        |",
  "+---------------------------------+----------------------+----------------+",
  "|   1  A100-SXM4-80GB        On   | 00000000:0B:00.0 Off |              0 |",
  "| N/A   60C    P0   275W / 400W   |  76431MiB / 81920MiB |     95%        |",
  "+---------------------------------+----------------------+----------------+",
  "|   2  A100-SXM4-80GB        On   | 00000000:48:00.0 Off |              0 |",
  "| N/A   61C    P0   281W / 400W   |  76431MiB / 81920MiB |     96%        |",
  "+---------------------------------+----------------------+----------------+",
  "|   3  A100-SXM4-80GB        On   | 00000000:BD:00.0 Off |              8 |",
  "| N/A   85C    P0   389W / 400W   |  76431MiB / 81920MiB |     97%        |",
  "+---------------------------------+----------------------+----------------+",
];

const DCGMI_OUTPUT = [
  "+---------------------------+",
  "| Diagnostic Results        |",
  "+===========================+",
  "| GPU 0: PASS               |",
  "| GPU 1: PASS               |",
  "| GPU 2: PASS               |",
  "| GPU 3: FAIL               |",
  "|   XID Error 63 detected   |",
  "|   Memory row remap needed |",
  "+---------------------------+",
];

const CHAR_DELAY = 50; // ms per character for typing animation

const SEQUENCE: SequenceLine[] = [
  { type: "briefing", text: "[MISSION BRIEFING]", delay: 400 },
  { type: "narrative", text: "The Midnight Deployment", delay: 300 },
  {
    type: "narrative",
    text: "It's 2AM. A 4-GPU training job on DGX Node 3 is throwing",
    delay: 600,
  },
  {
    type: "narrative",
    text: "errors and losing steps. You need to find the bad GPU...",
    delay: 400,
  },
  { type: "blank", text: "", delay: 800 },
  { type: "prompt", text: "root@dgx-00:~# ", delay: 300 },
  { type: "command", text: "nvidia-smi", delay: 0 },
  {
    type: "output",
    text: NVIDIA_SMI_OUTPUT.join("\n"),
    delay: 400,
  },
  { type: "blank", text: "", delay: 600 },
  { type: "prompt", text: "root@dgx-00:~# ", delay: 300 },
  { type: "command", text: "dcgmi diag -r 1", delay: 0 },
  {
    type: "output",
    text: DCGMI_OUTPUT.join("\n"),
    delay: 400,
  },
  { type: "blank", text: "", delay: 600 },
  { type: "prompt", text: "root@dgx-00:~# ", delay: 300 },
];

// ---------------------------------------------------------------------------
// Sequence data — compact diagnostic scan (narrow screens)
// ---------------------------------------------------------------------------

const COMPACT_SEQUENCE: SequenceLine[] = [
  { type: "briefing", text: "[SYSTEM DIAGNOSTIC]", delay: 400 },
  { type: "narrative", text: "DGX SuperPOD — Node 3", delay: 300 },
  { type: "blank", text: "", delay: 600 },
  { type: "output", text: "\u25B8 GPU fabric ............. OK", delay: 500 },
  { type: "output", text: "\u25B8 NVLink mesh ............ OK", delay: 400 },
  { type: "output", text: "\u25B8 InfiniBand ............. OK", delay: 400 },
  { type: "output", text: "\u25B8 NCCL all-reduce ........ OK", delay: 400 },
  { type: "output", text: "\u25B8 Thermal sensors ........ WARN", delay: 600 },
  { type: "output", text: "\u25B8 ECC memory check ....... FAIL", delay: 800 },
  { type: "blank", text: "", delay: 400 },
  { type: "output", text: "  \u2514\u2500 GPU 3: XID Error 63", delay: 500 },
  {
    type: "output",
    text: "  \u2514\u2500 Uncorrectable ECC \u00D7 8",
    delay: 400,
  },
  { type: "output", text: "  \u2514\u2500 Row remap required", delay: 400 },
  { type: "blank", text: "", delay: 600 },
  {
    type: "briefing",
    text: "\u26A0 Diagnosis: Hardware fault on GPU 3",
    delay: 500,
  },
  { type: "blank", text: "", delay: 400 },
  { type: "prompt", text: "root@dgx-00:~# ", delay: 300 },
];

/** Minimum viewport width (px) for the full terminal demo */
const WIDE_BREAKPOINT = 640;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

// ---------------------------------------------------------------------------
// Visible line model (what has been rendered so far)
// ---------------------------------------------------------------------------

interface VisibleLine {
  type: LineType;
  text: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TerminalDemoProps {
  onEnterApp?: () => void;
}

export const TerminalDemo: React.FC<TerminalDemoProps> = ({ onEnterApp }) => {
  const [lines, setLines] = useState<VisibleLine[]>([]);
  const [typingText, setTypingText] = useState<string | null>(null);
  const [animationDone, setAnimationDone] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  // Interactive easter-egg state
  const [inputBuffer, setInputBuffer] = useState("");
  const inputBufferRef = useRef("");
  const [interactiveLines, setInteractiveLines] = useState<VisibleLine[]>([]);
  const cwdRef = useRef("/home/operator");
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const abortRef = useRef<AbortController | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect whether we should use compact mode based on container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const check = () => setIsCompact(el.clientWidth < WIDE_BREAKPOINT);
    check();

    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const runSequence = useCallback(
    async (signal: AbortSignal, seq: SequenceLine[]) => {
      for (let i = 0; i < seq.length; i++) {
        const line = seq[i];

        // Wait the delay before showing this line
        if (line.delay > 0) {
          await sleep(line.delay, signal);
        }

        if (line.type === "command") {
          // Typing animation: character by character
          for (let c = 0; c <= line.text.length; c++) {
            setTypingText(line.text.slice(0, c));
            if (c < line.text.length) {
              await sleep(CHAR_DELAY, signal);
            }
          }
          // After typing is done, commit the command line by appending the
          // typed text to the previous prompt line and clear typing state
          setLines((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].type === "prompt") {
              updated[lastIdx] = {
                ...updated[lastIdx],
                text: updated[lastIdx].text + line.text,
              };
            }
            return updated;
          });
          setTypingText(null);
        } else {
          // Show the full line at once
          setLines((prev) => [...prev, { type: line.type, text: line.text }]);
        }
      }

      // Animation complete — interactive mode will take over the cursor
      setAnimationDone(true);
    },
    [],
  );

  // Auto-scroll terminal body to bottom as new lines appear
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [lines, typingText, interactiveLines, inputBuffer]);

  // Interactive keyboard handler — only active after animation completes
  useEffect(() => {
    if (!animationDone) return;
    resetFallbackIndex();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier-only presses and combos (except Shift for uppercase)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "Enter") {
        e.preventDefault();
        const cmd = inputBufferRef.current;
        const prompt = `root@dgx-00:${cwdRef.current === "/home/operator" ? "~" : cwdRef.current}# `;

        // Append the prompt+command as a visible line
        setInteractiveLines((prev) => [
          ...prev,
          { type: "prompt" as LineType, text: prompt + cmd },
        ]);
        inputBufferRef.current = "";
        setInputBuffer("");

        if (!cmd.trim()) return;

        const result: CommandResult = executeCommand(cwdRef.current, cmd);
        cwdRef.current = result.newCwd;

        if (result.clear) {
          setInteractiveLines([]);
          return;
        }

        // Append output lines
        if (result.output.length > 0) {
          setInteractiveLines((prev) => [
            ...prev,
            ...result.output.map((text) => ({
              type: "output" as LineType,
              text,
            })),
          ]);
        }

        // Auto-advance after a delay
        if (result.autoAdvance && onEnterApp) {
          autoAdvanceTimerRef.current = setTimeout(() => {
            onEnterApp();
          }, 1500);
        }
      } else if (e.key === "Backspace") {
        e.preventDefault();
        inputBufferRef.current = inputBufferRef.current.slice(0, -1);
        setInputBuffer(inputBufferRef.current);
      } else if (e.key === "Tab") {
        e.preventDefault();
        // No tab completion — do nothing
      } else if (e.key.length === 1) {
        e.preventDefault();
        inputBufferRef.current += e.key;
        setInputBuffer(inputBufferRef.current);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, [animationDone, onEnterApp]);

  // Start the animation sequence (restarts when compact mode changes)
  useEffect(() => {
    // Reset state for new run
    setLines([]);
    setTypingText(null);
    setAnimationDone(false);
    setInteractiveLines([]);
    setInputBuffer("");
    inputBufferRef.current = "";
    cwdRef.current = "/home/operator";

    const controller = new AbortController();
    abortRef.current = controller;

    const seq = isCompact ? COMPACT_SEQUENCE : SEQUENCE;
    runSequence(controller.signal, seq).catch((err) => {
      if (err?.name !== "AbortError") {
        console.error("TerminalDemo animation error:", err);
      }
    });

    return () => {
      controller.abort();
    };
  }, [runSequence, isCompact]);

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  const renderLine = (line: VisibleLine, index: number) => {
    if (line.type === "blank") {
      return <div key={index} className="h-4" />;
    }

    if (line.type === "briefing") {
      return (
        <div key={index} className="font-bold" style={{ color: "#76B900" }}>
          {line.text}
        </div>
      );
    }

    if (line.type === "narrative") {
      // First narrative line (title) is white+bold, rest are gray
      const isTitle =
        line.text === "The Midnight Deployment" ||
        line.text === "DGX SuperPOD \u2014 Node 3";
      return (
        <div
          key={index}
          className={isTitle ? "font-bold text-white" : "text-gray-400"}
        >
          {line.text}
        </div>
      );
    }

    if (line.type === "prompt") {
      // If this is the last line, the animation may still be typing onto it
      const isLastLine = index === lines.length - 1;
      const isTyping = isLastLine && typingText !== null;
      return (
        <div key={index} className="flex">
          <span style={{ color: "#76B900" }}>{line.text}</span>
          {isTyping && <span className="text-white">{typingText}</span>}
          {isTyping && (
            <span
              className="inline-block w-2 h-4 ml-px animate-blink"
              style={{ backgroundColor: "#76B900" }}
            />
          )}
        </div>
      );
    }

    if (line.type === "output") {
      // In compact mode, colorize OK / WARN / FAIL status text
      if (isCompact) {
        const failMatch = line.text.match(/^(.+)(FAIL)$/);
        const warnMatch = line.text.match(/^(.+)(WARN)$/);
        const okMatch = line.text.match(/^(.+)(OK)$/);
        if (failMatch) {
          return (
            <div key={index} className="text-gray-400 whitespace-pre">
              {failMatch[1]}
              <span className="text-red-400 font-bold">{failMatch[2]}</span>
            </div>
          );
        }
        if (warnMatch) {
          return (
            <div key={index} className="text-gray-400 whitespace-pre">
              {warnMatch[1]}
              <span className="text-yellow-400 font-bold">{warnMatch[2]}</span>
            </div>
          );
        }
        if (okMatch) {
          return (
            <div key={index} className="text-gray-400 whitespace-pre">
              {okMatch[1]}
              <span style={{ color: "#76B900" }}>{okMatch[2]}</span>
            </div>
          );
        }
      }
      return (
        <div key={index} className="text-gray-400 whitespace-pre">
          {line.text}
        </div>
      );
    }

    // Fallback (command text already merged into prompt)
    return (
      <div key={index} className="text-white">
        {line.text}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      data-testid="terminal-demo"
      className="rounded-lg border border-gray-700 bg-gray-950 overflow-hidden font-mono text-xs leading-relaxed"
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-700">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
        <span className="ml-2 text-xs text-gray-400">
          Terminal &mdash; dgx-00
        </span>
      </div>

      {/* Terminal body */}
      <div
        ref={bodyRef}
        className="p-4 h-[420px] overflow-y-auto scrollbar-thin"
      >
        {lines.map((line, i) => {
          // Skip the final animation prompt — the interactive input line replaces it
          if (animationDone && i === lines.length - 1 && line.type === "prompt")
            return null;
          return renderLine(line, i);
        })}

        {/* Interactive lines (easter egg) */}
        {interactiveLines.map((line, i) => renderLine(line, lines.length + i))}

        {/* Live input prompt */}
        {animationDone && (
          <div className="flex">
            <span style={{ color: "#76B900" }}>
              root@dgx-00:
              {cwdRef.current === "/home/operator" ? "~" : cwdRef.current}#{" "}
            </span>
            <span className="text-white">{inputBuffer}</span>
            <span
              className="inline-block w-2 h-4 ml-px animate-blink"
              style={{ backgroundColor: "#76B900" }}
            />
          </div>
        )}
      </div>

      {/* Blink keyframes injected via style tag */}
      <style>{`
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 1s step-end infinite;
        }
      `}</style>
    </div>
  );
};
