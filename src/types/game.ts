export type GamepadLayout = 'playstation' | 'xbox' | 'nintendo';

export type ScreenMode =
  | 'CALIBRATION'
  | 'BOOT_SPLASH'
  | 'TITLE_MENU'
  | 'INTRO'
  | 'CHAPTER_1'
  | 'CHAPTER_2';

export type MenuModal = 'NONE' | 'GAMEPAD' | 'SETTINGS' | 'CHAPTERS' | 'PAUSE';

export interface GameSettings {
  gamepadLayout: GamepadLayout;
  brightness: number; // 0.6 to 1.4 (default 1.0)
  masterVolume: number; // 0 to 1
  ambienceVolume: number; // 0 to 1
  scanlines: boolean;
  filmGrain: boolean;
  flickerEffect: boolean;
  vibration: boolean;
  stickDeadzone: number; // 0.1 to 0.35
  keyboardAssist: boolean; // Allows keyboard fallback in browser when no gamepad is connected
}

export interface GamepadSnapshot {
  connected: boolean;
  id: string | null;
  index: number | null;
  axes: [number, number, number, number]; // LX, LY, RX, RY
  buttons: boolean[]; // Standard 17-button mapping
  lastInputSource: 'gamepad' | 'keyboard' | 'mouse';
}

export interface ChapterInfo {
  id: number;
  title: string;
  subtitle: string;
  location: string;
  status: 'AVAILABLE' | 'LOCKED';
  summary: string;
}

export const DEFAULT_SETTINGS: GameSettings = {
  gamepadLayout: 'playstation',
  brightness: 1.0,
  masterVolume: 0.9,
  ambienceVolume: 0.9,
  scanlines: true,
  filmGrain: true,
  flickerEffect: true,
  vibration: true,
  stickDeadzone: 0.18,
  keyboardAssist: true,
};

export const CHAPTERS: ChapterInfo[] = [
  {
    id: 1,
    title: 'Глава I · Ночной закуп',
    subtitle: 'До отключения света',
    location: 'Парковка · Вестибюль · Торговый зал',
    status: 'AVAILABLE',
    summary:
      '02:14 ночи. Вы заходите в круглосуточный гипермаркет за обычным списком продуктов, но среди редких ночных покупателей замечаете странные детали.',
  },
  {
    id: 2,
    title: 'Глава II · Обесточенный зал',
    subtitle: 'Доступно',
    location: 'Тёмный зал · Стеллажи · Подсобка',
    status: 'AVAILABLE',
    summary:
      'Свет погас, двери заблокированы, все покупатели исчезли. В полной темноте работает лишь вспышка телефона, а в глубине зала что-то просыпается.',
  },
  {
    id: 3,
    title: 'Глава III · Служебный коридор',
    subtitle: 'В разработке',
    location: 'Складские помещения · Вентиляция',
    status: 'LOCKED',
    summary:
      'Путь за дверью подсобного помещения ведёт глубже, туда, куда посетителям заходить запрещено.',
  },
  {
    id: 4,
    title: 'Глава IV · Последний чек',
    subtitle: 'В разработке',
    location: 'Служебный выход · Крыша',
    status: 'LOCKED',
    summary:
      'Рассвет наступит не для всех, кто остался в ночную смену.',
  },
];
