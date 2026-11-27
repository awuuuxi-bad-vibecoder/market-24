import React from 'react';
import { Headphones } from 'lucide-react';
import { GameSettings } from '../types/game';
import { GamepadGlyph } from './GamepadGlyph';
import { soundEngine } from '../utils/audio';

interface BootSplashProps {
  settings: GameSettings;
  elapsed: number;
  onSkip: () => void;
}

export const BOOT_SPLASH_DURATION = 6.2;

export const BootSplash: React.FC<BootSplashProps> = ({
  settings,
  elapsed,
  onSkip,
}) => {
  const progress = Math.min(100, Math.round((elapsed / BOOT_SPLASH_DURATION) * 100));
  const showCredits = elapsed < 2.7;
  const showHeadphones = elapsed >= 2.7 && elapsed < 5.6;
  const fadeOut = elapsed >= 5.6;

  return (
    <div
      className={`relative z-20 flex flex-col justify-between w-full h-full bg-[#040507] px-14 py-12 select-none transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Top row: sparse build tag & skip */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs tracking-[0.22em] text-white/35 uppercase">
          M-24 // VER 0.2
        </span>
        {elapsed > 1.0 && (
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiConfirm();
              onSkip();
            }}
            className="flex items-center gap-2 font-pixel text-sm text-white/65 hover:text-white transition-colors cursor-pointer"
          >
            <GamepadGlyph layout={settings.gamepadLayout} button="CONFIRM" size="sm" />
            <span>Пропустить</span>
          </button>
        )}
      </div>

      {/* Center Stage: Credits -> Headphones Advisory */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {showCredits && (
          <div className="space-y-4 animate-[fadeIn_500ms_ease-out]">
            <p className="font-pixel text-xs tracking-[0.35em] text-white/50 uppercase">
              Психологический хоррор
            </p>
            <h2 className="font-pixel text-5xl font-bold tracking-wider text-white pixel-text-shadow">
              NIGHT SHIFT STUDIO
            </h2>
            <div className="flex flex-col gap-1 pt-2 font-pixel text-sm text-white/60">
              <span>Сценарий и постановка · Ночная смена</span>
              <span>Звук и визуал · Атмосферный процедурный движок</span>
            </div>
          </div>
        )}

        {showHeadphones && (
          <div className="max-w-lg space-y-5 animate-[fadeIn_450ms_ease-out]">
            <div className="mx-auto w-16 h-16 rounded-sm border border-white/25 bg-[#0B0E14] flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.08)]">
              <Headphones className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="font-pixel text-2xl font-semibold tracking-wide text-white pixel-text-shadow uppercase">
                Рекомендуется играть в наушниках
              </h2>
              <p className="font-pixel text-sm text-white/65 leading-relaxed">
                В темноте шаги, дыхание и шорохи между рядами слышны раньше, чем луч телефона выхватит силуэт.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom: Dark Night-Transit Loading Bar */}
      <div className="space-y-2.5 max-w-2xl w-full mx-auto">
        <div className="flex items-center justify-between font-pixel text-xs text-white/70 tracking-wider">
          <span>ЗАГРУЗКА МАРШРУТА · НОЧНОЙ ГИПЕРМАРКЕТ</span>
          <span className="font-mono tabular-nums">{progress}%</span>
        </div>
        <div className="relative h-2 bg-[#0D1117] border border-white/15 rounded-sm overflow-hidden">
          <div
            className="h-full bg-white/85 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between font-mono text-[10px] text-white/35">
          <span>ДЕПО</span>
          <span>КОНЕЧНАЯ · 02:09</span>
          <span>МАРКЕТ 24</span>
        </div>
      </div>
    </div>
  );
};
