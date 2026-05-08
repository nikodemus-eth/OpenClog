import type React from "react";
import type { OpenClogTheme, ThemeBackgroundAssetId } from "@openclog/core";

const backgroundUrls: Record<ThemeBackgroundAssetId, string> = {
  "accessibility-calm": new URL("../assets/backgrounds/accessibility-calm.svg", import.meta.url).href,
  "command-console": new URL("../assets/backgrounds/command-console.svg", import.meta.url).href,
  "desktop-shell": new URL("../assets/backgrounds/desktop-shell.svg", import.meta.url).href,
  "journal-paper": new URL("../assets/backgrounds/journal-paper.svg", import.meta.url).href,
  "manuscript-surface": new URL("../assets/backgrounds/manuscript-surface.svg", import.meta.url).href,
  "map-table": new URL("../assets/backgrounds/map-table.svg", import.meta.url).href,
  "news-media": new URL("../assets/backgrounds/news-media.svg", import.meta.url).href,
  "publication-sheet": new URL("../assets/backgrounds/publication-sheet.svg", import.meta.url).href,
  "social-feed": new URL("../assets/backgrounds/social-feed.svg", import.meta.url).href,
  "terminal-grid": new URL("../assets/backgrounds/terminal-grid.svg", import.meta.url).href
};

export function themeVars(theme: OpenClogTheme): React.CSSProperties {
  const backgroundUrl = theme.background.asset ? backgroundUrls[theme.background.asset] : "";
  const shellText =
    contrastRatio(theme.palette.text, theme.palette.appBg) >= contrastRatio(theme.palette.inverseText, theme.palette.appBg) ? theme.palette.text : theme.palette.inverseText;
  const shellMuted = `color-mix(in srgb, ${shellText} 66%, ${theme.palette.accent} 34%)`;
  const railText = contrastRatio(theme.palette.text, theme.palette.panelBg) >= contrastRatio(theme.palette.inverseText, theme.palette.panelBg) ? theme.palette.text : theme.palette.inverseText;
  const railMuted = `color-mix(in srgb, ${railText} 76%, ${theme.palette.accent} 24%)`;
  return {
    "--app-bg": theme.palette.appBg,
    "--page-bg": theme.palette.pageBg,
    "--panel-bg": theme.palette.panelBg,
    "--card-bg": theme.palette.cardBg,
    "--theme-base-card-bg": theme.palette.cardBg,
    "--text": theme.palette.text,
    "--muted": theme.palette.mutedText,
    "--inverse-text": theme.palette.inverseText,
    "--border": theme.palette.border,
    "--theme-base-border": theme.palette.border,
    "--border-strong": theme.palette.borderStrong,
    "--accent": theme.palette.accent,
    "--accent-2": theme.palette.accent2,
    "--surface-scrim": theme.palette.surfaceScrim,
    "--shadow-color": theme.palette.shadowColor,
    "--success": theme.status.success,
    "--info": theme.status.info,
    "--warning": theme.status.warning,
    "--danger": theme.status.danger,
    "--body-font": theme.typography.body,
    "--display-font": theme.typography.display,
    "--mono-font": theme.typography.mono ?? "ui-monospace, SFMono-Regular, Menlo, monospace",
    "--label-transform": theme.typography.labelTransform ?? "none",
    "--shell-gap": theme.spacing.shellGap,
    "--panel-padding": theme.spacing.panelPadding,
    "--card-padding": theme.spacing.cardPadding,
    "--control-min-height": theme.spacing.controlMinHeight,
    "--panel-radius": theme.radius.panel,
    "--card-radius": theme.radius.card,
    "--control-radius": theme.radius.control,
    "--pill-radius": theme.radius.pill,
    "--panel-shadow": theme.shadows.panel,
    "--card-shadow": theme.shadows.card,
    "--panel-border": theme.borders.panel,
    "--card-border": theme.borders.card,
    "--active-border": theme.borders.active,
    "--focus-ring": theme.focus.ring,
    "--focus-width": theme.focus.width,
    "--focus-offset": theme.focus.offset,
    "--bg-opacity": String(theme.background.opacity ?? 0),
    "--bg-overlay": theme.background.overlay ?? "transparent",
    "--panel-scrim": theme.background.panelScrim ?? theme.palette.surfaceScrim,
    "--texture-opacity": String(theme.panel.textureOpacity),
    "--entry-card-min-height": theme.layout.cardMinHeight ?? "84px",
    "--theme-background": backgroundUrl ? `url("${backgroundUrl}")` : "none",
    "--theme-family": theme.family,
    "--theme-card-style": theme.cardStyle,
    "--theme-diagnostics-style": theme.diagnosticsStyle,
    "--theme-timeline-style": theme.timelineStyle,
    "--theme-lifecycle": theme.lifecycle,
    "--theme-use-case": theme.useCase,
    "--theme-practical-group": theme.practicalGroup,
    "--theme-interaction-emphasis": theme.interactionEmphasis,
    "--theme-timeline-layout": theme.timelineLayoutMode,
    "--theme-diagnostics-density": theme.diagnosticsDensity,
    "--theme-accessibility-profile": theme.accessibilityProfile,
    "--theme-motion-profile": theme.motionProfile,
    "--shell-text": shellText,
    "--shell-muted": contrastRatio(theme.palette.mutedText, theme.palette.appBg) >= 3 ? theme.palette.mutedText : shellMuted,
    "--rail-text": railText,
    "--rail-muted": contrastRatio(theme.palette.mutedText, theme.palette.panelBg) >= 3 ? theme.palette.mutedText : railMuted
  } as React.CSSProperties;
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hex: string): number {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
