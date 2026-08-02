use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    window::Color,
    Manager,
};

#[cfg(target_os = "macos")]
use tauri::ActivationPolicy;

#[cfg(target_os = "macos")]
use objc2::{msg_send, runtime::AnyObject};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![quit_app])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                // 统一逻辑尺寸：config 中 width/height 为物理像素，在不同 DPI 缩放（13寸/27寸屏）下
                // CSS 视口会变化导致 UI 偏小/偏大；按 LogicalSize 重设后任意 DPI 下窗口内 UI 尺寸一致
                let _ = window.set_size(tauri::LogicalSize::new(160.0, 200.0));

                // Windows 上 WebView2 背景默认可能不透明（透明窗口出现白/黑底矩形），
                // 对透明的主窗口显式强制全透明（reminder 窗口在 windows.ts 创建时设置）
                #[cfg(target_os = "windows")]
                {
                    let _ = window.set_background_color(Some(Color(0, 0, 0, 0)));
                }
            }

            #[cfg(target_os = "macos")]
            app.set_activation_policy(ActivationPolicy::Accessory);

            #[cfg(target_os = "macos")]
            optimize_transparent_window(app);

            let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("补水啦 - 桌面喝水提醒")
                .on_menu_event(move |app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[cfg(target_os = "macos")]
fn optimize_transparent_window(app: &tauri::App) {
    if let Some(window) = app.get_webview_window("main") {
        if let Ok(ns_window) = window.ns_window() {
            let ns_window = ns_window as *mut AnyObject;
            unsafe {
                let _: () = msg_send![ns_window, setHasShadow: false];
                let content_view: *mut AnyObject = msg_send![ns_window, contentView];
                let _: () = msg_send![content_view, setWantsLayer: true];
            }
        }
    }
}