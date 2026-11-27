import {
  InspectableSpot,
  SolidRect,
  STAFF_DOOR_POS,
  STORE_SOLIDS,
} from './chapter1Data';

export interface Chapter2Solid extends SolidRect {
  id: number;
  breakable: boolean;
  broken: boolean;
}

export interface DebrisPiece {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

export type EntityAiState = 'dormant' | 'wander' | 'chase';

export interface Chapter2Entity {
  state: EntityAiState;
  x: number;
  y: number;
  dir: 'up' | 'down' | 'left' | 'right';
  walkFrame: number;
  roamTargetIdx: number;
  pauseTimer: number;
  breathTimer: number;
  stepTimer: number;
  smashCooldown: number;
  roarWindup: number;
  lostSightTimer: number;
  lastKnownX: number;
  lastKnownY: number;
}

export const CH2_WALK_TRIGGER_SECONDS = 150; // 2 minutes 30 seconds of active walking

export function isSolidBreakable(kind: SolidRect['kind']): boolean {
  return (
    kind === 'shelf_grocery' ||
    kind === 'shelf_drinks' ||
    kind === 'shelf_chem' ||
    kind === 'promo' ||
    kind === 'crate' ||
    kind === 'pallet' ||
    kind === 'carts' ||
    kind === 'baskets' ||
    kind === 'bench' ||
    kind === 'bin' ||
    kind === 'plant' ||
    kind === 'gate' ||
    kind === 'freezer' ||
    kind === 'produce' ||
    kind === 'checkout'
  );
}

export function createInitialChapter2Solids(): Chapter2Solid[] {
  return STORE_SOLIDS.map((s, id) => ({
    ...s,
    id,
    breakable: isSolidBreakable(s.kind),
    broken: false,
  }));
}

export const CH2_ROAM_NODES: Array<{ x: number; y: number }> = [
  { x: 245, y: 215 },
  { x: 245, y: 600 },
  { x: 445, y: 415 },
  { x: 610, y: 235 },
  { x: 610, y: 585 },
  { x: 765, y: 385 },
  { x: 1065, y: 235 },
  { x: 1065, y: 695 },
  { x: 1235, y: 415 },
  { x: 1235, y: 215 },
  { x: 525, y: 720 },
  { x: 840, y: 900 },
];

export function computeFarthestEntitySpawn(px: number, py: number): { x: number; y: number } {
  const candidates = [
    { x: 245, y: 140 },
    { x: 1365, y: 140 },
    { x: 245, y: 930 },
    { x: 1365, y: 930 },
  ];
  let best = candidates[0];
  let maxDist = -1;
  for (const c of candidates) {
    const d = Math.hypot(c.x - px, c.y - py);
    if (d > maxDist) {
      maxDist = d;
      best = c;
    }
  }
  return best;
}

export const CH2_INSPECTABLE_SPOTS: InspectableSpot[] = [
  {
    id: 'security_desk',
    x: 1005,
    y: 970,
    prompt: 'Пост охраны',
    // The 1 subtle clue hinting that the backroom magnetic lock dropped during blackout
    dialogue:
      'Резервный монитор охраны еле светится: «АВАРИЙНЫЙ РЕЖИМ: при отключении питания магнитный замок подсобки разблокирован».',
  },
  {
    id: 'staff_door',
    x: STAFF_DOOR_POS.x,
    y: STAFF_DOOR_POS.y,
    prompt: 'Дверь в подсобку',
    dialogue: '',
    radius: 40,
  },
  {
    id: 'exit_doors',
    x: 840,
    y: 1086,
    prompt: 'Осмотреть двери выхода',
    dialogue:
      'Раздвижные двери намертво заблокированы. За чёрным стеклом не видно ни фонарей, ни дождя.',
    radius: 44,
  },
  {
    id: 'checkout_2',
    x: 525,
    y: 865,
    prompt: 'Осмотреть кассу №2',
    dialogue:
      'Касса мертва. Лента застыла, кассира нет, а ваш длинный чек всё ещё торчит из принтера.',
    radius: 42,
  },
  {
    id: 'mask_spot',
    x: 1455,
    y: 365,
    prompt: 'Осмотреть пол у двери',
    dialogue:
      'На бетоне пусто. Той белой маски здесь больше нет — кто-то забрал её сразу после того, как погас свет.',
    radius: 34,
  },
  {
    id: 'breaker_box',
    x: 1495,
    y: 195,
    prompt: 'Осмотреть электрощит',
    dialogue:
      'Дверца щитка сорвана. Главный рубильник вырван с корнем — свет сам уже не включится.',
    sfx: 'buzz',
  },
  {
    id: 'atm',
    x: 1320,
    y: 1052,
    prompt: 'Осмотреть терминал',
    dialogue:
      'Экран абсолютно чёрный. Когда наводишь на него луч телефона, в отражении кажется, будто позади кто-то стоит.',
  },
  {
    id: 'employee_board',
    x: 345,
    y: 1094,
    prompt: 'Доска «Сотрудник месяца»',
    dialogue:
      'Стекло треснуло, а по деревянной раме тянутся глубокие неровные борозды, будто от ногтей.',
  },
  {
    id: 'mop_bucket',
    x: 912,
    y: 558,
    prompt: 'Осмотреть ведро уборщика',
    dialogue:
      'Вода в ведре стала тёмной и густой. Поверхность дрожит мелкой рябью, хотя в зале полный штиль.',
  },
  {
    id: 'dropped_box',
    x: 1345,
    y: 235,
    prompt: 'Упавшая коробка',
    dialogue:
      'Жестяные банки раздавлены и разбросаны дальше по ряду — как будто кто-то тяжёлый прошёл прямо по ним.',
  },
];
