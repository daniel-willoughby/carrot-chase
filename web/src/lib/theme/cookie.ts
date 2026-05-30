/**
 * Shared between the server (root layout, server actions) and the
 * "use client" ThemeProvider. Pulling this into its own module avoids
 * the Next 16 client/server import boundary, which turns simple constants
 * exported from "use client" files into undefined when read from a
 * server component.
 */
export const THEME_COOKIE = "cc_theme";
