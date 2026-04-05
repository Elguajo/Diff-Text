// lib.rs — Tauri application entry point
// File operations are handled via tauri-plugin-dialog and tauri-plugin-fs
// directly from the frontend. No custom Rust commands needed for MVP.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
