#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::path::Path;
use std::process::Command;
use std::thread;
use std::time::Duration;

#[derive(Serialize)]
struct DesktopContractSnapshot {
    secure_storage_backend: &'static str,
    supports_secure_storage: bool,
    supports_scheduled_checks: bool,
    supports_local_operations: bool,
    routes: Vec<&'static str>,
}

#[derive(Serialize)]
struct SecretMutationResult {
    backend: &'static str,
    key: String,
    ok: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopSelfCheckItem {
    id: &'static str,
    status: &'static str,
    detail: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopSelfCheckReport {
    receipt_id: String,
    generated_at: String,
    observed_api_base: String,
    divergence_summary: String,
    status: &'static str,
    checks: Vec<DesktopSelfCheckItem>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct NativeRunnerHistoryRow<'a> {
    id: &'a str,
    receipt_id: &'a str,
    created_at: &'a str,
    generated_at: &'a str,
    observed_api_base: &'a str,
    divergence_summary: &'a str,
    status: &'a str,
    source: &'static str,
    checks: &'a [DesktopSelfCheckItem],
}

#[tauri::command]
fn desktop_contract_snapshot() -> DesktopContractSnapshot {
    DesktopContractSnapshot {
        secure_storage_backend: if cfg!(target_os = "macos") {
            "macos-keychain"
        } else {
            "unsupported"
        },
        supports_secure_storage: cfg!(target_os = "macos"),
        supports_scheduled_checks: true,
        supports_local_operations: true,
        routes: vec![
            "/api/health",
            "/api/backend/fingerprint",
            "/api/health/aggregate",
            "/api/search",
            "/api/incidents/:id/workspace",
            "/api/integrations/:target/deliver",
            "/api/verification/receipts",
            "/api/runbook",
            "/api/slo",
        ],
    }
}

#[tauri::command]
fn set_secure_secret(key: String, value: String) -> Result<SecretMutationResult, String> {
    ensure_macos()?;
    let status = Command::new("security")
        .args([
            "add-generic-password",
            "-U",
            "-a",
            "openclog-desktop",
            "-s",
            &key,
            "-w",
            &value,
        ])
        .status()
        .map_err(|error| format!("security command failed: {error}"))?;
    if !status.success() {
        return Err("macOS Keychain write failed".to_string());
    }
    Ok(SecretMutationResult {
        backend: "macos-keychain",
        key,
        ok: true,
    })
}

#[tauri::command]
fn get_secure_secret(key: String) -> Result<Option<String>, String> {
    ensure_macos()?;
    let output = Command::new("security")
        .args([
            "find-generic-password",
            "-a",
            "openclog-desktop",
            "-s",
            &key,
            "-w",
        ])
        .output()
        .map_err(|error| format!("security command failed: {error}"))?;
    if output.status.success() {
        return Ok(Some(String::from_utf8_lossy(&output.stdout).trim().to_string()));
    }
    Ok(None)
}

#[tauri::command]
fn delete_secure_secret(key: String) -> Result<SecretMutationResult, String> {
    ensure_macos()?;
    let status = Command::new("security")
        .args([
            "delete-generic-password",
            "-a",
            "openclog-desktop",
            "-s",
            &key,
        ])
        .status()
        .map_err(|error| format!("security command failed: {error}"))?;
    Ok(SecretMutationResult {
        backend: "macos-keychain",
        key,
        ok: status.success(),
    })
}

#[tauri::command]
fn run_scheduled_self_check() -> DesktopSelfCheckReport {
    let api_base = std::env::var("OPENCLOG_API_URL").unwrap_or_else(|_| "http://127.0.0.1:3000".to_string());
    let generated_at = iso_now();
    let health = probe_api_health(&api_base);
    let divergence_summary = if health.1.status == "ok" {
        "Desktop self-check agrees with public Gateway readiness."
    } else {
        "Desktop self-check did not confirm Gateway readiness; Fastify remains authoritative until fresh native evidence is recorded."
    };
    let checks = vec![
        health.0,
        health.1,
        probe_launch_agent(),
        probe_sqlite_integrity(),
        probe_secret_store(),
    ];
    let mut report = DesktopSelfCheckReport {
        receipt_id: format!("desktop-self-check:{}:{}", sanitize_id_component(&api_base), sanitize_id_component(&generated_at)),
        generated_at,
        observed_api_base: api_base.clone(),
        divergence_summary: divergence_summary.to_string(),
        status: overall_status(&checks),
        checks,
    };
    if let Err(error) = persist_native_runner_history(&report) {
        report.checks.push(DesktopSelfCheckItem {
            id: "native_runner_history",
            status: "failed",
            detail: format!("Native runner evidence persistence failed closed: {error}."),
        });
        report.status = overall_status(&report.checks);
        report.divergence_summary = format!("{} Native runner history persistence failed closed.", report.divergence_summary);
    }
    report
}

fn iso_now() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

fn ensure_macos() -> Result<(), String> {
    if cfg!(target_os = "macos") {
        Ok(())
    } else {
        Err("secure storage is only supported on macOS in this build".to_string())
    }
}

fn probe_api_health(api_base: &str) -> (DesktopSelfCheckItem, DesktopSelfCheckItem) {
    let url = format!("{}/api/health", api_base.trim_end_matches('/'));
    let output = Command::new("curl").args(["-fsS", "--max-time", "3", &url]).output();
    match output {
        Ok(output) if output.status.success() => {
            let body = String::from_utf8_lossy(&output.stdout);
            let gateway_ready = body.contains("\"status\":\"ready\"");
            (
                DesktopSelfCheckItem {
                    id: "api_liveness",
                    status: "ok",
                    detail: format!("API health responded at {url}."),
                },
                DesktopSelfCheckItem {
                    id: "gateway_readiness",
                    status: if gateway_ready { "ok" } else { "degraded" },
                    detail: if gateway_ready {
                        "Gateway readiness is ready in public health.".to_string()
                    } else {
                        "Gateway readiness is not ready or could not be confirmed from public health.".to_string()
                    },
                },
            )
        }
        _ => (
            DesktopSelfCheckItem {
                id: "api_liveness",
                status: "failed",
                detail: format!("API health did not respond at {url}."),
            },
            DesktopSelfCheckItem {
                id: "gateway_readiness",
                status: "unknown",
                detail: "Gateway readiness cannot be checked until API health responds.".to_string(),
            },
        ),
    }
}

fn probe_launch_agent() -> DesktopSelfCheckItem {
    let label = std::env::var("OPENCLOG_API_LAUNCH_AGENT_LABEL").unwrap_or_else(|_| "com.m4.openclog-api".to_string());
    if !cfg!(target_os = "macos") {
        return DesktopSelfCheckItem {
            id: "launch_agent",
            status: "unknown",
            detail: format!("LaunchAgent {label} can only be inspected on macOS."),
        };
    }
    let uid_output = Command::new("id").arg("-u").output();
    let Ok(uid_output) = uid_output else {
        return DesktopSelfCheckItem {
            id: "launch_agent",
            status: "degraded",
            detail: format!("LaunchAgent {label} could not be inspected because id -u failed."),
        };
    };
    let uid = String::from_utf8_lossy(&uid_output.stdout).trim().to_string();
    let target = format!("gui/{uid}/{label}");
    let output = Command::new("launchctl").args(["print", &target]).output();
    match output {
        Ok(output) if output.status.success() => DesktopSelfCheckItem {
            id: "launch_agent",
            status: "ok",
            detail: format!("LaunchAgent {label} is loaded at {target}."),
        },
        Ok(output) => DesktopSelfCheckItem {
            id: "launch_agent",
            status: "degraded",
            detail: format!("LaunchAgent {label} is not loaded at {target}: {}.", String::from_utf8_lossy(&output.stderr).trim()),
        },
        Err(error) => DesktopSelfCheckItem {
            id: "launch_agent",
            status: "degraded",
            detail: format!("LaunchAgent {label} inspection failed: {error}."),
        },
    }
}

fn probe_sqlite_integrity() -> DesktopSelfCheckItem {
    let path = sqlite_path();
    DesktopSelfCheckItem {
        id: "sqlite_integrity",
        status: if Path::new(&path).exists() { "ok" } else { "unknown" },
        detail: if Path::new(&path).exists() {
            format!("SQLite repository path is present at {path}.")
        } else {
            format!("SQLite repository path is not present at {path}; API may be using an alternate path.")
        },
    }
}

fn sqlite_path() -> String {
    std::env::var("OPENCLOG_SQLITE_PATH")
        .or_else(|_| std::env::var("OPENCLOG_DB_PATH"))
        .unwrap_or_else(|_| "openclog.db".to_string())
}

fn probe_secret_store() -> DesktopSelfCheckItem {
    DesktopSelfCheckItem {
        id: "secret_store",
        status: if cfg!(target_os = "macos") { "ok" } else { "failed" },
        detail: if cfg!(target_os = "macos") {
            "macOS Keychain backend is available for configured delivery secrets.".to_string()
        } else {
            "Secure storage fails closed on this operating system.".to_string()
        },
    }
}

fn persist_native_runner_history(report: &DesktopSelfCheckReport) -> Result<(), String> {
    let db_path = sqlite_path();
    let row = NativeRunnerHistoryRow {
        id: &report.receipt_id,
        receipt_id: &report.receipt_id,
        created_at: &report.generated_at,
        generated_at: &report.generated_at,
        observed_api_base: &report.observed_api_base,
        divergence_summary: &report.divergence_summary,
        status: report.status,
        source: "desktop",
        checks: &report.checks,
    };
    let runner_json = serde_json::to_string(&row).map_err(|error| format!("serialize runner evidence failed: {error}"))?;
    let sql = format!(
        "PRAGMA busy_timeout = 5000; CREATE TABLE IF NOT EXISTS journal_native_runner_history (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, runner_json TEXT NOT NULL); INSERT INTO journal_native_runner_history (id, created_at, runner_json) VALUES ('{}', '{}', '{}') ON CONFLICT(id) DO UPDATE SET created_at = excluded.created_at, runner_json = excluded.runner_json;",
        sql_quote(&report.receipt_id),
        sql_quote(&report.generated_at),
        sql_quote(&runner_json)
    );
    let output = Command::new("sqlite3")
        .arg(&db_path)
        .arg(sql)
        .output()
        .map_err(|error| format!("sqlite3 command failed: {error}"))?;
    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

fn sql_quote(value: &str) -> String {
    value.replace('\'', "''")
}

fn sanitize_id_component(value: &str) -> String {
    value
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() { ch } else { '_' })
        .collect::<String>()
        .trim_matches('_')
        .to_string()
}

fn overall_status(checks: &[DesktopSelfCheckItem]) -> &'static str {
    if checks.iter().any(|check| check.status == "failed") {
        "blocked"
    } else if checks.iter().any(|check| check.status == "degraded") {
        "warning"
    } else if checks.iter().all(|check| check.status == "ok") {
        "passed"
    } else {
        "unknown"
    }
}

fn start_scheduled_self_checks() {
    thread::spawn(|| {
        let _ = run_scheduled_self_check();
        let interval_ms = scheduled_self_check_interval_ms();
        if interval_ms == 0 {
            return;
        }
        loop {
            thread::sleep(Duration::from_millis(interval_ms));
            let _ = run_scheduled_self_check();
        }
    });
}

fn scheduled_self_check_interval_ms() -> u64 {
    std::env::var("OPENCLOG_DESKTOP_SELF_CHECK_INTERVAL_MS")
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .unwrap_or(15 * 60 * 1000)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    static ENV_LOCK: Mutex<()> = Mutex::new(());

    #[test]
    fn desktop_contract_exposes_expected_routes() {
        let snapshot = desktop_contract_snapshot();
        assert!(snapshot.routes.contains(&"/api/health"));
        assert!(snapshot.routes.contains(&"/api/backend/fingerprint"));
        assert!(snapshot.routes.contains(&"/api/verification/receipts"));
        assert!(snapshot.routes.contains(&"/api/runbook"));
    }

    #[test]
    fn scheduled_self_check_reports_fail_closed_surfaces() {
        let _guard = ENV_LOCK.lock().expect("env lock");
        let db_path = std::env::temp_dir().join(format!("openclog-desktop-self-check-{}.db", std::process::id()));
        std::env::set_var("OPENCLOG_SQLITE_PATH", &db_path);
        let report = run_scheduled_self_check();
        std::env::remove_var("OPENCLOG_SQLITE_PATH");
        assert!(report.receipt_id.starts_with("desktop-self-check:"));
        assert!(report.checks.iter().any(|check| check.id == "api_liveness"));
        assert!(report.checks.iter().any(|check| check.id == "gateway_readiness"));
        assert!(report.checks.iter().any(|check| check.id == "launch_agent"));
        assert!(report.checks.iter().any(|check| check.id == "sqlite_integrity"));
        assert!(report.checks.iter().any(|check| check.id == "secret_store"));
        assert!(!report.divergence_summary.is_empty());
        let count = Command::new("sqlite3")
            .arg(&db_path)
            .arg("SELECT COUNT(*) FROM journal_native_runner_history;")
            .output()
            .expect("query native runner table");
        assert!(count.status.success());
        assert_eq!(String::from_utf8_lossy(&count.stdout).trim(), "1");
        let _ = std::fs::remove_file(db_path);
    }
}

fn main() {
    start_scheduled_self_checks();
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            delete_secure_secret,
            desktop_contract_snapshot,
            get_secure_secret,
            run_scheduled_self_check,
            set_secure_secret
        ])
        .run(tauri::generate_context!())
        .expect("failed to run OpenClog desktop shell");
}
