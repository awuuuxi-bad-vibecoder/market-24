import React from 'react';
import { GameSettings } from '../types/game';
import { EntityAiState } from '../game/chapter2Data';
import { GamepadGlyph } from './GamepadGlyph';

export type ChapterTwoPhase = 'ACTIVE' | 'CAUGHT' | 'ESCAPED';

interface ChapterTwoHudProps {
  settings: GameSettings;
  phase: ChapterTwoPhase;
  entityState: EntityAiState;
  chapterElapsed: number;
  screamerFlash: number;
  nearbyPrompt: string | null;
  activeDialogue: string | null;
  endingFocusIdx: number;
  onSelectEndingFocus: (idx: number) => void;
  onActivateEnding: (idx: number) => void;
  onDismissDialogue: () => void;
}

export const ChapterTwoHud: React.FC<ChapterTwoHudProps> = ({
  settings,
  phase,
  entityState,
  chapterElapsed,
  screamerFlash,
  nearbyPrompt,
  activeDialogue,
  endingFocusIdx,
  onSelectEndingFocus,
  onActivateEnding,
  onDismissDialogue,
}) => {
  if (phase === 'CAUGHT' || phase === 'ESCAPED') {
    const escaped = phase === 'ESCAPED';
    return (
      <div
        className={`relative z-30 flex flex-col items-center justify-center w-full h-full select-none animate-[fadeIn_600ms_ease-out] ${
          escaped ? 'bg-[#040608]/96' : 'bg-[#0A0304]/96'
        }`}
      >
        <div className="text-center space-y-3 mb-12 max-w-xl px-6">
          <p className="font-pixel text-sm tracking-[0.25em] text-white/60 uppercase">
            {escaped ? 'Глава II завершена' : 'Вы не успели спастись'}
          </p>
          <h2 className="font-pixel text-5xl font-bold tracking-wider text-white pixel-text-shadow">
            {escaped ? 'ДВЕРЬ ЗАХЛОПНУЛАСЬ' : 'ВАС НАСТИГЛИ'}
          </h2>
          <p className="font-pixel text-sm text-white/75 leading-relaxed pt-2">
            {escaped
              ? 'Вы проскочили в служебный коридор и задвинули засов перед самым лицом твари. Из темноты за стальной дверью доносится глухой удар.'
              : 'Тяжёлые шаги и хриплое дыхание оборвались прямо за вашей спиной. В темноте вспышка телефона гаснет.'}
          </p>
        </div>

        <div className="flex flex-col gap-2.5 w-[330px]">
          {['Начать главу II заново', 'В главное меню'].map((label, idx) => {
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
          })}
        </div>
      </div>
    );
  }

  // Smooth Chapter 2 dark opening title card (0..2.9s)
  const titleOverlayOpacity =
    chapterElapsed < 1.8
      ? 'opacity-100'
      : chapterElapsed < 2.9
      ? 'opacity-0 pointer-events-none'
      : 'opacity-0 pointer-events-none hidden';

  // Bottom-left controls guide visible for first 20 seconds, then fades out smoothly
  const guideVisible = chapterElapsed >= 2.2 && chapterElapsed < 20.0;

  return (
    <div className="relative z-20 flex flex-col justify-between w-full h-full p-7 pointer-events-none select-none">
      {/* Chapter 2 Opening Fade Card */}
      <div
        className={`absolute inset-0 z-40 flex items-center justify-center bg-[#030406] transition-opacity duration-1000 ${titleOverlayOpacity}`}
      >
        <div className="text-center space-y-2">
          <p className="font-pixel text-sm tracking-[0.28em] text-white/65 uppercase">
            Глава II
          </p>
          <h2 className="font-pixel text-6xl font-bold tracking-tight text-white pixel-text-shadow">
            Обесточенный зал
          </h2>
        </div>
      </div>

      {/* Abrupt, Erratic Screamer Glitch Face + "ОГЛЯНИСЬ" (Zero fade-in, zero fade-out) */}
      {screamerFlash > 0 && (() => {
        const tick = Math.floor(screamerFlash * 64);
        const h1 = Math.sin(tick * 12.9898) * 43758.5453;
        const r1 = h1 - Math.floor(h1);
        const h2 = Math.sin((tick + 7) * 78.233) * 19341.123;
        const r2 = h2 - Math.floor(h2);
        const h3 = Math.sin((tick + 19) * 39.425) * 61532.71;
        const r3 = h3 - Math.floor(h3);

        const strobeWhite = tick % 9 === 0;
        const strobeRed = tick % 4 === 1;
        const headX = Math.round((r1 - 0.5) * 95);
        const headY = Math.round((r2 - 0.5) * 65);
        const headRot = Math.round((r3 - 0.5) * 44);
        const headScale = 1.25 + r1 * 0.72;
        const jawDrop = 18 + Math.round(r2 * 18);
        const eyeJitterX = Math.round((r3 - 0.5) * 8);
        const eyeJitterY = Math.round((r1 - 0.5) * 6);
        const textX = Math.round((r2 - 0.5) * 34);
        const textY = Math.round((r3 - 0.5) * 18);

        return (
          <div
            className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none overflow-hidden"
            style={{
              backgroundColor: strobeWhite
                ? 'rgba(220, 215, 210, 0.85)'
                : strobeRed
                ? 'rgba(65, 4, 8, 0.96)'
                : 'rgba(3, 2, 4, 0.98)',
            }}
          >
            {/* Horizontal Tear Static Bands */}
            <div
              className="absolute inset-x-0 h-5 bg-white/25"
              style={{ top: `${Math.round(r1 * 88)}%` }}
            />
            <div
              className="absolute inset-x-0 h-3 bg-[#DC2626]/45"
              style={{ top: `${Math.round(r2 * 92)}%` }}
            />

            {/* Violently Jerking Mask & Crooked Neck/Shoulders */}
            <svg
              viewBox="0 0 140 150"
              className="w-[410px] h-[410px] drop-shadow-[0_0_32px_rgba(220,30,30,0.65)]"
              style={{
                transform: `translate(${headX}px, ${headY}px) rotate(${headRot}deg) scale(${headScale})`,
              }}
            >
              {/* Jagged dark hunched silhouette */}
              <polygon points="18,150 38,88 102,88 126,150" fill="#050507" />
              <rect x="52" y="76" width="36" height="24" fill="#09080B" />
              {/* Wild twitching black strands around mask */}
              <polygon points="36,24 22,52 38,56" fill="#09090D" />
              <polygon points="104,22 120,48 102,55" fill="#09090D" />
              {/* Cracked crooked pale mask */}
              <polygon
                points="36,20 70,12 104,22 108,82 88,108 52,108 32,80"
                fill={strobeWhite ? '#111014' : '#DED6C4'}
              />
              {/* Crack lines across forehead & cheek */}
              <polyline
                points="46,18 56,36 49,47"
                fill="none"
                stroke="#181214"
                strokeWidth="2.5"
              />
              <polyline
                points="94,25 84,42 96,58"
                fill="none"
                stroke="#181214"
                strokeWidth="2"
              />
              {/* Deep hollowed asymmetric eye sockets */}
              <rect x="42" y="38" width="21" height="22" fill="#040406" />
              <rect x="78" y="34" width="21" height="24" fill="#040406" />
              {/* Pinpoint manic dilated pupils */}
              <rect x={49 + eyeJitterX} y={46 + eyeJitterY} width="5" height="5" fill="#FF2E2E" />
              <rect x={85 - eyeJitterX} y={42 - eyeJitterY} width="5" height="5" fill="#FFFFFF" />
              {/* Unhinged stretched screaming mouth */}
              <rect x="47" y="68" width="46" height={jawDrop} fill="#040305" />
              {/* Uneven jagged teeth */}
              <rect x="50" y="68" width="5" height="7" fill="#D5CCB8" />
              <rect x="61" y="68" width="5" height="9" fill="#C9C0AD" />
              <rect x="73" y="68" width="5" height="8" fill="#D5CCB8" />
              <rect x="84" y="68" width="5" height="6" fill="#C9C0AD" />
              <rect x="54" y={68 + jawDrop - 7} width="5" height="7" fill="#B8AF9E" />
              <rect x="68" y={68 + jawDrop - 8} width="6" height="8" fill="#B8AF9E" />
              <rect x="80" y={68 + jawDrop - 6} width="5" height="6" fill="#B8AF9E" />
            </svg>

            {/* Jittering "ОГЛЯНИСЬ" warning text */}
            <div
              className="relative z-10 -mt-4 font-pixel text-7xl font-black tracking-[0.24em] uppercase"
              style={{
                transform: `translate(${textX}px, ${textY}px) scale(${1 + r3 * 0.14})`,
                color: strobeWhite ? '#9E0B0F' : tick % 2 === 0 ? '#FF2A2A' : '#FFFFFF',
                textShadow: '4px 0 0 #000000, -4px 0 0 #7A0000',
              }}
            >
              ОГЛЯНИСЬ
            </div>
          </div>
        );
      })()}

      {/* Dynamic Pulsing Red Vignette During Active Chase */}
      {entityState === 'chase' && (
        <div
          className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_42%,rgba(165,16,22,0.44)_100%)] animate-pulse"
          aria-hidden="true"
        />
      )}

      {/* Top-Right Minimal Objective */}
      <div className="flex items-start justify-end">
        <aside className="w-72 bg-[#090B0E]/82 border border-white/20 rounded-sm p-4">
          <div className="font-pixel text-sm text-white pixel-text-shadow mb-2">
            Задачи
          </div>
          <ul className="space-y-1.5 font-pixel text-sm">
            <li className="flex items-start gap-2 text-white pixel-text-shadow">
              <span className="font-mono text-xs mt-0.5">[ ]</span>
              <span>
                {entityState === 'dormant'
                  ? 'Найти способ выбраться'
                  : 'Спастись и найти выход'}
              </span>
            </li>
          </ul>
        </aside>
      </div>

      {/* Bottom Row: 20-second fading controls guide + Dialogue/Prompt */}
      <div className="relative flex flex-col items-center gap-3 mt-auto">
        {activeDialogue ? (
          <div
            onClick={onDismissDialogue}
            className="pointer-events-auto max-w-xl w-full bg-[#090B0E]/94 border border-white/40 rounded-sm px-5 py-4 shadow-2xl cursor-pointer mb-2"
          >
            <p className="font-pixel text-base text-white pixel-text-shadow leading-relaxed">
              {activeDialogue}
            </p>
            <div className="mt-3 flex items-center justify-end gap-2 font-pixel text-xs text-white/75">
              <GamepadGlyph layout={settings.gamepadLayout} button="CONFIRM" size="sm" />
              <span>Закрыть</span>
            </div>
          </div>
        ) : nearbyPrompt ? (
          <div className="flex items-center gap-2.5 bg-[#090B0E]/88 border border-white/25 rounded-sm px-4 py-2 font-pixel text-sm text-white pixel-text-shadow mb-2">
            <GamepadGlyph layout={settings.gamepadLayout} button="INTERACT" size="sm" />
            <span>{nearbyPrompt}</span>
          </div>
        ) : null}

        {/* Auto-fading 20-second Controls Guide in Bottom-Left */}
        <div
          className={`self-start flex flex-wrap items-center gap-4 bg-[#090B0E]/78 border border-white/15 rounded-sm px-3.5 py-2 font-pixel text-xs text-white/90 pixel-text-shadow transition-opacity duration-1000 ${
            guideVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <span>L / D-Pad · Ходьба</span>
          <span>R · Луч вспышки</span>
          <span className="flex items-center gap-1.5">
            <GamepadGlyph layout={settings.gamepadLayout} button="FLASHLIGHT" size="sm" />
            <span>Вспышка</span>
          </span>
          <span className="flex items-center gap-1.5">
            <GamepadGlyph layout={settings.gamepadLayout} button="SPRINT" size="sm" />
            <span>Бег</span>
          </span>
          <span className="flex items-center gap-1.5">
            <GamepadGlyph layout={settings.gamepadLayout} button="INTERACT" size="sm" />
            <span>Действие</span>
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
