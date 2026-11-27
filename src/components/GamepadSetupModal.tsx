import React from 'react';
import { X, Vibrate } from 'lucide-react';
import { GamepadLayout, GamepadSnapshot, GameSettings } from '../types/game';
import { ControllerVisualizer, GamepadGlyph } from './GamepadGlyph';
import { soundEngine } from '../utils/audio';

interface GamepadSetupModalProps {
  settings: GameSettings;
  snapshot: GamepadSnapshot;
  focusIndex: number;
  onFocusIndex: (idx: number) => void;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
  onRumbleTest: () => void;
  onClose: () => void;
}

const LAYOUT_OPTIONS: { id: GamepadLayout; label: string; desc: string }[] = [
  { id: 'playstation', label: 'PlayStation', desc: '✕ ○ □ △ · L1/R1' },
  { id: 'xbox', label: 'Xbox', desc: 'A B X Y · LB/RB' },
  { id: 'nintendo', label: 'Nintendo', desc: 'B A Y X · L/R' },
];

export const GamepadSetupModal: React.FC<GamepadSetupModalProps> = ({
  settings,
  snapshot,
  focusIndex,
  onFocusIndex,
  onUpdateSettings,
  onRumbleTest,
  onClose,
}) => {
  const bindings: {
    action: string;
    detail: string;
    button: 'CONFIRM' | 'CANCEL' | 'INTERACT' | 'FLASHLIGHT' | 'SPRINT' | 'PAUSE' | 'STICK' | 'RSTICK';
  }[] = [
    { action: 'Передвижение', detail: 'Левый стик / крестовина', button: 'STICK' },
    { action: 'Луч вспышки', detail: 'Правый стик (Глава II)', button: 'RSTICK' },
    { action: 'Ускорение (Бег)', detail: 'Удерживать при ходьбе', button: 'SPRINT' },
    { action: 'Взаимодействие', detail: 'Осмотр и подбор', button: 'INTERACT' },
    { action: 'Вспышка телефона', detail: 'Вкл / Выкл (Глава II)', button: 'FLASHLIGHT' },
    { action: 'Подтвердить', detail: 'Выбор в меню', button: 'CONFIRM' },
    { action: 'Назад / Пауза', detail: 'Закрыть окно / пауза', button: 'CANCEL' },
  ];

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-[#07090C]/82 backdrop-blur-sm p-8 select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Настройка геймпада и раскладки"
    >
      <div className="w-[960px] bg-[#0E1217] border border-white/12 rounded-sm shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-3.5 border-b border-white/10">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
              Геймпад и раскладка
            </h2>
          </div>

          <button
            type="button"
            onMouseEnter={() => onFocusIndex(5)}
            onClick={() => {
              soundEngine.playUiBack();
              onClose();
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              focusIndex === 5
                ? 'bg-[#18202A] border-[#E59A3C] text-white'
                : 'border-white/10 text-[#B8C3CF] hover:text-white'
            }`}
          >
            <GamepadGlyph layout={settings.gamepadLayout} button="CANCEL" size="sm" />
            <span>Закрыть</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 grid grid-cols-12 gap-5">
          {/* Left column: Layout selector & live controller visualizer */}
          <div className="col-span-7 flex flex-col gap-3.5">
            {/* Focus 0: Layout Picker */}
            <div
              onMouseEnter={() => onFocusIndex(0)}
              className={`p-2.5 rounded-sm border transition-colors ${
                focusIndex === 0
                  ? 'bg-[#131922] border-[#E59A3C]'
                  : 'bg-[#090B0E]/60 border-white/8'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-[#8C99A8] mb-2">
                <span>Раскладка кнопок {focusIndex === 0 ? '· ← / →' : ''}</span>
                <span className="font-mono text-[11px] text-[#7F8C9B]">
                  {snapshot.connected ? 'Контроллер подключён' : 'Подключите геймпад'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {LAYOUT_OPTIONS.map((opt) => {
                  const active = settings.gamepadLayout === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiConfirm();
                        onUpdateSettings({ gamepadLayout: opt.id });
                      }}
                      className={`px-3 py-2 rounded-sm text-left transition-colors cursor-pointer border ${
                        active
                          ? 'bg-[#1D2633] text-white border-[#E59A3C]'
                          : 'bg-[#0E1217] text-[#8C99A8] hover:text-white border-white/8'
                      }`}
                    >
                      <div className="text-sm font-semibold whitespace-nowrap">{opt.label}</div>
                      <div className="text-[11px] font-mono text-[#7F8C9B] mt-0.5 whitespace-nowrap">
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <ControllerVisualizer layout={settings.gamepadLayout} snapshot={snapshot} />

            {/* Deadzone (Focus 1) & Vibration (Focus 2 & 3) */}
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
                    Мёртвая зона {focusIndex === 1 ? '· ← / →' : ''}
                  </span>
                  <span className="font-mono text-[#E59A3C] tabular-nums">
                    {Math.round(settings.stickDeadzone * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.08}
                  max={0.35}
                  step={0.02}
                  value={settings.stickDeadzone}
                  onChange={(e) =>
                    onUpdateSettings({ stickDeadzone: parseFloat(e.target.value) })
                  }
                  className="horror-slider w-full"
                />
              </div>

              <div
                onMouseEnter={() => onFocusIndex(2)}
                className={`rounded-sm p-3 border flex items-center justify-between gap-2 transition-colors ${
                  focusIndex === 2 || focusIndex === 3
                    ? 'bg-[#131922] border-[#E59A3C]'
                    : 'bg-[#090B0E] border-white/10'
                }`}
              >
                <div>
                  <div className="text-xs font-medium text-[#E6ECEF]">Виброотклик</div>
                  <div className="text-[11px] text-[#7F8C9B]">Отдача геймпада</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onMouseEnter={(e) => {
                      e.stopPropagation();
                      onFocusIndex(3);
                    }}
                    onClick={() => {
                      soundEngine.playUiConfirm();
                      onRumbleTest();
                    }}
                    disabled={!snapshot.connected || !settings.vibration}
                    title="Проверить вибрацию"
                    className={`p-1.5 rounded-sm border text-[#B8C3CF] hover:text-white disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed ${
                      focusIndex === 3 ? 'border-[#E59A3C] text-white' : 'border-white/10'
                    }`}
                  >
                    <Vibrate className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiMove();
                      onUpdateSettings({ vibration: !settings.vibration });
                    }}
                    className={`px-2.5 py-1 rounded-sm text-xs font-mono border transition-colors cursor-pointer ${
                      settings.vibration
                        ? 'bg-[#E59A3C]/15 border-[#E59A3C]/70 text-[#E59A3C]'
                        : 'bg-transparent border-white/10 text-[#7F8C9B]'
                    }`}
                  >
                    {settings.vibration ? 'ВКЛ' : 'ВЫКЛ'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: Control Mapping Table + Keyboard fallback toggle (Focus 4) */}
          <div className="col-span-5 flex flex-col justify-between bg-[#090B0E] border border-white/10 rounded-sm p-4">
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Схема управления</h3>
              <div className="divide-y divide-white/8">
                {bindings.map((b) => (
                  <div key={b.action} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[#E6ECEF]">{b.action}</div>
                      <div className="text-[11px] text-[#7F8C9B]">{b.detail}</div>
                    </div>
                    {b.button === 'STICK' || b.button === 'RSTICK' ? (
                      <span className="px-2 py-0.5 rounded-sm border border-[#E6ECEF]/25 bg-[#0E1217] font-mono text-[11px] text-[#B8C3CF] whitespace-nowrap">
                        {b.button === 'STICK' ? 'L / D-Pad' : 'R · Стик'}
                      </span>
                    ) : (
                      <GamepadGlyph layout={settings.gamepadLayout} button={b.button} size="md" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div
              onMouseEnter={() => onFocusIndex(4)}
              className={`mt-3 p-2.5 rounded-sm border flex items-center justify-between gap-3 transition-colors ${
                focusIndex === 4
                  ? 'bg-[#131922] border-[#E59A3C]'
                  : 'border-white/10 bg-[#0E1217]/50'
              }`}
            >
              <div>
                <div className="text-xs font-medium text-[#E6ECEF]">Клавиатура (резерв)</div>
                <div className="text-[11px] text-[#7F8C9B]">WASD / Стрелки / Enter</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiMove();
                  onUpdateSettings({ keyboardAssist: !settings.keyboardAssist });
                }}
                className={`px-3 py-1 rounded-sm text-xs font-mono border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  settings.keyboardAssist
                    ? 'bg-[#E59A3C]/15 border-[#E59A3C]/60 text-[#E59A3C]'
                    : 'bg-transparent border-white/10 text-[#7F8C9B]'
                }`}
              >
                {settings.keyboardAssist ? 'ВКЛ' : 'ВЫКЛ'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
