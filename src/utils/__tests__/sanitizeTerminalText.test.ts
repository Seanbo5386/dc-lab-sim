import { describe, it, expect } from "vitest";
import { stripControlSequences } from "../sanitizeTerminalText";

describe("stripControlSequences (F1)", () => {
  it("removes the clear-screen CSI sequence", () => {
    expect(stripControlSequences("before\x1b[2Jafter")).toBe("beforeafter");
  });

  it("removes SGR color sequences", () => {
    expect(stripControlSequences("\x1b[31mRED\x1b[0m")).toBe("RED");
  });

  it("removes NUL and other C0 control bytes", () => {
    expect(stripControlSequences("a\x00b\x07c\x1fd")).toBe("abcd");
  });

  it("removes a lone ESC byte", () => {
    expect(stripControlSequences("x\x1by")).toBe("xy");
  });

  it("removes DEL (0x7F)", () => {
    expect(stripControlSequences("a\x7fb")).toBe("ab");
  });

  it("preserves newline, carriage return, and tab", () => {
    expect(stripControlSequences("a\nb\rc\td")).toBe("a\nb\rc\td");
  });

  it("preserves printable Unicode and emoji", () => {
    expect(stripControlSequences("🔥 العربية café")).toBe("🔥 العربية café");
  });

  it("leaves ordinary text untouched", () => {
    expect(stripControlSequences("hello world")).toBe("hello world");
  });
});
