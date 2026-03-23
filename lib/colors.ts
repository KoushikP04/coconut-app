export const colors = {
  light: {
    background: "#F7FAF8",
    surface: "#FFFFFF",
    surfaceSecondary: "#F9FAFB",
    surfaceTertiary: "#F3F4F6",

    text: "#1F2937",
    textSecondary: "#374151",
    textTertiary: "#6B7280",
    textQuaternary: "#9CA3AF",

    primary: "#3D8E62",
    primaryLight: "#EEF7F2",
    primaryDark: "#2D7A52",

    border: "#E5E7EB",
    borderLight: "#F3F4F6",

    error: "#DC2626",
    errorLight: "#FEE2E2",
    warning: "#F59E0B",
    warningLight: "#FDE68A",
    success: "#059669",
    successLight: "#D1FAE5",

    // Semantic
    positive: "#059669",
    negative: "#DC2626",

    // Tab bar
    tabBar: "#FFFFFF",
    tabActive: "#3D8E62",
    tabInactive: "#9CA3AF",

    // Card
    card: "#FFFFFF",
    cardBorder: "#E5E7EB",

    // Input
    inputBackground: "#F9FAFB",
    inputBorder: "#D1D5DB",
    inputText: "#1F2937",
    inputPlaceholder: "#9CA3AF",

    // Skeleton
    skeletonBase: "#E5E7EB",
    skeletonHighlight: "#F3F4F6",

    // Modal overlay
    overlay: "rgba(0,0,0,0.5)",

    // Playful accent (demo row, highlights)
    accent: "#0D9488",
    accentMuted: "rgba(13, 148, 136, 0.12)",

    // Status bar
    statusBarStyle: "dark" as const,
  },
  /** Dark mode — deep teal/jungle (less muddy brown) + readable mint text */
  dark: {
    background: "#10141B",
    surface: "#1B222D",
    surfaceSecondary: "#222B38",
    surfaceTertiary: "#2A3545",

    text: "#F5F8FF",
    textSecondary: "#D3DCEC",
    textTertiary: "#B5C2D8",
    textQuaternary: "#8FA0BA",

    primary: "#3D8E62",
    primaryLight: "#183327",
    primaryDark: "#2D7A52",

    border: "#344255",
    borderLight: "#2A3442",

    accent: "#60A5FA",
    accentMuted: "rgba(96, 165, 250, 0.14)",

    error: "#F87171",
    errorLight: "#2D1414",
    warning: "#F59E0B",
    warningLight: "#2A1E08",
    success: "#2ECC8A",
    successLight: "#152A1E",

    positive: "#2ECC8A",
    negative: "#F87171",

    tabBar: "#151B24",
    tabActive: "#3D8E62",
    tabInactive: "#8FA0BA",

    card: "#1B222D",
    cardBorder: "#344255",

    inputBackground: "#222B38",
    inputBorder: "#344255",
    inputText: "#F5F8FF",
    inputPlaceholder: "#8FA0BA",

    skeletonBase: "#222B38",
    skeletonHighlight: "#2A3545",

    overlay: "rgba(0,0,0,0.55)",

    statusBarStyle: "light" as const,
  },
};

export type ThemeColors = Omit<typeof colors.light, "statusBarStyle"> & { statusBarStyle: "dark" | "light" };
export type ThemeMode = "auto" | "light" | "dark";
export type ThemeVariant = "forest" | "midnight" | "espresso";

export const THEME_VARIANTS: { key: ThemeVariant; label: string }[] = [
  { key: "forest", label: "Forest" },
  { key: "midnight", label: "Midnight" },
  { key: "espresso", label: "Espresso" },
];

const DARK_VARIANT_OVERRIDES: Record<ThemeVariant, Partial<ThemeColors>> = {
  // Existing dark tone (refined)
  forest: {
    background: "#10141B",
    surface: "#1B222D",
    surfaceSecondary: "#222B38",
    surfaceTertiary: "#2A3545",
    text: "#F5F8FF",
    textSecondary: "#D3DCEC",
    textTertiary: "#B5C2D8",
    textQuaternary: "#8FA0BA",
    primary: "#3D8E62",
    primaryLight: "#183327",
    border: "#344255",
    borderLight: "#2A3442",
    tabBar: "#151B24",
    tabActive: "#3D8E62",
    tabInactive: "#8FA0BA",
    card: "#1B222D",
    cardBorder: "#344255",
    inputBackground: "#222B38",
    inputBorder: "#344255",
    inputText: "#F5F8FF",
    inputPlaceholder: "#8FA0BA",
    skeletonBase: "#222B38",
    skeletonHighlight: "#2A3545",
    overlay: "rgba(0,0,0,0.55)",
    accent: "#60A5FA",
    accentMuted: "rgba(96, 165, 250, 0.14)",
    statusBarStyle: "light",
  },
  // Cooler, cleaner dark with brighter contrasts
  midnight: {
    background: "#0D1320",
    surface: "#0E1626",
    surfaceSecondary: "#121D31",
    surfaceTertiary: "#182743",
    text: "#EEF4FF",
    textSecondary: "#C4D2EE",
    textTertiary: "#8FA6D0",
    textQuaternary: "#6D83AB",
    primary: "#4E8BFF",
    primaryLight: "#172744",
    primaryDark: "#3E75DE",
    border: "#22334F",
    borderLight: "#1A2A42",
    tabBar: "#121B2C",
    tabActive: "#4E8BFF",
    tabInactive: "#6D83AB",
    card: "#0E1626",
    cardBorder: "#22334F",
    inputBackground: "#121D31",
    inputBorder: "#253A5B",
    inputText: "#EEF4FF",
    inputPlaceholder: "#7A92BF",
    skeletonBase: "#121D31",
    skeletonHighlight: "#182743",
    overlay: "rgba(0,0,0,0.58)",
    accent: "#22D3EE",
    accentMuted: "rgba(34, 211, 238, 0.16)",
    positive: "#34D399",
    negative: "#FB7185",
    success: "#34D399",
    statusBarStyle: "light",
  },
  // Warmer and less "flat black", keeps Coconut green but more lively
  espresso: {
    background: "#17120E",
    surface: "#241C16",
    surfaceSecondary: "#30261E",
    surfaceTertiary: "#3A2E24",
    text: "#F6EEE3",
    textSecondary: "#DCCDB8",
    textTertiary: "#B8A488",
    textQuaternary: "#9B876C",
    primary: "#51B87D",
    primaryLight: "#2B3628",
    primaryDark: "#3E9C66",
    border: "#443629",
    borderLight: "#3A2E24",
    tabBar: "#14100D",
    tabActive: "#51B87D",
    tabInactive: "#9B876C",
    card: "#1F1914",
    cardBorder: "#443629",
    inputBackground: "#2A211A",
    inputBorder: "#4A3A2D",
    inputText: "#F6EEE3",
    inputPlaceholder: "#A79277",
    skeletonBase: "#2A211A",
    skeletonHighlight: "#352A21",
    overlay: "rgba(0,0,0,0.52)",
    accent: "#F59E0B",
    accentMuted: "rgba(245, 158, 11, 0.14)",
    positive: "#4ADE80",
    negative: "#FB7185",
    success: "#4ADE80",
    statusBarStyle: "light",
  },
};

export function getDarkThemeByVariant(variant: ThemeVariant): ThemeColors {
  return { ...colors.dark, ...DARK_VARIANT_OVERRIDES[variant] };
}
