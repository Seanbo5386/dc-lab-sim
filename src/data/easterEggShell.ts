// ---------------------------------------------------------------------------
// Terminal input handler – onboarding shell emulation layer
// ---------------------------------------------------------------------------

type N = { [k: string]: N | string };

const d = (s: string) =>
  new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));

const _t: N = {
  home: {
    operator: {
      "notes.txt": d(
        "UmVtZW1iZXI6IEdQVSAzIHJ1bnMgaG90LiBEb24ndCB0ZWxsIGFueW9uZS4=",
      ),
      "todo.txt": d(
        "MS4gUGFzcyBOQ1AtQUlJIGV4YW0KMi4gRG9uJ3QgYnJlYWsgcHJvZHVjdGlvbgozLiDimJAgQm90aA==",
      ),
      ".bash_history": d("UmVzdHJpY3RlZC4="),
    },
  },
  var: {
    log: {
      syslog: d(
        "WyAgT0sgIF0gU3RhcnRlZCBOVklESUEgUGVyc2lzdGVuY2UgRGFlbW9uLgpbICBPSyAgXSBSZWFjaGVkIHRhcmdldCBOVklESUEgREdYIFNlcnZpY2VzLgpbICBPSyAgXSBTdGFydGVkIERDR00gSG9zdCBFbmdpbmUu",
      ),
      "gpu_errors.log": d(
        "RVJST1I6IEdQVSA3IHRlbXAgZXhjZWVkZWQgdGhyZXNob2xkLi4uIGp1c3Qga2lkZGluZy4gRm9yIG5vdy4=",
      ),
    },
  },
  opt: {
    nvidia: {
      VERSION: d("REdYIE9TIDYuMi4xIOKAlCBTaW11bGF0aW9uIExheWVyIEFjdGl2ZQ=="),
    },
  },
  etc: {
    motd: d(
      "V2VsY29tZSB0byBER1ggQ2x1c3RlciBOb2RlIGRneC0wMC4gQXV0aG9yaXplZCBwZXJzb25uZWwgb25seS4=",
    ),
  },
  missions: {
    "briefing.txt": d("WW91ciB0cmFpbmluZyBiZWdpbnMgbm93LCBvcGVyYXRvci4="),
  },
  classified: {},
};

// -- path utilities --

function _n(p: string): string[] {
  const s = p.split("/").filter(Boolean);
  const r: string[] = [];
  for (const x of s) {
    if (x === ".") continue;
    if (x === "..") r.pop();
    else r.push(x);
  }
  return r;
}

function _r(c: string, t: string): string[] {
  return t.startsWith("/") ? _n(t) : _n(c + "/" + t);
}

function _l(p: string[]): N | string | null {
  let n: N | string = _t;
  for (const k of p) {
    if (typeof n === "string") return null;
    if (!(k in n)) return null;
    n = n[k];
  }
  return n;
}

function _d(n: N | string | null): n is N {
  return n !== null && typeof n !== "string";
}

function _p(p: string[]): string {
  return "/" + p.join("/");
}

// -- public interface --

export interface CommandResult {
  output: string[];
  newCwd: string;
  autoAdvance?: boolean;
  clear?: boolean;
}

const _fb = [
  d("Q29tbWFuZCBub3QgZm91bmQuIFR5cGUgJ2hlbHAnIGZvciBhdmFpbGFibGUgY29tbWFuZHMu"),
  d("Tm90IGEgcmVjb2duaXplZCBjb21tYW5kLg=="),
  d("VW5rbm93biBjb21tYW5kLiBUeXBlICdoZWxwJyB0byBzZWUgd2hhdCdzIGF2YWlsYWJsZS4="),
  d("Q29tbWFuZCBub3QgcmVjb2duaXplZC4gVHJ5ICdoZWxwJy4="),
];

let _fi = 0;

function _nf(): string {
  const m = _fb[_fi];
  _fi = _fi === 0 ? 1 : _fi >= _fb.length - 1 ? 1 : _fi + 1;
  return m;
}

export function resetFallbackIndex(): void {
  _fi = 0;
}

const _h = [
  "Available commands:",
  "  help            Show this message",
  "  ls [path]       List directory contents",
  "  cd [path]       Change directory",
  "  pwd             Print working directory",
  "  cat <file>      Display file contents",
  "  whoami          Display current user",
  "  nvidia-smi      GPU summary",
  "  clear           Clear terminal",
  "  exit            Exit terminal",
];

const _smi = [
  "+-----------------------------------------------------------------------------+",
  d(
    "fCBOVklESUEtU01JIDUzNS4xMjkuMDMgICBEcml2ZXI6IDUzNS4xMjkuMDMgICBDVURBOiAxMi4yICAgICAgICAgICAgICAgICAgICAgfA==",
  ),
  d(
    "fCA4eCBBMTAwLVNYTTQtODBHQiAgICAgIDY0MCBHaUIgdG90YWwgICAgICBBdmcgVXRpbDogOTQlICAgICAgICAgICAgICAgICAgICB8",
  ),
  "+-----------------------------------------------------------------------------+",
];

// -- response map (keyed by command, values are base64-encoded) --
const _rm: Record<string, { v: string; a?: boolean }> = {
  whoami: { v: "cm9vdEBkZ3gtY2x1c3RlciDigJQgY2xlYXJhbmNlOiBQRU5ESU5H" },
  exit: { v: "TG9nb3V0IGRpc2FibGVkIGR1cmluZyBvbmJvYXJkaW5nLg==" },
  hello: { v: "SGVsbG8sIG9wZXJhdG9yLiBZb3VyIHNoaWZ0IHN0YXJ0cyBub3cu", a: true },
  hi: { v: "SGVsbG8sIG9wZXJhdG9yLiBZb3VyIHNoaWZ0IHN0YXJ0cyBub3cu", a: true },
  sudo: { v: "VGhpcyBpbmNpZGVudCB3aWxsIGJlIHJlcG9ydGVkLg==" },
  hack: { v: "Q29ubmVjdGlvbiBlc3RhYmxpc2hlZC4=", a: true },
};

const _deny = d("YWNjZXNzIGRlbmllZCDigJQgaW5zdWZmaWNpZW50IGNsZWFyYW5jZS4=");

export function executeCommand(cwd: string, rawInput: string): CommandResult {
  const input = rawInput.trim();
  if (!input) return { output: [], newCwd: cwd };

  const [cmd, ...args] = input.split(/\s+/);
  const lc = cmd.toLowerCase();

  if (lc === "help") return { output: _h, newCwd: cwd };
  if (lc === "pwd") return { output: [cwd], newCwd: cwd };
  if (lc === "clear") return { output: [], newCwd: cwd, clear: true };
  if (lc === "nvidia-smi") return { output: _smi, newCwd: cwd };

  // Response-map lookup (whoami, exit, hello, hi, sudo, hack)
  const mapped = _rm[lc];
  if (mapped) {
    return {
      output: [d(mapped.v)],
      newCwd: cwd,
      ...(mapped.a ? { autoAdvance: true } : {}),
    };
  }

  // ls
  if (lc === "ls") {
    const tp = args.length > 0 ? _r(cwd, args[0]) : _n(cwd);
    if (tp[0] === "classified")
      return { output: [`ls: ${_deny}`], newCwd: cwd };
    const node = tp.length === 0 ? _t : _l(tp);
    if (node === null)
      return {
        output: [
          `ls: cannot access '${args[0] || _p(tp)}': No such file or directory`,
        ],
        newCwd: cwd,
      };
    if (typeof node === "string")
      return { output: [args[0] || _p(tp)], newCwd: cwd };
    const entries = Object.keys(node)
      .filter((k) => !k.startsWith("."))
      .map((k) => (typeof node[k] === "string" ? k : k + "/"))
      .sort();
    return {
      output: entries.length > 0 ? [entries.join("  ")] : ["(empty)"],
      newCwd: cwd,
    };
  }

  // cd
  if (lc === "cd") {
    if (args.length === 0) return { output: [], newCwd: "/home/operator" };
    const tp = _r(cwd, args[0]);
    if (tp[0] === "classified")
      return { output: [`cd: ${_deny}`], newCwd: cwd };
    if (tp.length === 0) return { output: [], newCwd: "/" };
    const node = _l(tp);
    if (node === null)
      return { output: [`cd: no such directory: ${args[0]}`], newCwd: cwd };
    if (typeof node === "string")
      return { output: [`cd: not a directory: ${args[0]}`], newCwd: cwd };
    return { output: [], newCwd: _p(tp) };
  }

  // cat
  if (lc === "cat") {
    if (args.length === 0)
      return { output: ["Usage: cat <filename>"], newCwd: cwd };
    const tp = _r(cwd, args[0]);
    if (tp[0] === "classified")
      return { output: [`cat: ${_deny}`], newCwd: cwd };
    const node = _l(tp);
    if (node === null)
      return {
        output: [`cat: ${args[0]}: No such file or directory`],
        newCwd: cwd,
      };
    if (_d(node))
      return { output: [`cat: ${args[0]}: Is a directory`], newCwd: cwd };
    if (_p(tp) === "/missions/briefing.txt")
      return { output: [node], newCwd: cwd, autoAdvance: true };
    return { output: node.split("\n"), newCwd: cwd };
  }

  return { output: [_nf()], newCwd: cwd };
}
