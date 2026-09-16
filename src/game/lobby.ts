// Lobby system types and interfaces

export interface Lobby {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  maxPlayers: number;
  currentPlayers: Player[];
  settings: LobbySettings;
  status: 'waiting' | 'starting' | 'in-progress';
  createdAt: number;
  description?: string;
  isPrivate: boolean;
  password?: string;
}

export interface LobbySettings {
  pomodoroEnabled: boolean;
  pomodoroWork: number; // minutes
  pomodoroBreak: number; // minutes
  ambientSound: 'none' | 'rain' | 'cafe' | 'train';
  allowEmotes: boolean;
  allowChat: boolean;
}

export interface Player {
  id: string;
  name: string;
  avatar: string; // avatar config or custom image
  isHost: boolean;
  isReady: boolean;
  joinedAt: number;
}

export interface LobbyMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  type: 'chat' | 'system' | 'emote';
}

export type LobbyView = 'browser' | 'create' | 'waiting' | 'in-lobby';
