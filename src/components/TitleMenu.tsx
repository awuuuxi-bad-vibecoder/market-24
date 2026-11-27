import React from 'react';
import { Gamepad2, SlidersHorizontal, BookOpen, Play } from 'lucide-react';
import { GameSettings, MenuModal } from '../types/game';
import { GamepadGlyph } from './GamepadGlyph';

interface TitleMenuProps {
  settings: GameSettings;
  selectedIndex: number;
  activeModal: MenuModal;
  onSelectIndex: (idx: number) => void;
  onActivateItem: (idx: number) => void;
  audioUnlocked: boolean;
  onUnlockAudio: () => void;
}

const MENU_ITEMS = [
  { id: 'start', label: 'Начать смену', icon: Play },
  { id: 'gamepad', label: 'Геймпад и раскладка', icon: Gamepad2 },
  { id: 'settings', label: 'Настройки', icon: SlidersHorizontal },
  { id: 'chapters', label: 'Главы', icon: BookOpen },
];

export const TitleMenu: React.FC<TitleMenuProps> = ({
  settings,
  selectedIndex,
  activeModal,
  onSelectIndex,
  onActivateItem,
  audioUnlocked,
  onUnlockAudio,
}) => {
  return (
    <div
      className="relative flex flex-col justify-between w-full h-full px-16 py-14 select-none"
      onClick={() => {
        if (!audioUnlocked) onUnlockAudio();
      }}
    >
      <div aria-hidden="true" />

      {/* Title + 4 Clean Buttons in Crisp White Pixel Typography */}
      <main className="relative z-10 w-[400px] my-auto">
        <h1 className="font-pixel text-7xl font-bold tracking-tight text-white pixel-text-shadow leading-none mb-10">
          МАРКЕТ 24
        </h1>

        <nav aria-label="Главное меню" className="flex flex-col gap-2.5">
          {MENU_ITEMS.map((item, idx) => {
            const isSelected = activeModal === 'NONE' && selectedIndex === idx;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => onSelectIndex(idx)}
                onClick={() => onActivateItem(idx)}
                className={`group relative flex items-center justify-between px-4 py-3.5 rounded-sm border text-left transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-[#141A22]/92 border-white text-white translate-x-1.5'
                    : 'bg-[#0D1117]/45 border-white/10 text-white/75 hover:bg-[#131820]/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isSelected ? 'text-white' : 'text-white/55 group-hover:text-white'
                    }`}
                  />
                  <span className="font-pixel text-lg font-medium tracking-wide whitespace-nowrap truncate pixel-text-shadow">
                    {item.label}
                  </span>
                </div>

                {isSelected && (
                  <GamepadGlyph layout={settings.gamepadLayout} button="CONFIRM" size="sm" />
                )}
              </button>
            );
          })}
        </nav>
      </main>

      {/* Compact Controller Legend Only */}
      <footer className="relative z-10 flex items-center gap-2 font-pixel text-sm text-white/85 pixel-text-shadow">
        <GamepadGlyph layout={settings.gamepadLayout} button="CONFIRM" size="sm" />
        <span>— выбрать;</span>
        <GamepadGlyph layout={settings.gamepadLayout} button="CANCEL" size="sm" />
        <span>— назад</span>
      </footer>
    </div>
  );
};
