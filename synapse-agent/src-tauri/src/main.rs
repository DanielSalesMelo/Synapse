#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")] // hide console window on Windows in release

use eframe::egui;

fn main() -> eframe::Result {
    env_logger::init(); // Log to stderr (if you run with `RUST_LOG=debug`).
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([1024.0, 768.0])
            .with_title("Synapse Studio"),
        ..Default::default()
    };
    eframe::run_native(
        "Synapse Studio",
        options,
        Box::new(|_cc| Ok(Box::new(SynapseStudio::default()))),
    )
}

struct SynapseStudio {
    chat_input: String,
    chat_history: Vec<(String, String)>, // (User, Message)
}

impl Default for SynapseStudio {
    fn default() -> Self {
        Self {
            chat_input: String::new(),
            chat_history: vec![
                ("Manus".to_owned(), "Olá! Eu sou o Manus. Como posso ajudar no seu código hoje?".to_owned()),
            ],
        }
    }
}

impl eframe::App for SynapseStudio {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        egui::TopBottomPanel::top("top_panel").show(ctx, |ui| {
            egui::menu::bar(ui, |ui| {
                ui.menu_button("Arquivo", |ui| {
                    if ui.button("Sair").clicked() {
                        ctx.send_viewport_cmd(egui::ViewportCommand::Close);
                    }
                });
            });
        });

        egui::SidePanel::left("side_panel").resizable(true).default_width(200.0).show(ctx, |ui| {
            ui.heading("Arquivos");
            ui.separator();
            ui.label("📁 src");
            ui.label("  📄 main.rs");
            ui.label("📄 Cargo.toml");
        });

        egui::SidePanel::right("chat_panel").resizable(true).default_width(300.0).show(ctx, |ui| {
            ui.heading("Chat com Manus");
            ui.separator();

            egui::ScrollArea::vertical().stick_to_bottom(true).show(ui, |ui| {
                for (author, msg) in &self.chat_history {
                    ui.strong(author);
                    ui.label(msg);
                    ui.add_space(5.0);
                }
            });

            ui.separator();
            ui.horizontal(|ui| {
                let text_edit = ui.text_edit_singleline(&mut self.chat_input);
                if (ui.button("Enviar").clicked() || (text_edit.lost_focus() && ui.input(|i| i.key_pressed(egui::Key::Enter)))) && !self.chat_input.is_empty() {
                    self.chat_history.push(("Você".to_owned(), self.chat_input.clone()));
                    self.chat_input.clear();
                }
            });
        });

        egui::CentralPanel::default().show(ctx, |ui| {
            ui.heading("Editor de Código");
            ui.separator();
            let mut code = "// Synapse Studio - Editor de Código\n\nfn main() {\n    println!(\"Olá, Synapse!\");\n}".to_string();
            egui::ScrollArea::both().show(ui, |ui| {
                ui.add(
                    egui::TextEdit::multiline(&mut code)
                        .font(egui::TextStyle::Monospace)
                        .code_editor()
                        .desired_width(f32::INFINITY)
                        .lock_focus(true)
                );
            });
        });
    }
}
