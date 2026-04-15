/**
 * Configurações globais do sistema para facilitar Rebranding e Customização.
 */
export const APP_CONFIG = {
  // Nome atual do sistema
  name: "Synapse",

  // Versão do sistema
  version: "1.0.0",

  // Configurações de exibição
  displayName: "Synapse — Gestão Inteligente de Logística",
  
  // Módulos habilitados por padrão
  modules: {
    fleet: true,
    finance: true,
    rh: true,
    chat: true,
  },
  
  // Configurações de Auditoria
  audit: {
    enabled: true,
    retentionDays: 90,
  }
};

export type AppConfig = typeof APP_CONFIG;
