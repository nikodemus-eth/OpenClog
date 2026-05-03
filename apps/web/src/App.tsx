import { useEffect, useMemo, useState } from "react";
import { getTheme, sampleJournalDay, type JournalDay, type ThemeId } from "@openclog/core";
import { exportDay, fetchDay, fetchDays, fetchHealth, selectableThemeIds, sendComposer } from "./api.js";
import { ComposerPanel, DailyPage, DiagnosticsRail, LeftRail, themeVars, type GatewayViewState } from "./components/JournalLayout.js";
import "./styles/app.css";

export function App() {
  const [themeId, setThemeId] = useState<ThemeId>("default");
  const [days, setDays] = useState<Array<Omit<JournalDay, "entries">>>([]);
  const [day, setDay] = useState<JournalDay>(sampleJournalDay);
  const [gateway, setGateway] = useState<GatewayViewState>({ status: "degraded", missingScopes: ["operator.approvals"], stale: true });
  const [composer, setComposer] = useState("");
  const [notice, setNotice] = useState("Gateway degraded: live state will not be invented.");
  const theme = useMemo(() => getTheme(themeId), [themeId]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeId;
  }, [themeId]);

  useEffect(() => {
    void Promise.all([fetchHealth(), fetchDays(), fetchDay(sampleJournalDay.dayKey)])
      .then(([health, fetchedDays, fetchedDay]) => {
        setGateway(health.gateway);
        setDays(fetchedDays);
        setDay(fetchedDay);
      })
      .catch(() => {
        setGateway({ status: "degraded", missingScopes: ["operator.approvals"], stale: true });
      });
  }, []);

  async function handleSend() {
    try {
      const result = await sendComposer(composer);
      if (result.mode === "note" && result.body) {
        setDay((current) => ({
          ...current,
          entries: [
            ...current.entries,
            {
              id: `local-${current.entries.length + 1}`,
              dayKey: current.dayKey,
              source: "user",
              kind: "note",
              title: "Manual note",
              body: result.body,
              timestamp: new Date("2026-05-02T12:45:00.000Z").toISOString(),
              status: "info",
              severity: "info",
              redacted: true
            }
          ]
        }));
      }
      setComposer("");
      setNotice("Entry recorded.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Command blocked");
    }
  }

  async function handleExport() {
    const blob = await exportDay(day.dayKey);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `openclog-${day.dayKey}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell" data-theme={themeId} style={themeVars(theme)}>
      <LeftRail days={days} theme={theme} themeId={themeId} themeIds={selectableThemeIds} onThemeChange={setThemeId} />
      <DailyPage
        composer={<ComposerPanel composer={composer} notice={notice} theme={theme} onComposerChange={setComposer} onSend={handleSend} />}
        day={day}
        theme={theme}
        onExport={handleExport}
      />
      <DiagnosticsRail day={day} gateway={gateway} theme={theme} />
    </main>
  );
}
