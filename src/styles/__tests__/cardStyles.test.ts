// src/styles/__tests__/cardStyles.test.ts
import { describe, it, expect } from "vitest";
import {
  CARD_STYLES,
  BUTTON_STYLES,
  BADGE_STYLES,
  INPUT_STYLES,
  HEADING_STYLES,
  CODE_STYLES,
  UI_STYLES,
} from "../cardStyles";

describe("cardStyles", () => {
  describe("CARD_STYLES", () => {
    it("has required base card class", () => {
      expect(CARD_STYLES.base).toContain("bg-gray-800");
      expect(CARD_STYLES.base).toContain("border-gray-700");
      expect(CARD_STYLES.base).toContain("rounded-lg");
    });

    it("has interactive card with nvidia-green hover", () => {
      expect(CARD_STYLES.interactive).toContain("hover:border-nvidia-green");
    });

    it("has active card with nvidia-green border", () => {
      expect(CARD_STYLES.active).toContain("border-nvidia-green");
    });
  });

  describe("BUTTON_STYLES", () => {
    it("has primary button with nvidia-green", () => {
      expect(BUTTON_STYLES.primary).toContain("bg-nvidia-green");
    });

    it("has secondary button with gray styling", () => {
      expect(BUTTON_STYLES.secondary).toContain("bg-gray-800");
    });

    it("has danger button with red styling", () => {
      expect(BUTTON_STYLES.danger).toContain("bg-red-600");
    });
  });

  describe("BADGE_STYLES", () => {
    it("has all severity levels", () => {
      expect(BADGE_STYLES.success).toContain("text-green-400");
      expect(BADGE_STYLES.warning).toContain("text-yellow-400");
      expect(BADGE_STYLES.error).toContain("text-red-400");
      expect(BADGE_STYLES.info).toContain("text-blue-400");
    });

    it("has nvidia branded badge", () => {
      expect(BADGE_STYLES.nvidia).toContain("text-nvidia-green");
    });
  });

  describe("INPUT_STYLES", () => {
    it("has text input with focus styling", () => {
      expect(INPUT_STYLES.text).toContain("focus:border-nvidia-green");
    });

    it("has search input with left padding for icon", () => {
      expect(INPUT_STYLES.search).toContain("pl-10");
    });
  });

  describe("HEADING_STYLES", () => {
    it("has all heading levels", () => {
      expect(HEADING_STYLES.page).toContain("text-2xl");
      expect(HEADING_STYLES.section).toContain("text-xl");
      expect(HEADING_STYLES.card).toContain("text-lg");
      expect(HEADING_STYLES.subsection).toContain("text-sm");
    });
  });

  describe("CODE_STYLES", () => {
    it("has inline code with nvidia-green text", () => {
      expect(CODE_STYLES.inline).toContain("text-nvidia-green");
    });

    it("has code block with dark background", () => {
      expect(CODE_STYLES.block).toContain("bg-gray-900");
    });
  });

  describe("UI_STYLES", () => {
    it("exports all style categories", () => {
      expect(UI_STYLES.card).toBe(CARD_STYLES);
      expect(UI_STYLES.button).toBe(BUTTON_STYLES);
      expect(UI_STYLES.badge).toBe(BADGE_STYLES);
      expect(UI_STYLES.input).toBe(INPUT_STYLES);
      expect(UI_STYLES.heading).toBe(HEADING_STYLES);
      expect(UI_STYLES.code).toBe(CODE_STYLES);
    });
  });
});
