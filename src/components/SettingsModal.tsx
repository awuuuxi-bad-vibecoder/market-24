import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import { DEFAULT_SETTINGS, GameSettings } from '../types/game';
import { GamepadGlyph } from './GamepadGlyph';
import { soundEngine } from '../utils/audio';

interface SettingsModalProps {
  settings: GameSettings;
  isFullscreen: boolean;
  focusIndex: number;
  fullscreenNote: string | null;
  onFocusIndex: (idx: number) => void;
  onToggleFullscreen: () => void;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isFullscreen,
  focusIndex,
  fullscreenNote,
  onFocusIndex,
  onToggleFullscreen,
  onUpdateSettings,
  onClose,
}) => {
  const toggleSetting = (key: 'scanlines' | 'filmGrain' | 'flickerEffect') => {
    soundEngine.playUiMove();
    onUpdateSettings({ [key]: !settings[key] });
  };

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-[#07090C]/82 backdrop-blur-sm p-8 select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Настройки игры"
    >
      <div className="w-[740px] bg-[#0E1217] border border-white/12 rounded-sm shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-3.5 border-b border-white/10">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
            Настройки
          </h2>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiBack();
              onClose();
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-white/10 text-xs text-[#B8C3CF] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <GamepadGlyph layout={settings.gamepadLayout} button="CANCEL" size="sm" />
            <span>Закрыть</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body (fits cleanly in 1280x720 without scrolling) */}
        <div className="p-5 space-y-4">
          {/* Focus 0: Brightness Calibration */}
          <div
            onMouseEnter={() => onFocusIndex(0)}
            className={`p-3 rounded-sm border transition-colors space-y-2 ${
              focusIndex === 0
                ? 'bg-[#131922] border-[#E59A3C]'
                : 'bg-[#090B0E]/60 border-white/8'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">
                Калибровка темноты {focusIndex === 0 ? '· ← / →' : ''}
              </span>
              <span className="font-mono text-[#E59A3C] tabular-nums">
                {Math.round(settings.brightness * 100)}%
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 p-2 bg-[#040507] border border-white/10 rounded-sm">
              <div
                className="h-10 flex items-center justify-center rounded-sm bg-[#090B0E] text-[11px] font-mono"
                style={{ opacity: Math.min(1, Math.max(0.05, 0.16 * settings.brightness)) }}
              >
                В тени
              </div>
              <div
                className="h-10 flex items-center justify-center rounded-sm bg-[#0E1318] text-[11px] font-mono"
                style={{ opacity: Math.min(1, Math.max(0.15, 0.48 * settings.brightness)) }}
              >
                Тележка
              </div>
              <div
                className="h-10 flex items-center justify-center rounded-sm bg-[#161E24] text-[11px] font-mono text-[#D9EFE3]"
                style={{ opacity: Math.min(1, Math.max(0.35, 0.85 * settings.brightness)) }}
              >
                Лампа
              </div>
            </div>

            <input
              type="range"
              min={0.65}
              max={1.45}
              step={0.05}
              value={settings.brightness}
              onChange={(e) => onUpdateSettings({ brightness: parseFloat(e.target.value) })}
              className="horror-slider w-full"
            />
          </div>

          {/* Focus 1 & 2: Audio Sliders */}
          <div className="grid grid-cols-2 gap-3.5">
            <div
              onMouseEnter={() => onFocusIndex(1)}
              className={`rounded-sm p-3 border transition-colors ${
                focusIndex === 1
                  ? 'bg-[#131922] border-[#E59A3C]'
                  : 'bg-[#090B0E] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-[#B8C3CF]">
                  Общая громкость {focusIndex === 1 ? '· ← / →' : ''}
                </span>
                <span className="font-mono text-[#E59A3C] tabular-nums">
                  {Math.round(settings.masterVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.masterVolume}
                onChange={(e) =>
                  onUpdateSettings({ masterVolume: parseFloat(e.target.value) })
                }
                className="horror-slider w-full"
              />
            </div>

            <div
              onMouseEnter={() => onFocusIndex(2)}
              className={`rounded-sm p-3 border transition-colors ${
                focusIndex === 2
                  ? 'bg-[#131922] border-[#E59A3C]'
                  : 'bg-[#090B0E] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-[#B8C3CF]">
                  Саундтрек и фон {focusIndex === 2 ? '· ← / →' : ''}
                </span>
                <span className="font-mono text-[#E59A3C] tabular-nums">
                  {Math.round(settings.ambienceVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.ambienceVolume}
                onChange={(e) =>
                  onUpdateSettings({ ambienceVolume: parseFloat(e.target.value) })
                }
                className="horror-slider w-full"
              />
            </div>
          </div>

          {/* Focus 3, 4, 5, 6: Toggles Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onMouseEnter={() => onFocusIndex(3)}
              onClick={() => toggleSetting('scanlines')}
              className={`px-3.5 py-2.5 rounded-sm border flex items-center justify-between text-left transition-colors cursor-pointer ${
                focusIndex === 3
                  ? 'bg-[#131922] border-[#E59A3C]'
                  : 'bg-[#090B0E] border-white/10'
              }`}
            >
              <span className="text-xs font-medium text-[#E6ECEF]">Линии развёртки (CRT)</span>
              <span
                className={`text-xs font-mono ${
                  settings.scanlines ? 'text-[#E59A3C]' : 'text-[#7F8C9B]'
                }`}
              >
                {settings.scanlines ? 'ВКЛ' : 'ВЫКЛ'}
              </span>
            </button>

            <button
              type="button"
              onMouseEnter={() => onFocusIndex(4)}
              onClick={() => toggleSetting('filmGrain')}
              className={`px-3.5 py-2.5 rounded-sm border flex items-center justify-between text-left transition-colors cursor-pointer ${
                focusIndex === 4
                  ? 'bg-[#131922] border-[#E59A3C]'
                  : 'bg-[#090B0E] border-white/10'
              }`}
            >
              <span className="text-xs font-medium text-[#E6ECEF]">Плёночное зерно</span>
              <span
                className={`text-xs font-mono ${
                  settings.filmGrain ? 'text-[#E59A3C]' : 'text-[#7F8C9B]'
                }`}
              >
                {settings.filmGrain ? 'ВКЛ' : 'ВЫКЛ'}
              </span>
            </button>

            <button
              type="button"
              onMouseEnter={() => onFocusIndex(5)}
              onClick={() => {
                soundEngine.playUiMove();
                onToggleFullscreen();
              }}
              className={`px-3.5 py-2.5 rounded-sm border flex items-center justify-between text-left transition-colors cursor-pointer ${
                focusIndex === 5
                  ? 'bg-[#131922] border-[#E59A3C]'
                  : 'bg-[#090B0E] border-white/10'
              }`}
            >
              <span className="text-xs font-medium text-[#E6ECEF]">Полный экран (F11)</span>
              <span
                className={`text-xs font-mono ${
                  isFullscreen ? 'text-[#E59A3C]' : 'text-[#7F8C9B]'
                }`}
              >
                {isFullscreen ? 'ВКЛ' : 'ВЫКЛ'}
              </span>
            </button>

            <button
              type="button"
              onMouseEnter={() => onFocusIndex(6)}
              onClick={() => toggleSetting('flickerEffect')}
              className={`px-3.5 py-2.5 rounded-sm border flex items-center justify-between text-left transition-colors cursor-pointer ${
                focusIndex === 6
                  ? 'bg-[#131922] border-[#E59A3C]'
                  : 'bg-[#090B0E] border-white/10'
              }`}
            >
              <span className="text-xs font-medium text-[#E6ECEF]">Мерцание ламп</span>
              <span
                className={`text-xs font-mono ${
                  settings.flickerEffect ? 'text-[#E59A3C]' : 'text-[#7F8C9B]'
                }`}
              >
                {settings.flickerEffect ? 'ВКЛ' : 'ВЫКЛ'}
              </span>
            </button>
          </div>

          {fullscreenNote && (
            <div className="text-xs font-mono text-[#E59A3C] text-center">
              {fullscreenNote}
            </div>
          )}
        </div>

        {/* Footer: Focus 7 (Reset) & Focus 8 (Apply/Close) */}
        <div className="px-6 py-3.5 border-t border-white/10 flex items-center justify-between bg-[#0B0E12]">
          <button
            type="button"
            onMouseEnter={() => onFocusIndex(7)}
            onClick={() => {
              soundEngine.playUiMove();
              onUpdateSettings(DEFAULT_SETTINGS);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border text-xs transition-colors cursor-pointer ${
              focusIndex === 7
                ? 'bg-[#18202A] border-[#E59A3C] text-white'
                : 'border-transparent text-[#8C99A8] hover:text-white'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Сбросить по умолчанию</span>
          </button>

          <button
            type="button"
            onMouseEnter={() => onFocusIndex(8)}
            onClick={() => {
              soundEngine.playUiConfirm();
              onClose();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-semibold transition-colors cursor-pointer ${
              focusIndex === 8
                ? 'bg-[#EEAC57] text-[#090B0E] ring-2 ring-white/80'
                : 'bg-[#E59A3C] text-[#090B0E] hover:bg-[#EEAC57]'
            }`}
          >
            <span>Применить</span>
            <GamepadGlyph layout={settings.gamepadLayout} button="CONFIRM" size="sm" />
          </button>
        </div>
      </div>
    </div>
  );
};
