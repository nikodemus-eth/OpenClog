#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::path::Path;
use std::process::Command;

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

#[derive(Serialize)]
struct DesktopSelfCheckItem {
    id: &'static str,
    status: &'static str,
    detail: String,
}

#[derive(Serialize)]
struct DesktopSelfCheckReport {
    generated_at: String,
    checks: Vec<DesktopSelfCheckItem>,
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
    let health = probe_api_health(&api_base);
    DesktopSelfCheckReport {
        generated_at: "local-scheduled-check".to_string(),
        checks: vec![
            health.0,
            health.1,
            probe_sqlite_integrity(),
            probe_secret_store(),
        ],
    }
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
    let output = Command::new("curl").args(["-fsS", &url]).output();
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

fn probe_sqlite_integrity() -> DesktopSelfCheckItem {
    let path = std::env::var("OPENCLOG_SQLITE_PATH").unwrap_or_else(|_| "openclog.db".to_string());
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

#[cfg(test)]
mod tests {
    use super::*;

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
        let report = run_scheduled_self_check();
        assert!(report.checks.iter().any(|check| check.id == "api_liveness"));
        assert!(report.checks.iter().any(|check| check.id == "gateway_readiness"));
        assert!(report.checks.iter().any(|check| check.id == "sqlite_integrity"));
        assert!(report.checks.iter().any(|check| check.id == "secret_store"));
    }
}

fn main() {
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
