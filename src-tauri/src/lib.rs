use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    ActivationPolicy, Manager,
};

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
        .invoke_handler(tauri::generate_handler![quit_app])
        .setup(|app| {
            // macOS: 设置 Accessory 激活策略，防止焦点切换后透明窗口失效
            #[cfg(target_os = "macos")]
            app.set_activation_policy(ActivationPolicy::Accessory);

            // macOS: 配置透明窗口原生属性，消除残影
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
                            std::process::exit(0);
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

/// 前端调用：彻底退出应用（由系统托盘开关控制关闭按钮行为）
#[tauri::command]
fn quit_app() {
    std::process::exit(0);
}

/// macOS: 优化透明窗口的原生渲染属性，消除残影
///
/// 从底层 NSWindow 层面做三个关键设置：
/// 1. setHasShadow(false)   — 禁用窗口阴影（阴影的半透明边缘是残影的主要来源）
/// 2. setWantsLayer(true)   — 强制 GPU 图层合成（替代 CPU 合成）
#[cfg(target_os = "macos")]
fn optimize_transparent_window(app: &tauri::App) {
    if let Some(window) = app.get_webview_window("main") {
        if let Ok(ns_window) = window.ns_window() {
            let ns_window = ns_window as *mut AnyObject;
            unsafe {
                // 禁用窗口阴影 — 防止透明窗口的阴影在移动时残留像素
                let _: () = msg_send![ns_window, setHasShadow: false];
                // 强制内容视图使用图层合成（GPU 加速）
                let content_view: *mut AnyObject = msg_send![ns_window, contentView];
                let _: () = msg_send![content_view, setWantsLayer: true];
            }
        }
    }
}