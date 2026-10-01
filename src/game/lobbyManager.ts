// Lobby Manager - handles all lobby operations
import type { Lobby, Player, LobbySettings, LobbyMessage } from './lobby';

const STORAGE_KEY = 'nightowl_lobbies';
const CURRENT_LOBBY_KEY = 'nightowl_current_lobby';

class LobbyManager {
  private lobbies: Map<string, Lobby> = new Map();
  private currentLobbyId: string | null = null;
  private currentPlayerId: string | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
    this.currentPlayerId = this.generateId();
  }

  // Generate unique IDs
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Persistence
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.lobbies = new Map(Object.entries(data));
      }
      const currentLobby = localStorage.getItem(CURRENT_LOBBY_KEY);
      if (currentLobby) {
        this.currentLobbyId = currentLobby;
        
        // Check if current player is still in the lobby
        const lobby = this.lobbies.get(currentLobby);
        if (lobby) {
          const playerInLobby = lobby.currentPlayers.some(p => p.id === this.currentPlayerId);
          if (!playerInLobby) {
            // Player ID changed (page refresh), clear current lobby
            this.currentLobbyId = null;
            localStorage.removeItem(CURRENT_LOBBY_KEY);
          }
        } else {
          // Lobby no longer exists
          this.currentLobbyId = null;
          localStorage.removeItem(CURRENT_LOBBY_KEY);
        }
      }
    } catch (e) {
      console.error('Failed to load lobbies from storage:', e);
    }
  }

  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.lobbies);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      if (this.currentLobbyId) {
        localStorage.setItem(CURRENT_LOBBY_KEY, this.currentLobbyId);
      } else {
        localStorage.removeItem(CURRENT_LOBBY_KEY);
      }
    } catch (e) {
      console.error('Failed to save lobbies to storage:', e);
    }
  }

  // Notify listeners of state changes
  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  // Subscribe to state changes
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Create a new lobby
  createLobby(
    name: string,
    hostName: string,
    maxPlayers: number = 8,
    settings: Partial<LobbySettings> = {},
    description?: string,
    isPrivate: boolean = false,
    password?: string
  ): Lobby {
    const lobby: Lobby = {
      id: this.generateId(),
      name,
      hostId: this.currentPlayerId!,
      hostName,
      maxPlayers,
      currentPlayers: [],
      settings: {
        pomodoroEnabled: true,
        pomodoroWork: 25,
        pomodoroBreak: 5,
        ambientSound: 'train',
        allowEmotes: true,
        allowChat: true,
        ...settings
      },
      status: 'waiting',
      createdAt: Date.now(),
      description,
      isPrivate,
      password
    };

    this.lobbies.set(lobby.id, lobby);
    this.currentLobbyId = lobby.id;
    this.saveToStorage();
    this.notify();

    return lobby;
  }

  // Join an existing lobby
  joinLobby(lobbyId: string, playerName: string, avatar: string, password?: string): boolean {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      throw new Error('Lobby not found');
    }

    if (lobby.isPrivate && lobby.password && lobby.password !== password) {
      throw new Error('Incorrect password');
    }

    if (lobby.currentPlayers.length >= lobby.maxPlayers) {
      throw new Error('Lobby is full');
    }

    if (lobby.status !== 'waiting') {
      throw new Error('Lobby is not accepting players');
    }

    const player: Player = {
      id: this.currentPlayerId!,
      name: playerName,
      avatar,
      isHost: false,
      isReady: false,
      joinedAt: Date.now()
    };

    lobby.currentPlayers.push(player);
    this.currentLobbyId = lobbyId;
    this.saveToStorage();
    this.notify();

    return true;
  }

  // Leave current lobby
  leaveLobby(): void {
    if (!this.currentLobbyId || !this.currentPlayerId) return;

    const lobby = this.lobbies.get(this.currentLobbyId);
    if (!lobby) return;

    // Remove player from lobby
    lobby.currentPlayers = lobby.currentPlayers.filter(
      p => p.id !== this.currentPlayerId
    );

    // If host left, transfer host or delete lobby
    if (lobby.hostId === this.currentPlayerId) {
      if (lobby.currentPlayers.length > 0) {
        // Transfer host to first player
        const newHost = lobby.currentPlayers[0];
        lobby.hostId = newHost.id;
        lobby.hostName = newHost.name;
        newHost.isHost = true;
      } else {
        // Delete empty lobby
        this.lobbies.delete(this.currentLobbyId);
      }
    }

    this.currentLobbyId = null;
    this.saveToStorage();
    this.notify();
  }

  // Get all public lobbies
  getPublicLobbies(): Lobby[] {
    return Array.from(this.lobbies.values())
      .filter(lobby => !lobby.isPrivate)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  // Get current lobby
  getCurrentLobby(): Lobby | null {
    if (!this.currentLobbyId) return null;
    return this.lobbies.get(this.currentLobbyId) || null;
  }

  // Get lobby by ID
  getLobby(id: string): Lobby | null {
    return this.lobbies.get(id) || null;
  }

  // Update lobby settings (host only)
  updateLobbySettings(settings: Partial<LobbySettings>): void {
    const lobby = this.getCurrentLobby();
    if (!lobby || lobby.hostId !== this.currentPlayerId) {
      throw new Error('Not authorized');
    }

    lobby.settings = { ...lobby.settings, ...settings };
    this.saveToStorage();
    this.notify();
  }

  // Start the lobby (host only)
  startLobby(): void {
    const lobby = this.getCurrentLobby();
    if (!lobby || lobby.hostId !== this.currentPlayerId) {
      throw new Error('Not authorized');
    }

    if (lobby.currentPlayers.length === 0) {
      throw new Error('Need at least one player to start');
    }

    lobby.status = 'starting';
    this.saveToStorage();
    this.notify();

    // Simulate starting after 3 seconds
    setTimeout(() => {
      lobby.status = 'in-progress';
      this.saveToStorage();
      this.notify();
    }, 3000);
  }

  // Toggle ready status
  toggleReady(): void {
    const lobby = this.getCurrentLobby();
    if (!lobby) return;

    const player = lobby.currentPlayers.find(p => p.id === this.currentPlayerId);
    if (player) {
      player.isReady = !player.isReady;
      this.saveToStorage();
      this.notify();
    }
  }

  // Get current player ID
  getCurrentPlayerId(): string | null {
    return this.currentPlayerId;
  }

  // Check if current player is host
  isHost(): boolean {
    const lobby = this.getCurrentLobby();
    if (!lobby) return false;
    return lobby.hostId === this.currentPlayerId;
  }

  // Delete lobby (host only)
  deleteLobby(): void {
    const lobby = this.getCurrentLobby();
    if (!lobby || lobby.hostId !== this.currentPlayerId) {
      throw new Error('Not authorized');
    }

    this.lobbies.delete(lobby.id);
    this.currentLobbyId = null;
    this.saveToStorage();
    this.notify();
  }

  // Get player count across all lobbies
  getTotalPlayerCount(): number {
    return Array.from(this.lobbies.values()).reduce(
      (sum, lobby) => sum + lobby.currentPlayers.length,
      0
    );
  }
}

// Export singleton instance
export const lobbyManager = new LobbyManager();
