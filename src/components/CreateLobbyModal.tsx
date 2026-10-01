import { useState } from 'react';
import { lobbyManager } from '../game/lobbyManager';
import type { LobbySettings } from '../game/lobby';

interface CreateLobbyModalProps {
  onClose: () => void;
  onCreated: (lobbyId: string) => void;
}

export default function CreateLobbyModal({ onClose, onCreated }: CreateLobbyModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  
  const [pomodoroEnabled, setPomodoroEnabled] = useState(true);
  const [pomodoroWork, setPomodoroWork] = useState(25);
  const [pomodoroBreak, setPomodoroBreak] = useState(5);
  const [ambientSound, setAmbientSound] = useState<'none' | 'rain' | 'cafe' | 'train'>('train');
  const [allowEmotes, setAllowEmotes] = useState(true);
  const [allowChat, setAllowChat] = useState(true);

  const [error, setError] = useState('');

  const handleCreate = () => {
    if (!name.trim()) {
      setError('Please enter a lobby name');
      return;
    }

    if (isPrivate && !password.trim()) {
      setError('Please enter a password for private lobby');
      return;
    }

    try {
      const settings: Partial<LobbySettings> = {
        pomodoroEnabled,
        pomodoroWork,
        pomodoroBreak,
        ambientSound,
        allowEmotes,
        allowChat
      };

      const lobby = lobbyManager.createLobby(
        name.trim(),
        'You', // TODO: Get actual player name
        maxPlayers,
        settings,
        description.trim() || undefined,
        isPrivate,
        isPrivate ? password : undefined
      );

      onCreated(lobby.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lobby');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Create Study Lobby</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Basic Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Lobby Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Late Night Study Session"
                maxLength={50}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will you be studying?"
                maxLength={200}
                rows={3}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Players: {maxPlayers}
              </label>
              <input
                type="range"
                min="2"
                max="20"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>2</span>
                <span>20</span>
              </div>
            </div>
          </div>

          {/* Privacy */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Privacy</h3>
            
            <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div>
                <div className="text-white font-medium">Private Lobby</div>
                <div className="text-sm text-gray-400">Require password to join</div>
              </div>
              <button
                onClick={() => setIsPrivate(!isPrivate)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isPrivate ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPrivate ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {isPrivate && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter lobby password"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {/* Pomodoro Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Pomodoro Timer</h3>
              <button
                onClick={() => setPomodoroEnabled(!pomodoroEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  pomodoroEnabled ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    pomodoroEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {pomodoroEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Work Duration (min)
                  </label>
                  <input
                    type="number"
                    value={pomodoroWork}
                    onChange={(e) => setPomodoroWork(Number(e.target.value))}
                    min="1"
                    max="120"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Break Duration (min)
                  </label>
                  <input
                    type="number"
                    value={pomodoroBreak}
                    onChange={(e) => setPomodoroBreak(Number(e.target.value))}
                    min="1"
                    max="60"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Ambient Sound */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Ambient Sound</h3>
            <div className="grid grid-cols-2 gap-3">
              {(['none', 'rain', 'cafe', 'train'] as const).map((sound) => (
                <button
                  key={sound}
                  onClick={() => setAmbientSound(sound)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    ambientSound === sound
                      ? 'border-blue-500 bg-blue-900 bg-opacity-20'
                      : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                  }`}
                >
                  <div className="text-white font-medium capitalize">{sound}</div>
                  <div className="text-sm text-gray-400">
                    {sound === 'none' && 'No ambient sound'}
                    {sound === 'rain' && 'Rainy day vibes'}
                    {sound === 'cafe' && 'Coffee shop atmosphere'}
                    {sound === 'train' && 'Train journey sounds'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Features</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div>
                  <div className="text-white font-medium">Allow Emotes</div>
                  <div className="text-sm text-gray-400">Players can use emotes</div>
                </div>
                <button
                  onClick={() => setAllowEmotes(!allowEmotes)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    allowEmotes ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      allowEmotes ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div>
                  <div className="text-white font-medium">Allow Chat</div>
                  <div className="text-sm text-gray-400">Players can send messages</div>
                </div>
                <button
                  onClick={() => setAllowChat(!allowChat)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    allowChat ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      allowChat ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-900 border-t border-gray-700 p-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Create Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
