export enum VoiceName {
  Puck = 'Puck',
  Charon = 'Charon',
  Kore = 'Kore',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr',
}

export interface LiveConfig {
  voiceName: VoiceName;
  systemInstruction: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
