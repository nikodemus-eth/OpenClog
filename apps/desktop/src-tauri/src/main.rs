#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
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
            "/api/health/aggregate",
            "/api/search",
            "/api/incidents/:id/workspace",
            "/api/integrations/:target/deliver",
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
fn run_scheduled_self_check() -> DesktopContractSnapshot {
    desktop_contract_snapshot()
}

fn ensure_macos() -> Result<(), String> {
    if cfg!(target_os = "macos") {
        Ok(())
    } else {
        Err("secure storage is only supported on macOS in this build".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn desktop_contract_exposes_expected_routes() {
        let snapshot = desktop_contract_snapshot();
        assert!(snapshot.routes.contains(&"/api/health"));
        assert!(snapshot.routes.contains(&"/api/runbook"));
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
