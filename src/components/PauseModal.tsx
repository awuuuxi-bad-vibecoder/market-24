import React from 'react';
import { GameSettings } from '../types/game';
import { GamepadGlyph } from './GamepadGlyph';

interface PauseModalProps {
  settings: GameSettings;
  focusIndex: number;
  onSelectIndex: (idx: number) => void;
  onActivate: (idx: number) => void;
}

const PAUSE_ITEMS = [
  'Продолжить',
  'Геймпад и раскладка',
  'Настройки',
  'Выйти в меню',
];

export const PauseModal: React.FC<PauseModalProps> = ({
  settings,
  focusIndex,
  onSelectIndex,
  onActivate,
}) => {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-[#06080B]/82 backdrop-blur-xs select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Пауза"
    >
      <div className="w-[380px] bg-[#0E1217] border border-white/14 rounded-sm p-6 shadow-2xl">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-white mb-5">
          Пауза
        </h2>

        <div className="flex flex-col gap-2">
          {PAUSE_ITEMS.map((label, idx) => {
            const focused = focusIndex === idx;
            return (
              <button
                key={label}
                type="button"
                onMouseEnter={() => onSelectIndex(idx)}
                onClick={() => onActivate(idx)}
                className={`flex items-center justify-between px-4 py-3 rounded-sm border text-sm font-medium transition-colors cursor-pointer ${
                  focused
                    ? 'bg-[#18202A] border-[#E59A3C] text-white'
                    : 'bg-[#090B0E] border-white/8 text-[#9AA6B4] hover:text-white'
                }`}
              >
                <span>{label}</span>
                {focused && (
                  <GamepadGlyph layout={settings.gamepadLayout} button="CONFIRM" size="sm" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-[#8C99A8]">
          <GamepadGlyph layout={settings.gamepadLayout} button="CONFIRM" size="sm" />
          <span>— выбрать;</span>
          <GamepadGlyph layout={settings.gamepadLayout} button="CANCEL" size="sm" />
          <span>— назад</span>
        </div>
      </div>
    </div>
  );
};
