import { useState, useEffect } from 'react';
import { lobbyManager } from '../game/lobbyManager';
import type { Lobby, Player } from '../game/lobby';

interface WaitingRoomProps {
  lobbyId: string;
  onStart: () => void;
  onLeave: () => void;
}

export default function WaitingRoom({ lobbyId, onStart, onLeave }: WaitingRoomProps) {
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const unsubscribe = lobbyManager.subscribe(() => {
      const currentLobby = lobbyManager.getLobby(lobbyId);
      setLobby(currentLobby);
      setIsHost(lobbyManager.isHost());
      
      const currentPlayerId = lobbyManager.getCurrentPlayerId();
      const player = currentLobby?.currentPlayers.find(p => p.id === currentPlayerId);
      setIsReady(player?.isReady || false);
    });

    const currentLobby = lobbyManager.getLobby(lobbyId);
    setLobby(currentLobby);
    setIsHost(lobbyManager.isHost());
    
    const currentPlayerId = lobbyManager.getCurrentPlayerId();
    const player = currentLobby?.currentPlayers.find(p => p.id === currentPlayerId);
    setIsReady(player?.isReady || false);

    return unsubscribe;
  }, [lobbyId]);

  const handleToggleReady = () => {
    lobbyManager.toggleReady();
  };

  const handleStart = () => {
    try {
      lobbyManager.startLobby();
      onStart();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start lobby');
    }
  };

  const handleLeave = () => {
    if (confirm('Are you sure you want to leave this lobby?')) {
      lobbyManager.leaveLobby();
      onLeave();
    }
  };

  if (!lobby) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const readyCount = lobby.currentPlayers.filter(p => p.isReady).length;
  const allReady = readyCount === lobby.currentPlayers.length && lobby.currentPlayers.length > 0;

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">{lobby.name}</h1>
            {lobby.description && (
              <p className="text-gray-400">{lobby.description}</p>
            )}
          </div>
          <button
            onClick={handleLeave}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
          >
            Leave Lobby
          </button>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>Host: <span className="text-white">{lobby.hostName}</span></span>
          <span>•</span>
          <span>Players: {lobby.currentPlayers.length}/{lobby.maxPlayers}</span>
          <span>•</span>
          <span>Ready: {readyCount}/{lobby.currentPlayers.length}</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Player List */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 p-6 overflow-y-auto">
          <h2 className="text-xl font-semibold text-white mb-4">Players</h2>
          <div className="space-y-2">
            {lobby.currentPlayers.map((player) => (
              <div
                key={player.id}
                className={`p-3 rounded-lg border-2 ${
                  player.isHost
                    ? 'border-yellow-500 bg-yellow-900 bg-opacity-20'
                    : player.isReady
                    ? 'border-green-500 bg-green-900 bg-opacity-20'
                    : 'border-gray-600 bg-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {player.isHost && (
                      <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    )}
                    <span className="text-white font-medium">{player.name}</span>
                  </div>
                  {player.isReady && (
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Lobby Info */}
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Lobby Settings</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-gray-400 text-sm mb-1">Pomodoro</div>
                <div className="text-white font-medium">
                  {lobby.settings.pomodoroEnabled
                    ? `${lobby.settings.pomodoroWork}min work / ${lobby.settings.pomodoroBreak}min break`
                    : 'Disabled'}
                </div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-gray-400 text-sm mb-1">Ambient Sound</div>
                <div className="text-white font-medium capitalize">{lobby.settings.ambientSound}</div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-gray-400 text-sm mb-1">Emotes</div>
                <div className="text-white font-medium">
                  {lobby.settings.allowEmotes ? 'Enabled' : 'Disabled'}
                </div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-gray-400 text-sm mb-1">Chat</div>
                <div className="text-white font-medium">
                  {lobby.settings.allowChat ? 'Enabled' : 'Disabled'}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center space-y-4">
              {isHost ? (
                <>
                  <div className="text-gray-400 mb-4">
                    {allReady ? (
                      <span className="text-green-400 text-xl font-semibold">All players ready!</span>
                    ) : (
                      <span>Waiting for players to ready up...</span>
                    )}
                  </div>
                  <button
                    onClick={handleStart}
                    disabled={!allReady}
                    className="px-8 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xl font-bold rounded-lg transition-colors"
                  >
                    Start Study Session
                  </button>
                </>
              ) : (
                <>
                  <div className="text-gray-400 mb-4">
                    {isReady ? (
                      <span className="text-green-400 text-xl font-semibold">You're ready!</span>
                    ) : (
                      <span>Ready up when you're ready to start</span>
                    )}
                  </div>
                  <button
                    onClick={handleToggleReady}
                    className={`px-8 py-4 text-white text-xl font-bold rounded-lg transition-colors ${
                      isReady
                        ? 'bg-yellow-600 hover:bg-yellow-700'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {isReady ? 'Cancel Ready' : 'Ready Up'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
