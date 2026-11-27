import React from 'react';
import { Lock, Play, X } from 'lucide-react';
import { CHAPTERS, GameSettings } from '../types/game';
import { GamepadGlyph } from './GamepadGlyph';
import { soundEngine } from '../utils/audio';

interface ChaptersModalProps {
  settings: GameSettings;
  focusIndex: number;
  onFocusIndex: (idx: number) => void;
  onStartChapter: (chapterId: number) => void;
  onClose: () => void;
}

export const ChaptersModal: React.FC<ChaptersModalProps> = ({
  settings,
  focusIndex,
  onFocusIndex,
  onStartChapter,
  onClose,
}) => {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-[#07090C]/82 backdrop-blur-sm p-8 select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Выбор главы"
    >
      <div className="w-[780px] bg-[#0E1217] border border-white/12 rounded-sm shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between gap-4 px-6 py-3.5 border-b border-white/10">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
            Главы
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

        <div className="p-5 space-y-2.5">
          {CHAPTERS.map((ch, idx) => {
            const available = ch.status === 'AVAILABLE';
            const focused = focusIndex === idx;
            return (
              <div
                key={ch.id}
                onMouseEnter={() => onFocusIndex(idx)}
                onClick={() => {
                  if (available) {
                    soundEngine.playUiConfirm();
                    onStartChapter(ch.id);
                  } else {
                    soundEngine.playUiBack();
                  }
                }}
                className={`p-3.5 rounded-sm border flex items-center justify-between gap-4 transition-colors cursor-pointer ${
                  focused
                    ? 'bg-[#131922] border-[#E59A3C]'
                    : 'bg-[#090B0E]/60 border-white/8'
                } ${available ? 'opacity-100' : 'opacity-55'}`}
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2.5 text-xs font-mono text-[#8C99A8]">
                    <span className={available ? 'text-[#E59A3C]' : 'text-[#687584]'}>
                      {available ? 'Доступно' : 'Закрыто'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{ch.location}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white">{ch.title}</h3>
                  <p className="text-xs text-[#9AA6B4] leading-snug">{ch.summary}</p>
                </div>

                {available ? (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-sm bg-[#E59A3C] text-[#090B0E] text-xs font-semibold whitespace-nowrap shrink-0">
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Запустить</span>
                    {focused && (
                      <GamepadGlyph layout={settings.gamepadLayout} button="CONFIRM" size="sm" />
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-white/10 text-xs text-[#6F7C8B] whitespace-nowrap shrink-0">
                    <Lock className="w-3.5 h-3.5" />
                    <span>{ch.subtitle}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
