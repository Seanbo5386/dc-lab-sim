// src/styles/cardStyles.ts
// Shared card style constants for UI consistency

/**
 * Standard card styles used throughout the application.
 * Using these constants ensures visual consistency across all components.
 */
export const CARD_STYLES = {
  // Base card container
  base: "bg-gray-800 border border-gray-700 rounded-lg",

  // Card with padding
  padded: "bg-gray-800 border border-gray-700 rounded-lg p-4",

  // Card with larger padding
  paddedLarge: "bg-gray-800 border border-gray-700 rounded-lg p-6",

  // Interactive card (with hover effect)
  interactive:
    "bg-gray-800 border border-gray-700 rounded-lg hover:border-nvidia-green transition-colors cursor-pointer",

  // Selected/active card state
  active: "bg-gray-800 border-2 border-nvidia-green rounded-lg",

  // Card header section
  header: "border-b border-gray-700 pb-4 mb-4",

  // Card section divider
  divider: "border-t border-gray-700 pt-4 mt-4",
} as const;

/**
 * Standard button styles
 */
export const BUTTON_STYLES = {
  // Primary action button
  primary:
    "px-4 py-2 bg-nvidia-green text-white rounded-lg hover:bg-nvidia-green/80 transition-colors",

  // Secondary/outline button
  secondary:
    "px-4 py-2 bg-gray-800 text-gray-400 rounded-lg hover:text-white hover:border-nvidia-green border border-gray-700 transition-colors",

  // Danger/destructive button
  danger:
    "px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors",

  // Small button variant
  small:
    "px-3 py-1 text-sm bg-nvidia-green text-white rounded hover:bg-nvidia-green/80 transition-colors",

  // Icon button
  icon: "p-2 bg-gray-800 text-gray-400 rounded-lg hover:text-white hover:bg-gray-700 transition-colors",
} as const;

/**
 * Status/severity badge styles
 */
export const BADGE_STYLES = {
  // Success/positive state
  success: "bg-green-900/50 text-green-400 px-2 py-1 rounded text-sm",

  // Warning state
  warning: "bg-yellow-900/50 text-yellow-400 px-2 py-1 rounded text-sm",

  // Error/critical state
  error: "bg-red-900/50 text-red-400 px-2 py-1 rounded text-sm",

  // Info/neutral state
  info: "bg-blue-900/50 text-blue-400 px-2 py-1 rounded text-sm",

  // NVIDIA branded accent
  nvidia: "bg-nvidia-green/20 text-nvidia-green px-2 py-1 rounded text-sm",
} as const;

/**
 * Input field styles
 */
export const INPUT_STYLES = {
  // Standard text input
  text: "w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-nvidia-green",

  // Search input with icon space
  search:
    "w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-nvidia-green",
} as const;

/**
 * Section heading styles
 */
export const HEADING_STYLES = {
  // Page title
  page: "text-2xl font-bold text-white",

  // Section title
  section: "text-xl font-bold text-white",

  // Card title
  card: "text-lg font-semibold text-white",

  // Subsection title
  subsection: "text-sm font-semibold text-gray-400",
} as const;

/**
 * Code block styles
 */
export const CODE_STYLES = {
  // Inline code
  inline: "text-sm bg-gray-900 text-nvidia-green px-2 py-1 rounded font-mono",

  // Code block
  block:
    "bg-gray-900 text-nvidia-green p-4 rounded-lg font-mono text-sm overflow-x-auto",
} as const;

// Export all styles as a single object for convenience
export const UI_STYLES = {
  card: CARD_STYLES,
  button: BUTTON_STYLES,
  badge: BADGE_STYLES,
  input: INPUT_STYLES,
  heading: HEADING_STYLES,
  code: CODE_STYLES,
} as const;
