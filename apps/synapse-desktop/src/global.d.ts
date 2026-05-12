import type { AgentConfig, AiCapability, DeviceInfo, UpdateProgress } from "./types";

declare global {
  interface Window {
    synapse: {
      getAppVersion: () => Promise<string>;
      getConfig: () => Promise<AgentConfig>;
      saveConfig: (config: Partial<AgentConfig>) => Promise<AgentConfig>;
      clearLink: () => Promise<AgentConfig>;
      getDeviceInfo: () => Promise<DeviceInfo>;
      getAiCapability: () => Promise<AiCapability>;
      startWorker: () => Promise<{ started: boolean; path?: string; reason?: string }>;
      getWorkerStatus: () => Promise<{ running: boolean }>;
      setAutoLaunch: (enabled: boolean) => Promise<boolean>;
      getAutoLaunch: () => Promise<boolean>;
      notify: (title: string, body: string) => Promise<boolean>;
      openExternal: (url: string) => Promise<void>;
      windowMinimize: () => Promise<boolean>;
      windowToggleMaximize: () => Promise<boolean>;
      minimizeToTray: () => Promise<boolean>;
      downloadUpdate: (url: string, version?: string) => Promise<{ path: string }>;
      quit: () => Promise<boolean>;
      onMenuAction: (callback: (action: string) => void) => () => void;
      onUpdateProgress: (callback: (progress: UpdateProgress) => void) => () => void;
    };
  }
}

export {};
