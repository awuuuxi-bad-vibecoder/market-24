import React, { useEffect, useState } from 'react';
import { GameSettings } from '../types/game';
import { GamepadGlyph } from './GamepadGlyph';
import { soundEngine } from '../utils/audio';

interface IntroSequenceProps {
  settings: GameSettings;
  elapsed: number;
  onSkip: () => void;
}

export const IntroSequence: React.FC<IntroSequenceProps> = ({
  settings,
  elapsed,
  onSkip,
}) => {
  const [doorSoundPlayed, setDoorSoundPlayed] = useState(false);

  useEffect(() => {
    if (elapsed >= 23.0 && !doorSoundPlayed) {
      setDoorSoundPlayed(true);
      soundEngine.playDoorHiss();
    }
  }, [elapsed, doorSoundPlayed]);

  let caption = '';
  if (elapsed < 4.8) {
    caption =
      '02:09 ночи. Последний автобус ушёл полчаса назад, а смена в мастерской вымотала до предела.';
  } else if (elapsed < 9.6) {
    caption =
      'В холодильнике дома — пусто. Придётся идти пешком через мокрый квартал до круглосуточного на окраине.';
  } else if (elapsed < 14.5) {
    caption =
      'Говорят, прошлый ночной охранник уволился без объяснений. Просто оставил ключи на кассе и ушёл под дождь.';
  } else if (elapsed < 19.4) {
    caption =
      'На парковке стоит всего одна машина с включённой аварийкой. Внутри никого, но капот ещё тёплый.';
  } else if (elapsed < 23.8) {
    caption =
      'Сквозь запотевшие стёкла ровно гудит белый свет. На секунду кажется, что между рядами кто-то замер и смотрит на вход.';
  } else if (elapsed < 27.2) {
    caption =
      'Автоматические двери с шипением расходятся навстречу теплу и приглушённой музыке.';
  }

  const fadeToMenu = elapsed >= 27.2;

  return (
    <div
      className={`relative z-20 flex flex-col justify-between w-full h-full pointer-events-auto select-none transition-opacity duration-700 ${
        fadeToMenu ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Top Letterbox */}
      <div className="w-full h-14 bg-[#050608] border-b border-white/8 flex items-center justify-end px-8">
        <button
          type="button"
          onClick={() => {
            soundEngine.playUiConfirm();
            onSkip();
          }}
          className="flex items-center gap-2 font-pixel text-sm text-white/75 hover:text-white transition-colors cursor-pointer"
        >
          <GamepadGlyph layout={settings.gamepadLayout} button="CONFIRM" size="sm" />
          <span>Пропустить</span>
        </button>
      </div>

      <div className="flex-1" />

      {/* Bottom Letterbox + Pure White Pixel Lore Subtitles */}
      <div className="w-full min-h-[96px] bg-[#050608] border-t border-white/8 flex items-center justify-center px-10 py-4">
        {caption && (
          <p className="max-w-3xl text-center font-pixel text-lg text-white pixel-text-shadow leading-relaxed">
            {caption}
          </p>
        )}
      </div>
    </div>
  );
};
