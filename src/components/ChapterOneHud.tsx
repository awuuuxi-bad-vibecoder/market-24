import React from 'react';
import { GameSettings } from '../types/game';
import { StoreItem } from '../game/chapter1Data';
import { GamepadGlyph } from './GamepadGlyph';

export type ChapterPhase = 'SHOPPING' | 'CHECKOUT' | 'EXIT' | 'BLACKOUT' | 'ENDED';

interface ChapterOneHudProps {
  settings: GameSettings;
  phase: ChapterPhase;
  chapterElapsed: number;
  items: StoreItem[];
  nearbyPrompt: string | null;
  activeDialogue: string | null;
  endingFocusIdx: number;
  onSelectEndingFocus: (idx: number) => void;
  onActivateEnding: (idx: number) => void;
  onDismissDialogue: () => void;
}

export const ChapterOneHud: React.FC<ChapterOneHudProps> = ({
  settings,
  phase,
  chapterElapsed,
  items,
  nearbyPrompt,
  activeDialogue,
  endingFocusIdx,
  onSelectEndingFocus,
  onActivateEnding,
  onDismissDialogue,
}) => {
  if (phase === 'ENDED') {
    return (
      <div className="relative z-30 flex flex-col items-center justify-center w-full h-full bg-[#030406]/96 select-none animate-[fadeIn_800ms_ease-out]">
        <div className="text-center space-y-3 mb-12">
          <p className="font-pixel text-sm tracking-[0.25em] text-white/60 uppercase">
            Глава I завершена
          </p>
          <h2 className="font-pixel text-6xl font-bold tracking-wider text-white pixel-text-shadow">
            СВЕТ ПОГАС
          </h2>
        </div>

        <div className="flex flex-col gap-2.5 w-[340px]">
          {['Продолжить: Глава II', 'Начать главу заново', 'В главное меню'].map(
            (label, idx) => {
              const focused = endingFocusIdx === idx;
              return (
                <button
                  key={label}
                  type="button"
                  onMouseEnter={() => onSelectEndingFocus(idx)}
                  onClick={() => onActivateEnding(idx)}
                  className={`flex items-center justify-between px-4 py-3 rounded-sm border font-pixel text-base transition-colors cursor-pointer ${
                    focused
                      ? 'bg-[#141A22] border-white text-white'
                      : 'bg-[#090B0E] border-white/15 text-white/70 hover:text-white'
                  }`}
                >
                  <span>{label}</span>
                  {focused && (
                    <GamepadGlyph layout={settings.gamepadLayout} button="CONFIRM" size="sm" />
                  )}
                </button>
              );
            }
          )}
        </div>
      </div>
    );
  }

  // Smooth Chapter 1 dark opening title card (0..2.8s)
  const titleOverlayOpacity =
    chapterElapsed < 1.8
      ? 'opacity-100'
      : chapterElapsed < 2.9
      ? 'opacity-0 pointer-events-none'
      : 'opacity-0 pointer-events-none hidden';

  // Bottom-left controls guide visible for the first 20 seconds, then fades out smoothly
  const guideVisible = chapterElapsed >= 2.2 && chapterElapsed < 20.0;
  const collectedCount = items.filter((i) => i.collected).length;

  return (
    <div className="relative z-20 flex flex-col justify-between w-full h-full p-7 pointer-events-none select-none">
      {/* Chapter 1 Opening Fade Card */}
      <div
        className={`absolute inset-0 z-40 flex items-center justify-center bg-[#040507] transition-opacity duration-1000 ${titleOverlayOpacity}`}
      >
        <div className="text-center space-y-2">
          <p className="font-pixel text-sm tracking-[0.28em] text-white/65 uppercase">
            Глава I
          </p>
          <h2 className="font-pixel text-6xl font-bold tracking-tight text-white pixel-text-shadow">
            Ночной закуп
          </h2>
        </div>
      </div>

      {/* Top-Right Tasks Checklist ONLY */}
      <div className="flex items-start justify-end">
        {phase !== 'BLACKOUT' && (
          <aside className="w-76 bg-[#090B0E]/82 border border-white/20 rounded-sm p-4">
            <div className="flex items-center justify-between font-pixel text-sm text-white pixel-text-shadow mb-2">
              <span>{phase === 'SHOPPING' ? 'Список покупок' : 'Задачи'}</span>
              <span className="font-mono text-xs text-white/70 tabular-nums">
                {collectedCount}/{items.length}
              </span>
            </div>

            {phase === 'SHOPPING' ? (
              <ul className="space-y-1 font-pixel text-xs">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={`flex items-start gap-2 pixel-text-shadow ${
                      item.collected ? 'text-white/40 line-through' : 'text-white'
                    }`}
                  >
                    <span className="font-mono text-[11px] mt-0.5">
                      {item.collected ? '[x]' : '[ ]'}
                    </span>
                    <span>
                      {item.name}{' '}
                      <span className="text-white/55">· {item.department}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="space-y-1.5 font-pixel text-sm">
                <li className="flex items-start gap-2 text-white/40 line-through pixel-text-shadow">
                  <span className="font-mono text-xs mt-0.5">[x]</span>
                  <span>
                    Собрать продукты ({items.length}/{items.length})
                  </span>
                </li>
                <li
                  className={`flex items-start gap-2 pixel-text-shadow ${
                    phase === 'EXIT' ? 'text-white/40 line-through' : 'text-white'
                  }`}
                >
                  <span className="font-mono text-xs mt-0.5">
                    {phase === 'EXIT' ? '[x]' : '[ ]'}
                  </span>
                  <span>Оплатить на кассе №2</span>
                </li>
                {phase === 'EXIT' && (
                  <li className="flex items-start gap-2 text-white pixel-text-shadow">
                    <span className="font-mono text-xs mt-0.5">[ ]</span>
                    <span>Выйти из гипермаркета</span>
                  </li>
                )}
              </ul>
            )}
          </aside>
        )}
      </div>

      {/* Bottom Row: 20-second fading controls guide (bottom-left) + centered Dialogue/Prompt */}
      <div className="relative flex flex-col items-center gap-3 mt-auto">
        {activeDialogue ? (
          <div
            onClick={onDismissDialogue}
            className="pointer-events-auto max-w-xl w-full bg-[#090B0E]/94 border border-white/40 rounded-sm px-5 py-4 shadow-2xl cursor-pointer mb-2"
          >
            <p className="font-pixel text-base text-white pixel-text-shadow leading-relaxed">
              {activeDialogue}
            </p>
            {phase !== 'BLACKOUT' && (
              <div className="mt-3 flex items-center justify-end gap-2 font-pixel text-xs text-white/75">
                <GamepadGlyph layout={settings.gamepadLayout} button="CONFIRM" size="sm" />
                <span>Закрыть</span>
              </div>
            )}
          </div>
        ) : nearbyPrompt && phase !== 'BLACKOUT' ? (
          <div className="flex items-center gap-2.5 bg-[#090B0E]/88 border border-white/25 rounded-sm px-4 py-2 font-pixel text-sm text-white pixel-text-shadow mb-2">
            <GamepadGlyph layout={settings.gamepadLayout} button="INTERACT" size="sm" />
            <span>{nearbyPrompt}</span>
          </div>
        ) : null}

        {/* Auto-fading 20-second Controls Guide in Bottom-Left */}
        <div
          className={`self-start flex flex-wrap items-center gap-4 bg-[#090B0E]/78 border border-white/15 rounded-sm px-3.5 py-2 font-pixel text-xs text-white/90 pixel-text-shadow transition-opacity duration-1000 ${
            guideVisible && phase !== 'BLACKOUT'
              ? 'opacity-100'
              : 'opacity-0 pointer-events-none'
          }`}
        >
          <span>L / D-Pad · Ходьба</span>
          <span className="flex items-center gap-1.5">
            <GamepadGlyph layout={settings.gamepadLayout} button="SPRINT" size="sm" />
            <span>Бег</span>
          </span>
          <span className="flex items-center gap-1.5">
            <GamepadGlyph layout={settings.gamepadLayout} button="INTERACT" size="sm" />
            <span>Взаимодействие</span>
          </span>
          <span className="flex items-center gap-1.5">
            <GamepadGlyph layout={settings.gamepadLayout} button="PAUSE" size="sm" />
            <span>Пауза</span>
          </span>
        </div>
      </div>
    </div>
  );
};
