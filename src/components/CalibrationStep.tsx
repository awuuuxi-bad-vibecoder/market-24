import React from 'react';
import { ArrowLeft, ArrowRight, Eye, Gamepad2, Volume2 } from 'lucide-react';
import { GamepadLayout, GamepadSnapshot, GameSettings } from '../types/game';
import { GamepadGlyph } from './GamepadGlyph';
import { soundEngine } from '../utils/audio';

interface CalibrationStepProps {
  settings: GameSettings;
  snapshot: GamepadSnapshot;
  step: number; // 0, 1, 2
  focusIndex: number;
  onStepChange: (step: number) => void;
  onFocusIndex: (idx: number) => void;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
  onTestSound: () => void;
  onContinue: () => void;
}

const LAYOUTS: { id: GamepadLayout; name: string; glyphs: string }[] = [
  { id: 'playstation', name: 'PlayStation', glyphs: '✕  ○  □  △' },
  { id: 'xbox', name: 'Xbox', glyphs: 'A  B  X  Y' },
  { id: 'nintendo', name: 'Nintendo', glyphs: 'B  A  Y  X' },
];

const STEP_TITLES = [
  { label: 'Шаг 1 из 3', title: 'Контроллер и раскладка', icon: Gamepad2 },
  { label: 'Шаг 2 из 3', title: 'Яркость и глубина темноты', icon: Eye },
  { label: 'Шаг 3 из 3', title: 'Звук и видеоэффекты', icon: Volume2 },
];

export const CalibrationStep: React.FC<CalibrationStepProps> = ({
  settings,
  snapshot,
  step,
  focusIndex,
  onStepChange,
  onFocusIndex,
  onUpdateSettings,
  onTestSound,
  onContinue,
}) => {
  const stepMeta = STEP_TITLES[step] ?? STEP_TITLES[0];
  const StepIcon = stepMeta.icon;

  // Live stick preview offsets
  const lx = Math.max(-1, Math.min(1, snapshot.axes[0] ?? 0)) * 7;
  const ly = Math.max(-1, Math.min(1, snapshot.axes[1] ?? 0)) * 7;
  const rx = Math.max(-1, Math.min(1, snapshot.axes[2] ?? 0)) * 7;
  const ry = Math.max(-1, Math.min(1, snapshot.axes[3] ?? 0)) * 7;

  return (
    <div className="relative z-20 flex items-center justify-center w-full h-full bg-[#06080B]/95 backdrop-blur-sm p-8 select-none">
      <div className="w-[740px] bg-[#0D1117] border border-white/15 rounded-sm shadow-2xl p-7 space-y-5">
        {/* Header + 3-Step Visual Progress */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-white/55 uppercase">
              <StepIcon className="w-3.5 h-3.5" />
              <span>{stepMeta.label}</span>
            </div>
            <h2 className="font-pixel text-3xl font-semibold tracking-tight text-white pixel-text-shadow">
              {stepMeta.title}
            </h2>
          </div>

          {/* Minimal 3-bar Step Indicator */}
          <div className="flex items-center gap-2 pt-2">
            {[0, 1, 2].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  soundEngine.playUiMove();
                  onStepChange(s);
                  onFocusIndex(0);
                }}
                aria-label={`Шаг ${s + 1}`}
                className={`h-1.5 rounded-xs transition-all cursor-pointer ${
                  s === step
                    ? 'w-10 bg-white'
                    : s < step
                    ? 'w-6 bg-white/55'
                    : 'w-6 bg-white/15'
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP 0: GAMEPAD LAYOUT + INTERACTIVE CONTROLLER VISUAL */}
        {step === 0 && (
          <div className="space-y-4">
            {/* Pixel Controller Schematic Visualization */}
            <div className="flex items-center justify-between gap-6 bg-[#07090D] border border-white/10 rounded-sm p-4">
              <svg viewBox="0 0 220 110" className="w-[240px] h-[116px] shrink-0">
                {/* Controller Body Silhouette */}
                <path
                  d="M48 26 L172 26 Q192 26 198 54 L204 84 Q205 98 190 98 Q176 98 166 76 L154 70 L66 70 L54 76 Q44 98 30 98 Q15 98 16 84 L22 54 Q28 26 48 26 Z"
                  fill="#151B24"
                  stroke="#394455"
                  strokeWidth="2"
                />
                {/* D-Pad */}
                <rect x="44" y="42" width="10" height="26" rx="1" fill="#2A3342" />
                <rect x="36" y="50" width="26" height="10" rx="1" fill="#2A3342" />
                {/* Left Stick */}
                <circle cx="80" cy="68" r="11" fill="#0B0E14" stroke="#394455" strokeWidth="1.5" />
                <circle cx={80 + lx} cy={68 + ly} r="6.5" fill="#9FB0C4" />
                {/* Right Stick */}
                <circle cx="140" cy="68" r="11" fill="#0B0E14" stroke="#394455" strokeWidth="1.5" />
                <circle cx={140 + rx} cy={68 + ry} r="6.5" fill="#D5E3F2" />
                {/* Right Face Buttons colored by layout */}
                <circle cx="171" cy="39" r="5" fill={settings.gamepadLayout === 'xbox' ? '#D4A53B' : settings.gamepadLayout === 'nintendo' ? '#589CD6' : '#58B88C'} />
                <circle cx="183" cy="51" r="5" fill={settings.gamepadLayout === 'xbox' ? '#C74C4C' : settings.gamepadLayout === 'nintendo' ? '#C74C4C' : '#D45A5A'} />
                <circle cx="171" cy="63" r="5" fill={settings.gamepadLayout === 'xbox' ? '#54A364' : settings.gamepadLayout === 'nintendo' ? '#D4A53B' : '#5C8ED9'} />
                <circle cx="159" cy="51" r="5" fill={settings.gamepadLayout === 'xbox' ? '#5C8ED9' : settings.gamepadLayout === 'nintendo' ? '#54A364' : '#C96AB8'} />
                {/* Status LED */}
                <rect
                  x="100"
                  y="29"
                  width="20"
                  height="3"
                  fill={snapshot.connected ? '#5EC28A' : '#526071'}
                />
              </svg>

              <div className="flex-1 space-y-2.5">
                <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                  <span className="font-pixel text-white/80">Статус геймпада</span>
                  <span
                    className={`font-mono text-[11px] ${
                      snapshot.connected ? 'text-[#73D49B]' : 'text-white/55'
                    }`}
                  >
                    {snapshot.connected ? 'ПОДКЛЮЧЁН' : 'КЛАВИАТУРА / АВТО'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 font-pixel text-xs text-white/80">
                  <div className="flex items-center gap-2">
                    <GamepadGlyph layout={settings.gamepadLayout} button="CONFIRM" size="sm" />
                    <span>Выбор / Далее</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GamepadGlyph layout={settings.gamepadLayout} button="CANCEL" size="sm" />
                    <span>Назад / Пауза</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GamepadGlyph layout={settings.gamepadLayout} button="INTERACT" size="sm" />
                    <span>Взаимодействие</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GamepadGlyph layout={settings.gamepadLayout} button="FLASHLIGHT" size="sm" />
                    <span>Вспышка (Гл. II)</span>
                  </div>
                </div>
                <p className="font-mono text-[11px] text-white/45">
                  L — ходьба · R — наведение луча · Можно изменить позже в меню.
                </p>
              </div>
            </div>

            {/* Layout Selector */}
            <div
              onMouseEnter={() => onFocusIndex(0)}
              className={`p-3.5 rounded-sm border transition-colors ${
                focusIndex === 0
                  ? 'bg-[#131922] border-white'
                  : 'bg-[#090B0F] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-2.5">
                <span className="font-pixel text-sm text-white">
                  Выберите обозначения кнопок {focusIndex === 0 ? '· ← / →' : ''}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {LAYOUTS.map((l) => {
                  const active = settings.gamepadLayout === l.id;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiConfirm();
                        onUpdateSettings({ gamepadLayout: l.id });
                      }}
                      className={`p-3 rounded-sm border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#1D2633] border-white text-white'
                          : 'bg-[#080A0D] border-white/10 text-white/65 hover:text-white hover:border-white/30'
                      }`}
                    >
                      <div className="font-pixel text-base font-medium">{l.name}</div>
                      <div className="text-xs font-mono text-white/70 mt-1">{l.glyphs}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: BRIGHTNESS & DARKNESS VISUALIZATION */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Live Pixel Corridor Shadow Calibration Preview */}
            <div className="relative h-[168px] bg-[#020304] border border-white/15 rounded-sm overflow-hidden flex items-center justify-between px-8">
              {/* Simulated Dark Store Aisle with Masked Silhouette */}
              <div
                className="relative flex-1 h-full flex items-end justify-center gap-10 pb-3 transition-opacity duration-150"
                style={{ opacity: Math.min(1, Math.max(0.1, (settings.brightness - 0.5) * 0.95)) }}
              >
                {/* Left Shelf Rack */}
                <div className="w-20 h-28 bg-[#12161C] border border-[#242C38] flex flex-col justify-evenly p-1.5">
                  <div className="h-2 bg-[#2B3543]" />
                  <div className="h-2 bg-[#252E3A]" />
                  <div className="h-2 bg-[#2B3543]" />
                </div>

                {/* Hidden Silhouette in Deep Shadow */}
                <div
                  className="flex flex-col items-center pb-1"
                  style={{
                    opacity: Math.min(0.95, Math.max(0.05, (settings.brightness - 0.58) * 0.85)),
                  }}
                >
                  <div className="w-5 h-5 bg-[#B8B0A0] flex items-center justify-around px-1">
                    <div className="w-1 h-1 bg-[#08090C]" />
                    <div className="w-1 h-1 bg-[#08090C]" />
                  </div>
                  <div className="w-8 h-16 bg-[#131720] mt-0.5" />
                </div>

                {/* Right Shelf Rack */}
                <div className="w-20 h-28 bg-[#12161C] border border-[#242C38] flex flex-col justify-evenly p-1.5">
                  <div className="h-2 bg-[#2B3543]" />
                  <div className="h-2 bg-[#252E3A]" />
                  <div className="h-2 bg-[#2B3543]" />
                </div>
              </div>

              {/* Emergency Exit Red Glow Reference */}
              <div className="w-40 shrink-0 pl-4 border-l border-white/10 space-y-2.5">
                <div className="px-2 py-1 bg-[#380F12] border border-[#9E2B32] text-center font-mono text-[10px] tracking-widest text-[#FF9B9B]">
                  ВЫХОД
                </div>
                <p className="font-pixel text-xs text-white/75 leading-relaxed">
                  Отрегулируйте ползунок так, чтобы фигура между стеллажами оставалась едва заметной в тени.
                </p>
              </div>
            </div>

            <div
              onMouseEnter={() => onFocusIndex(0)}
              className={`p-3.5 rounded-sm border transition-colors space-y-3 ${
                focusIndex === 0
                  ? 'bg-[#131922] border-white'
                  : 'bg-[#090B0F] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-pixel text-sm text-white">
                  Уровень яркости {focusIndex === 0 ? '· ← / →' : ''}
                </span>
                <span className="font-mono text-white tabular-nums">
                  {Math.round(settings.brightness * 100)}%
                </span>
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
          </div>
        )}

        {/* STEP 2: AUDIO & VHS/CRT VISUALIZATION */}
        {step === 2 && (
          <div className="space-y-3">
            {/* Live Audio & CRT Preview Banner */}
            <div className="grid grid-cols-2 gap-3">
              {/* Audio Level Meter Visualization */}
              <div className="bg-[#07090D] border border-white/10 rounded-sm p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] font-mono text-white/60">
                  <span>УРОВЕНЬ ЗВУКА</span>
                  <span>{Math.round(settings.masterVolume * 100)}%</span>
                </div>
                <div className="flex items-end gap-1.5 h-10 pt-2">
                  {[0.35, 0.65, 0.9, 0.55, 0.8, 1.0, 0.7, 0.45, 0.85, 0.5].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-white/80 rounded-t-xs transition-all duration-150"
                      style={{
                        height: `${Math.max(
                          10,
                          Math.round(h * settings.masterVolume * (i % 2 === 0 ? 1 : settings.ambienceVolume) * 100)
                        )}%`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* CRT / Grain Live Sample */}
              <div className="relative bg-[#0B1016] border border-white/10 rounded-sm p-3 overflow-hidden flex items-center justify-between">
                <div>
                  <div className="font-pixel text-xs text-white">Изображение</div>
                  <div className="font-mono text-[10px] text-white/55 mt-0.5">
                    ЭЛТ: {settings.scanlines ? 'ВКЛ' : 'ВЫКЛ'} · Зерно: {settings.filmGrain ? 'ВКЛ' : 'ВЫКЛ'}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-sm bg-[#19232E] border border-white/20 flex items-center justify-center font-pixel text-xs text-white/80">
                  24
                </div>
                {settings.scanlines && (
                  <div className="pointer-events-none absolute inset-0 crt-scanlines opacity-55" />
                )}
                {settings.filmGrain && (
                  <div className="pointer-events-none absolute inset-0 film-grain opacity-85" />
                )}
              </div>
            </div>

            {/* Audio & Visual Controls */}
            <div className="space-y-2">
              <div
                onMouseEnter={() => onFocusIndex(0)}
                className={`p-2.5 rounded-sm border transition-colors space-y-1.5 ${
                  focusIndex === 0 ? 'bg-[#131922] border-white' : 'bg-[#090B0F] border-white/10'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-pixel text-sm text-white">
                    Общая громкость {focusIndex === 0 ? '· ← / →' : ''}
                  </span>
                  <span className="font-mono text-white tabular-nums">
                    {Math.round(settings.masterVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.masterVolume}
                  onChange={(e) => onUpdateSettings({ masterVolume: parseFloat(e.target.value) })}
                  className="horror-slider w-full"
                />
              </div>

              <div
                onMouseEnter={() => onFocusIndex(1)}
                className={`p-2.5 rounded-sm border transition-colors space-y-1.5 ${
                  focusIndex === 1 ? 'bg-[#131922] border-white' : 'bg-[#090B0F] border-white/10'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-pixel text-sm text-white">
                    Громкость атмосферы {focusIndex === 1 ? '· ← / →' : ''}
                  </span>
                  <span className="font-mono text-white tabular-nums">
                    {Math.round(settings.ambienceVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.ambienceVolume}
                  onChange={(e) => onUpdateSettings({ ambienceVolume: parseFloat(e.target.value) })}
                  className="horror-slider w-full"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onMouseEnter={() => onFocusIndex(2)}
                  onClick={() => {
                    soundEngine.playUiMove();
                    onUpdateSettings({ scanlines: !settings.scanlines });
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-sm border font-pixel text-xs cursor-pointer ${
                    focusIndex === 2
                      ? 'bg-[#131922] border-white text-white'
                      : 'bg-[#090B0F] border-white/10 text-white/75'
                  }`}
                >
                  <span>Сканлайны</span>
                  <span className="font-mono">{settings.scanlines ? 'ВКЛ' : 'ВЫКЛ'}</span>
                </button>

                <button
                  type="button"
                  onMouseEnter={() => onFocusIndex(3)}
                  onClick={() => {
                    soundEngine.playUiMove();
                    onUpdateSettings({ filmGrain: !settings.filmGrain });
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-sm border font-pixel text-xs cursor-pointer ${
                    focusIndex === 3
                      ? 'bg-[#131922] border-white text-white'
                      : 'bg-[#090B0F] border-white/10 text-white/75'
                  }`}
                >
                  <span>Зернистость</span>
                  <span className="font-mono">{settings.filmGrain ? 'ВКЛ' : 'ВЫКЛ'}</span>
                </button>

                <button
                  type="button"
                  onMouseEnter={() => onFocusIndex(4)}
                  onClick={onTestSound}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm border font-pixel text-xs cursor-pointer ${
                    focusIndex === 4
                      ? 'bg-[#131922] border-white text-white'
                      : 'bg-[#090B0F] border-white/10 text-white/75'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Тест звука</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-4">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiBack();
                onStepChange(step - 1);
                onFocusIndex(0);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-sm border border-white/15 bg-[#090B0F] font-pixel text-xs text-white/80 hover:text-white hover:border-white/45 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <GamepadGlyph layout={settings.gamepadLayout} button="CANCEL" size="sm" />
              <span>Назад</span>
            </button>
          ) : (
            <span className="font-pixel text-xs text-white/55">
              ← / → изменение · ↓ / ↑ навигация
            </span>
          )}

          {(() => {
            const continueFocusIdx = step === 2 ? 5 : 1;
            const focused = focusIndex === continueFocusIdx;
            return (
              <button
                type="button"
                onMouseEnter={() => onFocusIndex(continueFocusIdx)}
                onClick={() => {
                  soundEngine.playUiConfirm();
                  if (step < 2) {
                    onStepChange(step + 1);
                    onFocusIndex(0);
                  } else {
                    onContinue();
                  }
                }}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-sm font-pixel text-sm font-semibold transition-colors cursor-pointer ${
                  focused
                    ? 'bg-white text-[#090B0E] ring-2 ring-white/50'
                    : 'bg-white/90 text-[#090B0E] hover:bg-white'
                }`}
              >
                <span>{step < 2 ? 'Далее' : 'Начать'}</span>
                <GamepadGlyph layout={settings.gamepadLayout} button="CONFIRM" size="sm" />
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
