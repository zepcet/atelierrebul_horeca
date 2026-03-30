/**
 * Dashboard palette — Sunset Orange + Midnight Blue, Mint Cream + Charcoal.
 * Sunset #F68C3E, Midnight #1B3B6D, Mint Cream #F0F9F6, Charcoal #2C3330, Mint (charts) #B8D9CB
 */
export const BRAND_SUNSET_ORANGE = "#F68C3E";
export const BRAND_MIDNIGHT_BLUE = "#1B3B6D";
export const BRAND_MINT_CREAM = "#F0F9F6";
/** Slightly deeper mint so bars/slices read on white */
export const BRAND_MINT_CHART = "#B8D9CB";
export const BRAND_CHARCOAL = "#2C3330";

/** Ads / primary series */
export const CHART_ADS = BRAND_SUNSET_ORANGE;
/** Website / secondary series */
export const CHART_WEBSITE = BRAND_MINT_CHART;

export const CHART_PALETTE = [
  BRAND_SUNSET_ORANGE,
  BRAND_MINT_CHART,
  "#e07828",
  "#D4EBE0",
  BRAND_MIDNIGHT_BLUE,
  "#E5F2EC",
] as const;

/** Pie labels aligned with CHART_PALETTE slice fills */
export const CHART_PIE_LABEL_FILLS = [
  BRAND_MIDNIGHT_BLUE,
  BRAND_CHARCOAL,
  "#ffffff",
  BRAND_CHARCOAL,
  "#ffffff",
  BRAND_CHARCOAL,
] as const;
