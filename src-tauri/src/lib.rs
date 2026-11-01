mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            tauri::WebviewWindowBuilder::from_config(app, &app.config().app.windows[0])?
                .on_navigation(|url| burst_http_client::allowed_app_navigation(url, cfg!(debug_assertions), 1420))
                .on_new_window(|_, _| tauri::webview::NewWindowResponse::Deny)
                .build()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_telemetry,
            commands::get_protocol_params,
            commands::get_peers,
            commands::get_block_info,
            commands::get_account_info,
            commands::get_account_history,
            commands::get_account_balance,
            commands::get_verification_activity,
            commands::get_account_verification,
            commands::get_governance_proposals,
            commands::get_governance_proposal_info,
            commands::get_consti,
            commands::get_merger_graph_stats,
            commands::trace_origin,
            commands::get_representatives,
            commands::read_config,
            commands::write_config,
            commands::read_logs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running BURST Node Dashboard");
}
