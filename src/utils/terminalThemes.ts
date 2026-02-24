/**
 * Terminal Themes System
 * Multiple color schemes for the xterm.js terminal
 */

import type { ITheme } from "@xterm/xterm";

export type ThemeId =
  | "nvidia"
  | "dark"
  | "light"
  | "solarized-dark"
  | "solarized-light"
  | "monokai"
  | "dracula"
  | "nord"
  | "gruvbox-dark"
  | "one-dark";

export interface TerminalThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  theme: ITheme;
  isDark: boolean;
}

/**
 * NVIDIA Theme (Default)
 * Green-on-black with NVIDIA accent colors
 */
const nvidiaTheme: ITheme = {
  background: "#000000",
  foreground: "#00ff00",
  cursor: "#76B900",
  cursorAccent: "#000000",
  selectionBackground: "#76B90050",
  selectionForeground: "#ffffff",
  selectionInactiveBackground: "#76B90030",
  black: "#000000",
  red: "#ff5555",
  green: "#76B900",
  yellow: "#f1fa8c",
  blue: "#bd93f9",
  magenta: "#ff79c6",
  cyan: "#8be9fd",
  white: "#bfbfbf",
  brightBlack: "#4d4d4d",
  brightRed: "#ff6e67",
  brightGreen: "#76B900",
  brightYellow: "#f4f99d",
  brightBlue: "#caa9fa",
  brightMagenta: "#ff92d0",
  brightCyan: "#9aedfe",
  brightWhite: "#e6e6e6",
};

/**
 * Dark Theme
 * Classic dark terminal with balanced colors
 */
const darkTheme: ITheme = {
  background: "#1e1e1e",
  foreground: "#d4d4d4",
  cursor: "#ffffff",
  cursorAccent: "#1e1e1e",
  selectionBackground: "#264f7850",
  selectionForeground: "#ffffff",
  selectionInactiveBackground: "#264f7830",
  black: "#000000",
  red: "#cd3131",
  green: "#0dbc79",
  yellow: "#e5e510",
  blue: "#2472c8",
  magenta: "#bc3fbc",
  cyan: "#11a8cd",
  white: "#e5e5e5",
  brightBlack: "#666666",
  brightRed: "#f14c4c",
  brightGreen: "#23d18b",
  brightYellow: "#f5f543",
  brightBlue: "#3b8eea",
  brightMagenta: "#d670d6",
  brightCyan: "#29b8db",
  brightWhite: "#ffffff",
};

/**
 * Light Theme
 * High contrast light background
 */
const lightTheme: ITheme = {
  background: "#ffffff",
  foreground: "#333333",
  cursor: "#000000",
  cursorAccent: "#ffffff",
  selectionBackground: "#add6ff50",
  selectionForeground: "#000000",
  selectionInactiveBackground: "#add6ff30",
  black: "#000000",
  red: "#cd3131",
  green: "#008000",
  yellow: "#795e00",
  blue: "#0451a5",
  magenta: "#bc05bc",
  cyan: "#0598bc",
  white: "#555555",
  brightBlack: "#666666",
  brightRed: "#cd3131",
  brightGreen: "#14ce14",
  brightYellow: "#b5ba00",
  brightBlue: "#0451a5",
  brightMagenta: "#bc05bc",
  brightCyan: "#0598bc",
  brightWhite: "#a5a5a5",
};

/**
 * Solarized Dark Theme
 * Popular eye-friendly dark theme
 */
const solarizedDarkTheme: ITheme = {
  background: "#002b36",
  foreground: "#839496",
  cursor: "#93a1a1",
  cursorAccent: "#002b36",
  selectionBackground: "#073642",
  selectionForeground: "#93a1a1",
  selectionInactiveBackground: "#073642",
  black: "#073642",
  red: "#dc322f",
  green: "#859900",
  yellow: "#b58900",
  blue: "#268bd2",
  magenta: "#d33682",
  cyan: "#2aa198",
  white: "#eee8d5",
  brightBlack: "#002b36",
  brightRed: "#cb4b16",
  brightGreen: "#586e75",
  brightYellow: "#657b83",
  brightBlue: "#839496",
  brightMagenta: "#6c71c4",
  brightCyan: "#93a1a1",
  brightWhite: "#fdf6e3",
};

/**
 * Solarized Light Theme
 * Popular eye-friendly light theme
 */
const solarizedLightTheme: ITheme = {
  background: "#fdf6e3",
  foreground: "#657b83",
  cursor: "#586e75",
  cursorAccent: "#fdf6e3",
  selectionBackground: "#eee8d5",
  selectionForeground: "#586e75",
  selectionInactiveBackground: "#eee8d5",
  black: "#073642",
  red: "#dc322f",
  green: "#859900",
  yellow: "#b58900",
  blue: "#268bd2",
  magenta: "#d33682",
  cyan: "#2aa198",
  white: "#eee8d5",
  brightBlack: "#002b36",
  brightRed: "#cb4b16",
  brightGreen: "#586e75",
  brightYellow: "#657b83",
  brightBlue: "#839496",
  brightMagenta: "#6c71c4",
  brightCyan: "#93a1a1",
  brightWhite: "#fdf6e3",
};

/**
 * Monokai Theme
 * Classic code editor theme
 */
const monokaiTheme: ITheme = {
  background: "#272822",
  foreground: "#f8f8f2",
  cursor: "#f8f8f0",
  cursorAccent: "#272822",
  selectionBackground: "#49483e",
  selectionForeground: "#f8f8f2",
  selectionInactiveBackground: "#49483e80",
  black: "#272822",
  red: "#f92672",
  green: "#a6e22e",
  yellow: "#f4bf75",
  blue: "#66d9ef",
  magenta: "#ae81ff",
  cyan: "#a1efe4",
  white: "#f8f8f2",
  brightBlack: "#75715e",
  brightRed: "#f92672",
  brightGreen: "#a6e22e",
  brightYellow: "#f4bf75",
  brightBlue: "#66d9ef",
  brightMagenta: "#ae81ff",
  brightCyan: "#a1efe4",
  brightWhite: "#f9f8f5",
};

/**
 * Dracula Theme
 * Popular dark theme with vibrant colors
 */
const draculaTheme: ITheme = {
  background: "#282a36",
  foreground: "#f8f8f2",
  cursor: "#f8f8f2",
  cursorAccent: "#282a36",
  selectionBackground: "#44475a",
  selectionForeground: "#f8f8f2",
  selectionInactiveBackground: "#44475a80",
  black: "#21222c",
  red: "#ff5555",
  green: "#50fa7b",
  yellow: "#f1fa8c",
  blue: "#bd93f9",
  magenta: "#ff79c6",
  cyan: "#8be9fd",
  white: "#f8f8f2",
  brightBlack: "#6272a4",
  brightRed: "#ff6e6e",
  brightGreen: "#69ff94",
  brightYellow: "#ffffa5",
  brightBlue: "#d6acff",
  brightMagenta: "#ff92df",
  brightCyan: "#a4ffff",
  brightWhite: "#ffffff",
};

/**
 * Nord Theme
 * Arctic, north-bluish color palette
 */
const nordTheme: ITheme = {
  background: "#2e3440",
  foreground: "#d8dee9",
  cursor: "#d8dee9",
  cursorAccent: "#2e3440",
  selectionBackground: "#434c5e",
  selectionForeground: "#d8dee9",
  selectionInactiveBackground: "#434c5e80",
  black: "#3b4252",
  red: "#bf616a",
  green: "#a3be8c",
  yellow: "#ebcb8b",
  blue: "#81a1c1",
  magenta: "#b48ead",
  cyan: "#88c0d0",
  white: "#e5e9f0",
  brightBlack: "#4c566a",
  brightRed: "#bf616a",
  brightGreen: "#a3be8c",
  brightYellow: "#ebcb8b",
  brightBlue: "#81a1c1",
  brightMagenta: "#b48ead",
  brightCyan: "#8fbcbb",
  brightWhite: "#eceff4",
};

/**
 * Gruvbox Dark Theme
 * Retro groove color scheme
 */
const gruvboxDarkTheme: ITheme = {
  background: "#282828",
  foreground: "#ebdbb2",
  cursor: "#ebdbb2",
  cursorAccent: "#282828",
  selectionBackground: "#504945",
  selectionForeground: "#ebdbb2",
  selectionInactiveBackground: "#50494580",
  black: "#282828",
  red: "#cc241d",
  green: "#98971a",
  yellow: "#d79921",
  blue: "#458588",
  magenta: "#b16286",
  cyan: "#689d6a",
  white: "#a89984",
  brightBlack: "#928374",
  brightRed: "#fb4934",
  brightGreen: "#b8bb26",
  brightYellow: "#fabd2f",
  brightBlue: "#83a598",
  brightMagenta: "#d3869b",
  brightCyan: "#8ec07c",
  brightWhite: "#ebdbb2",
};

/**
 * One Dark Theme
 * Atom One Dark inspired
 */
const oneDarkTheme: ITheme = {
  background: "#282c34",
  foreground: "#abb2bf",
  cursor: "#528bff",
  cursorAccent: "#282c34",
  selectionBackground: "#3e4451",
  selectionForeground: "#abb2bf",
  selectionInactiveBackground: "#3e445180",
  black: "#282c34",
  red: "#e06c75",
  green: "#98c379",
  yellow: "#e5c07b",
  blue: "#61afef",
  magenta: "#c678dd",
  cyan: "#56b6c2",
  white: "#abb2bf",
  brightBlack: "#5c6370",
  brightRed: "#e06c75",
  brightGreen: "#98c379",
  brightYellow: "#e5c07b",
  brightBlue: "#61afef",
  brightMagenta: "#c678dd",
  brightCyan: "#56b6c2",
  brightWhite: "#ffffff",
};

/**
 * All available themes
 */
export const TERMINAL_THEMES: Record<ThemeId, TerminalThemeConfig> = {
  nvidia: {
    id: "nvidia",
    name: "NVIDIA",
    description: "Official NVIDIA green on black theme",
    theme: nvidiaTheme,
    isDark: true,
  },
  dark: {
    id: "dark",
    name: "Dark",
    description: "Classic dark terminal with balanced colors",
    theme: darkTheme,
    isDark: true,
  },
  light: {
    id: "light",
    name: "Light",
    description: "High contrast light background",
    theme: lightTheme,
    isDark: false,
  },
  "solarized-dark": {
    id: "solarized-dark",
    name: "Solarized Dark",
    description: "Eye-friendly dark color scheme",
    theme: solarizedDarkTheme,
    isDark: true,
  },
  "solarized-light": {
    id: "solarized-light",
    name: "Solarized Light",
    description: "Eye-friendly light color scheme",
    theme: solarizedLightTheme,
    isDark: false,
  },
  monokai: {
    id: "monokai",
    name: "Monokai",
    description: "Classic code editor theme",
    theme: monokaiTheme,
    isDark: true,
  },
  dracula: {
    id: "dracula",
    name: "Dracula",
    description: "Popular dark theme with vibrant colors",
    theme: draculaTheme,
    isDark: true,
  },
  nord: {
    id: "nord",
    name: "Nord",
    description: "Arctic, north-bluish color palette",
    theme: nordTheme,
    isDark: true,
  },
  "gruvbox-dark": {
    id: "gruvbox-dark",
    name: "Gruvbox Dark",
    description: "Retro groove color scheme",
    theme: gruvboxDarkTheme,
    isDark: true,
  },
  "one-dark": {
    id: "one-dark",
    name: "One Dark",
    description: "Atom One Dark inspired",
    theme: oneDarkTheme,
    isDark: true,
  },
};

/**
 * Get theme configuration by ID
 */
export function getTheme(themeId: ThemeId): TerminalThemeConfig {
  return TERMINAL_THEMES[themeId] || TERMINAL_THEMES.nvidia;
}

/**
 * Get all available themes
 */
export function getAllThemes(): TerminalThemeConfig[] {
  return Object.values(TERMINAL_THEMES);
}

/**
 * Get dark themes only
 */
export function getDarkThemes(): TerminalThemeConfig[] {
  return getAllThemes().filter((t) => t.isDark);
}

/**
 * Get light themes only
 */
export function getLightThemes(): TerminalThemeConfig[] {
  return getAllThemes().filter((t) => !t.isDark);
}

/**
 * Theme storage key
 */
const THEME_STORAGE_KEY = "terminal-theme";

/**
 * Save theme preference to localStorage
 */
export function saveThemePreference(themeId: ThemeId): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Load theme preference from localStorage
 */
export function loadThemePreference(): ThemeId {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && saved in TERMINAL_THEMES) {
      return saved as ThemeId;
    }
  } catch {
    // localStorage may be unavailable
  }
  return "nvidia"; // Default theme
}

/**
 * Get ANSI color codes for a theme
 * Useful for generating theme-aware prompt colors
 */
export function getThemeAnsiColors(themeId: ThemeId): {
  primary: string;
  secondary: string;
  success: string;
  error: string;
  warning: string;
  info: string;
} {
  const config = getTheme(themeId);
  const theme = config.theme;

  // Map theme colors to semantic ANSI codes
  return {
    primary: theme.foreground || "#ffffff",
    secondary: theme.brightBlack || "#666666",
    success: theme.green || "#00ff00",
    error: theme.red || "#ff0000",
    warning: theme.yellow || "#ffff00",
    info: theme.cyan || "#00ffff",
  };
}

/**
 * Generate CSS variables for theme integration
 */
export function getThemeCssVariables(themeId: ThemeId): Record<string, string> {
  const config = getTheme(themeId);
  const theme = config.theme;

  return {
    "--terminal-bg": theme.background || "#000000",
    "--terminal-fg": theme.foreground || "#ffffff",
    "--terminal-cursor": theme.cursor || "#ffffff",
    "--terminal-selection": theme.selectionBackground || "#ffffff50",
    "--terminal-red": theme.red || "#ff0000",
    "--terminal-green": theme.green || "#00ff00",
    "--terminal-yellow": theme.yellow || "#ffff00",
    "--terminal-blue": theme.blue || "#0000ff",
    "--terminal-magenta": theme.magenta || "#ff00ff",
    "--terminal-cyan": theme.cyan || "#00ffff",
  };
}
