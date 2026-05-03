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
    let active = true;
    let currentDayKey = sampleJournalDay.dayKey;
    async function refresh() {
      const [health, fetchedDays] = await Promise.all([fetchHealth(), fetchDays()]);
      const targetDayKey = fetchedDays[0]?.dayKey ?? currentDayKey;
      const fetchedDay = await fetchDay(targetDayKey);
      if (!active) return;
      currentDayKey = fetchedDay.dayKey;
      setGateway(health.gateway);
      setDays(fetchedDays);
      setDay(fetchedDay);
      setNotice((current) =>
        current === "Sent to OpenClaw. Waiting for live response." || current === "Entry recorded." || current === "Live OpenClaw event received."
          ? current
          : health.gateway.status === "ready"
            ? "Gateway ready: operator.read, operator.write, and operator.approvals negotiated."
            : "Gateway degraded: live state will not be invented."
      );
    }
    void refresh().catch(() => {
      if (active) setGateway({ status: "degraded", missingScopes: ["operator.approvals"], stale: true });
    });
    const timer = window.setInterval(() => {
      void refresh().catch(() => {
        if (active) setGateway({ status: "degraded", missingScopes: ["operator.approvals"], stale: true });
      });
    }, 1500);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/stream");
    source.addEventListener("journal", (event) => {
      const parsed = JSON.parse((event as MessageEvent).data) as { day?: JournalDay };
      if (parsed.day) setDay(parsed.day);
      setNotice("Live OpenClaw event received.");
    });
    source.onerror = () => {
      setGateway((current) => ({ ...current, stale: true }));
    };
    return () => source.close();
  }, []);

  async function handleSend() {
    try {
      const result = await sendComposer(composer);
      if (result.day) setDay(result.day);
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
      setNotice(result.message ?? "Entry recorded.");
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
