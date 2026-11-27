export const WORLD_W = 1680;
export const WORLD_H = 1140;

export interface SolidRect {
  x: number;
  y: number;
  w: number;
  h: number;
  kind:
    | 'wall'
    | 'shelf_grocery'
    | 'shelf_drinks'
    | 'shelf_chem'
    | 'fridge'
    | 'freezer'
    | 'bakery'
    | 'produce'
    | 'checkout'
    | 'carts'
    | 'crate'
    | 'promo'
    | 'vending'
    | 'gate'
    | 'security_desk'
    | 'plant'
    | 'bench'
    | 'locker'
    | 'pallet'
    | 'baskets'
    | 'bin';
  label?: string;
}

export interface StoreItem {
  id: string;
  name: string;
  department: string;
  x: number;
  y: number;
  color: string;
  accent: string;
  collected: boolean;
}

export interface InspectableSpot {
  id: string;
  x: number;
  y: number;
  prompt: string;
  dialogue: string;
  radius?: number;
  sfx?: 'beep' | 'buzz';
}

export interface NpcWaypoint {
  x: number;
  y: number;
  face?: 'up' | 'down' | 'left' | 'right';
}

export interface NpcShopper {
  id: string;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  dir: 'up' | 'down' | 'left' | 'right';
  shirtColor: string;
  hairColor: string;
  walkFrame: number;
  role: 'cashier' | 'queue' | 'roam' | 'guardian';
  dialogue: string;
  patrolPoints?: NpcWaypoint[];
  patrolIdx?: number;
  pauseTimer?: number;
  hasBasket?: boolean;
  isStaff?: boolean;
  phoneGlow?: boolean;
  state?: 'idle' | 'charging' | 'returning';
}

export interface StoreLight {
  x: number;
  y: number;
  radius: number;
  color: string;
  bloomColor?: string;
  flickerSeed?: number;
}

export interface AisleSign {
  x: number;
  y: number;
  text: string;
  bg: string;
  fg: string;
}

export const INITIAL_ITEMS: StoreItem[] = [
  {
    id: 'bread',
    name: 'Свежий хлеб',
    department: 'Выпечка',
    x: 205,
    y: 615,
    color: '#D49A48',
    accent: '#8A5622',
    collected: false,
  },
  {
    id: 'apples',
    name: 'Яблоки',
    department: 'Овощи',
    x: 215,
    y: 255,
    color: '#C9483B',
    accent: '#598A48',
    collected: false,
  },
  {
    id: 'cheese',
    name: 'Сыр',
    department: 'Холодильники',
    x: 295,
    y: 112,
    color: '#E5BE4B',
    accent: '#B58424',
    collected: false,
  },
  {
    id: 'milk',
    name: 'Молоко',
    department: 'Молочный ряд',
    x: 690,
    y: 112,
    color: '#E6F0F5',
    accent: '#4F7FA8',
    collected: false,
  },
  {
    id: 'dumplings',
    name: 'Пельмени',
    department: 'Заморозка',
    x: 840,
    y: 455,
    color: '#8CBED6',
    accent: '#FFFFFF',
    collected: false,
  },
  {
    id: 'coffee',
    name: 'Банка кофе',
    department: 'Бакалея',
    x: 562,
    y: 355,
    color: '#6E4632',
    accent: '#E59A3C',
    collected: false,
  },
  {
    id: 'pasta',
    name: 'Пачка пасты',
    department: 'Ряд 5',
    x: 1112,
    y: 295,
    color: '#D9AE4E',
    accent: '#9E3838',
    collected: false,
  },
  {
    id: 'water',
    name: 'Вода 2 л',
    department: 'Напитки',
    x: 1288,
    y: 525,
    color: '#79B7C9',
    accent: '#D8EEF5',
    collected: false,
  },
];

export const MASK_POS = { x: 1455, y: 365 };
export const STAFF_DOOR_POS = { x: 1500, y: 342 };
export const CHECKOUT_POS = { x: 525, y: 865 };
export const EXIT_TRIGGER_RECT = { x: 760, y: 1068, w: 160, h: 52 };

export const INSPECTABLE_SPOTS: InspectableSpot[] = [
  {
    id: 'board',
    x: 58,
    y: 970,
    prompt: 'Прочитать объявление',
    dialogue:
      'Памятка у стены: «Ночным покупателям: вход в подсобные помещения строго запрещён. Персонал в ночную смену не носит маски».',
  },
  {
    id: 'carts',
    x: 205,
    y: 995,
    prompt: 'Осмотреть тележки',
    dialogue:
      'Металлические тележки сцеплены цепью. На одной из ручек намотан чей-то старый бумажный браслет.',
  },
  {
    id: 'security_desk',
    x: 1005,
    y: 970,
    prompt: 'Пост охраны',
    dialogue:
      'Пустой пост охраны. Три монитора чёрные, а на четвёртом виден тёмный коридор подсобки. Охранника нигде нет.',
  },
  {
    id: 'atm',
    x: 1320,
    y: 1052,
    prompt: 'Осмотреть терминал',
    dialogue:
      'Терминал тихо гудит. На зелёном экране мигает строка: «СВЯЗЬ С СЕРВЕРОМ ПОТЕРЯНА · ТОЛЬКО НАЛИЧНЫЕ».',
  },
  {
    id: 'coffee_machine',
    x: 1385,
    y: 1052,
    prompt: 'Кофе-автомат',
    dialogue:
      'На дисплее автомата мигает надпись «НЕТ СТАКАНОВ», но внутри всё ещё слышно, как капает горячая вода.',
  },
  {
    id: 'scales',
    x: 190,
    y: 345,
    prompt: 'Электронные весы',
    dialogue:
      'Весы показывают «0.00», но стоит поднести ладонь к платформе — цифры на секунду срываются на «68.40».',
  },
  {
    id: 'discount_rack',
    x: 925,
    y: 112,
    prompt: 'Полка уценки',
    dialogue:
      'Жёлтые наклейки «-50%» наклеены в три слоя. На нижней этикетке проступает дата: ноябрь прошлого года.',
  },
  {
    id: 'logbook',
    x: 1095,
    y: 810,
    prompt: 'Журнал на закрытой кассе',
    dialogue:
      'Тетрадь кассира. Последняя запись сделана в 01:40: «Лампа в четвёртом ряду опять мигает. Кто-то бродит за складом».',
  },
  {
    id: 'dropped_box',
    x: 1345,
    y: 235,
    prompt: 'Упавшая коробка',
    dialogue:
      'Вскрытый картонный ящик с консервами. Похоже, кто-то спешно бросил выкладку товара и ушёл.',
  },
  {
    id: 'staff_door',
    x: STAFF_DOOR_POS.x,
    y: STAFF_DOOR_POS.y,
    prompt: 'Дверь в подсобку',
    dialogue:
      'Тяжёлая дверь с табличкой «ТОЛЬКО ПЕРСОНАЛ». Магнитный замок заперт, горит красный индикатор.',
  },
  {
    id: 'breaker_box',
    x: 1495,
    y: 195,
    prompt: 'Осмотреть электрощит',
    dialogue:
      'Металлический щиток за стеклом заметно тёплый. Внутри потрескивают автоматы — словно нагрузка вот-вот выбьет весь зал.',
    sfx: 'buzz',
  },
  {
    id: 'price_checker',
    x: 537,
    y: 378,
    prompt: 'Прайс-чекер',
    dialogue:
      'Красный лазер сканера мигает без остановки. На тусклом экране застыла ошибка: «ТОВАР: ??? · 0000.00 ₽».',
    sfx: 'beep',
  },
  {
    id: 'mop_bucket',
    x: 912,
    y: 558,
    prompt: 'Осмотреть ведро уборщика',
    dialogue:
      'В синем ведре мутная вода с резким запахом хлорки. Швабру бросили прямо посреди ряда, но уборщика нигде не видно.',
  },
  {
    id: 'employee_board',
    x: 345,
    y: 1094,
    prompt: 'Доска «Сотрудник месяца»',
    dialogue:
      'Стенд под стеклом. Все три фотографии аккуратно вырезаны из рамок — остались только булавки и подписи без фамилий.',
  },
  {
    id: 'parcel_locker',
    x: 1585,
    y: 805,
    prompt: 'Осмотреть постамат',
    dialogue:
      'Ряд оранжевых ячеек тихо гудит. Одна дверца приоткрыта, внутри пусто — лишь сухой тёплый воздух от блока питания.',
  },
  {
    id: 'umbrella_stand',
    x: 752,
    y: 1068,
    prompt: 'Стойка для зонтов',
    dialogue:
      'Внутри торчит чужой мокрый зонт. Капли с него всё ещё стекают на плитку, хотя дождь загнал всех под крышу уже давно.',
    radius: 30,
  },
];

export const AISLE_SIGNS: AisleSign[] = [
  { x: 120, y: 138, text: 'ОВОЩИ', bg: '#274730', fg: '#E6F2E9' },
  { x: 118, y: 525, text: 'ВЫПЕЧКА', bg: '#5C3D24', fg: '#FFE9C7' },
  { x: 295, y: 52, text: 'СЫРЫ', bg: '#2B4A59', fg: '#E3F3FA' },
  { x: 630, y: 52, text: 'МОЛОКО', bg: '#2B4A59', fg: '#E3F3FA' },
  { x: 980, y: 52, text: 'МЯСО', bg: '#592B2B', fg: '#FAE3E3' },
  { x: 1295, y: 52, text: 'НАПИТКИ', bg: '#2A4259', fg: '#E3F0FA' },
  { x: 785, y: 368, text: 'ЗАМОРОЗКА', bg: '#264352', fg: '#DFF2FA' },
  { x: 1147, y: 454, text: 'ХОЗТОВАРЫ', bg: '#453854', fg: '#EDE3FA' },
  { x: 264, y: 782, text: 'КАССА 1', bg: '#4A2B2B', fg: '#F5D5D5' },
  { x: 529, y: 782, text: 'КАССА 2', bg: '#2B573C', fg: '#E6FFE9' },
  { x: 1003, y: 928, text: 'ОХРАНА', bg: '#2A3442', fg: '#D5E2F2' },
  { x: 1584, y: 730, text: 'ПОСТАМАТ', bg: '#6E4221', fg: '#FFE6C7' },
  { x: 840, y: 1085, text: 'ВЫХОД', bg: '#1F4D32', fg: '#B8FFCC' },
  { x: 1470, y: 295, text: 'ПОДСОБКА', bg: '#5C2222', fg: '#FFD6D6' },
];

export const STORE_SOLIDS: SolidRect[] = [
  // Outer perimeter walls
  { x: 0, y: 0, w: WORLD_W, h: 48, kind: 'wall' },
  { x: 0, y: 0, w: 40, h: WORLD_H, kind: 'wall' },
  { x: WORLD_W - 40, y: 0, w: 40, h: WORLD_H, kind: 'wall' },
  // Bottom walls flanking wide glass exit doors (gap 770..910)
  { x: 0, y: WORLD_H - 34, w: 770, h: 34, kind: 'wall' },
  { x: 910, y: WORLD_H - 34, w: WORLD_W - 910, h: 34, kind: 'wall' },

  // North wall Refrigerated Glass Cases
  { x: 150, y: 48, w: 290, h: 46, kind: 'fridge' },
  { x: 470, y: 48, w: 320, h: 46, kind: 'fridge' },
  { x: 820, y: 48, w: 320, h: 46, kind: 'fridge' },
  { x: 1170, y: 48, w: 250, h: 46, kind: 'fridge' },

  // West Produce Department (Fruits, Veg, Scales, Baskets)
  { x: 76, y: 165, w: 118, h: 52, kind: 'produce' },
  { x: 76, y: 245, w: 118, h: 52, kind: 'produce' },
  { x: 160, y: 325, w: 44, h: 34, kind: 'promo' }, // produce scales island
  { x: 42, y: 412, w: 24, h: 36, kind: 'baskets' },
  { x: 42, y: 865, w: 24, h: 36, kind: 'baskets' },

  // Southwest Bakery Department
  { x: 76, y: 540, w: 108, h: 150, kind: 'bakery' },
  { x: 215, y: 665, w: 68, h: 38, kind: 'promo' },

  // 6 Dense Parallel Hypermarket Aisles (with crisp cross-aisle central walkway)
  // Row 1 (Cereals & Flour)
  { x: 350, y: 175, w: 44, h: 195, kind: 'shelf_grocery' },
  { x: 350, y: 465, w: 44, h: 205, kind: 'shelf_grocery' },

  // Row 2 (Coffee, Tea, Spices)
  { x: 515, y: 175, w: 44, h: 195, kind: 'shelf_grocery' },
  { x: 515, y: 465, w: 44, h: 205, kind: 'shelf_grocery' },

  // Center Freezer Islands (between Row 2 & Row 4!)
  { x: 675, y: 185, w: 56, h: 145, kind: 'freezer' },
  { x: 795, y: 420, w: 110, h: 46, kind: 'freezer' },
  { x: 675, y: 515, w: 56, h: 145, kind: 'freezer' },

  // Row 4 (Snacks, Sauces, Canned Goods)
  { x: 950, y: 175, w: 44, h: 195, kind: 'shelf_drinks' },
  { x: 950, y: 465, w: 44, h: 205, kind: 'shelf_drinks' },

  // Row 5 (Pasta, Rice, Oils)
  { x: 1125, y: 175, w: 44, h: 195, kind: 'shelf_grocery' },
  { x: 1125, y: 465, w: 44, h: 205, kind: 'shelf_chem' },

  // Row 6 (Water, Sodas, Household Chemistry)
  { x: 1300, y: 265, w: 44, h: 120, kind: 'shelf_chem' },
  { x: 1300, y: 465, w: 44, h: 205, kind: 'shelf_drinks' },

  // Central Promotional Islands along the wide cross-aisle (y = 390..445)
  { x: 418, y: 396, w: 72, h: 36, kind: 'promo' },
  { x: 1020, y: 396, w: 74, h: 36, kind: 'promo' },

  // East Backroom / Staff-Only Partition Wall (locked door at y = 310..375)
  { x: 1505, y: 48, w: 135, h: 262, kind: 'wall' },
  { x: 1505, y: 376, w: 135, h: 310, kind: 'wall' },
  { x: 1500, y: 310, w: 12, h: 66, kind: 'wall' },

  // Crates & shipping pallets near East Staff Area
  { x: 1390, y: 155, w: 54, h: 36, kind: 'pallet' },
  { x: 1460, y: 265, w: 36, h: 30, kind: 'crate' },
  { x: 1460, y: 400, w: 36, h: 30, kind: 'crate' },
  { x: 1395, y: 585, w: 48, h: 34, kind: 'crate' },

  // Checkout Line (4 Registers across y = 805..852)
  { x: 200, y: 805, w: 128, h: 46, kind: 'checkout' },
  { x: 465, y: 805, w: 128, h: 46, kind: 'checkout' }, // Register #2 (OPEN)
  { x: 760, y: 805, w: 128, h: 46, kind: 'checkout' },
  { x: 1045, y: 805, w: 128, h: 46, kind: 'checkout' },

  // Vestibule Props: Carts, Security Desk, Gates, Plants, ATM, Coffee, Benches, Locker & Bins
  { x: 125, y: 985, w: 110, h: 36, kind: 'carts' },
  { x: 965, y: 945, w: 76, h: 38, kind: 'security_desk' },
  { x: 735, y: 945, w: 10, h: 34, kind: 'gate' },
  { x: 835, y: 945, w: 10, h: 34, kind: 'gate' },
  { x: 935, y: 945, w: 10, h: 34, kind: 'gate' },
  { x: 410, y: 1072, w: 96, h: 28, kind: 'bench' },
  { x: 645, y: 1074, w: 26, h: 26, kind: 'bin' },
  { x: 730, y: 1072, w: 22, h: 22, kind: 'plant' },
  { x: 928, y: 1072, w: 22, h: 22, kind: 'plant' },
  { x: 1300, y: 1068, w: 44, h: 32, kind: 'vending' },
  { x: 1364, y: 1068, w: 44, h: 32, kind: 'vending' },
  { x: 1455, y: 880, w: 92, h: 28, kind: 'bench' },
  { x: 1600, y: 745, w: 40, h: 120, kind: 'locker' },
  { x: 1604, y: 890, w: 36, h: 48, kind: 'bin' },
];

export const STORE_LIGHTS: StoreLight[] = [
  // Vestibule & Exit
  {
    x: 840,
    y: 1015,
    radius: 220,
    color: 'rgba(215, 240, 230, 0.85)',
    bloomColor: 'rgba(130, 225, 175, 0.16)',
    flickerSeed: 2.5,
  },
  { x: 260, y: 1010, radius: 190, color: 'rgba(205, 232, 224, 0.72)' },
  {
    x: 1350,
    y: 1020,
    radius: 185,
    color: 'rgba(235, 180, 110, 0.65)',
    bloomColor: 'rgba(229, 154, 60, 0.16)',
  },

  // Checkout Line
  { x: 265, y: 825, radius: 175, color: 'rgba(195, 225, 218, 0.65)' },
  {
    x: 530,
    y: 825,
    radius: 210,
    color: 'rgba(230, 248, 238, 0.9)',
    bloomColor: 'rgba(155, 235, 195, 0.16)',
  },
  { x: 825, y: 825, radius: 175, color: 'rgba(195, 225, 218, 0.65)' },
  { x: 1110, y: 825, radius: 175, color: 'rgba(195, 225, 218, 0.65)' },

  // Produce & Bakery (West)
  { x: 175, y: 245, radius: 195, color: 'rgba(218, 242, 224, 0.78)' },
  {
    x: 175,
    y: 605,
    radius: 205,
    color: 'rgba(255, 204, 136, 0.85)',
    bloomColor: 'rgba(229, 154, 60, 0.18)',
  },

  // North Refrigerators (icy cyan-white)
  {
    x: 295,
    y: 105,
    radius: 185,
    color: 'rgba(175, 226, 245, 0.82)',
    bloomColor: 'rgba(140, 215, 245, 0.14)',
  },
  {
    x: 630,
    y: 105,
    radius: 195,
    color: 'rgba(175, 226, 245, 0.85)',
    bloomColor: 'rgba(140, 215, 245, 0.14)',
  },
  {
    x: 980,
    y: 105,
    radius: 185,
    color: 'rgba(175, 226, 245, 0.82)',
    bloomColor: 'rgba(140, 215, 245, 0.14)',
  },
  {
    x: 1295,
    y: 105,
    radius: 175,
    color: 'rgba(175, 226, 245, 0.78)',
    bloomColor: 'rgba(140, 215, 245, 0.13)',
  },

  // Central Freezer & Aisles
  { x: 445, y: 280, radius: 185, color: 'rgba(215, 240, 230, 0.76)' },
  { x: 445, y: 550, radius: 185, color: 'rgba(215, 240, 230, 0.76)' },
  {
    x: 785,
    y: 410,
    radius: 215,
    color: 'rgba(185, 232, 248, 0.84)',
    bloomColor: 'rgba(145, 215, 245, 0.14)',
  },
  { x: 1045, y: 280, radius: 185, color: 'rgba(215, 240, 230, 0.76)' },
  { x: 1045, y: 550, radius: 185, color: 'rgba(215, 240, 230, 0.76)' },
  { x: 1245, y: 280, radius: 180, color: 'rgba(205, 230, 224, 0.68)', flickerSeed: 6.1 },
  { x: 1245, y: 550, radius: 180, color: 'rgba(210, 236, 228, 0.72)' },

  // East Vestibule Parcel Locker Glow & Staff Corridor
  {
    x: 1565,
    y: 820,
    radius: 175,
    color: 'rgba(240, 185, 115, 0.66)',
    bloomColor: 'rgba(229, 154, 60, 0.15)',
  },
  {
    x: 1455,
    y: 342,
    radius: 125,
    color: 'rgba(195, 198, 192, 0.48)',
    bloomColor: 'rgba(201, 59, 59, 0.14)',
    flickerSeed: 1.7,
  },
];

export const INITIAL_NPCS: NpcShopper[] = [
  {
    id: 'cashier',
    x: 528,
    y: 792,
    homeX: 528,
    homeY: 792,
    dir: 'down',
    shirtColor: '#8B3838',
    hairColor: '#3A2820',
    walkFrame: 0,
    role: 'cashier',
    isStaff: true,
    dialogue: 'Кассир смотрит в монитор: «Берите всё по списку и подходите сюда, на вторую кассу».',
  },
  {
    id: 'queue_buyer',
    x: 505,
    y: 874,
    homeX: 505,
    homeY: 874,
    dir: 'up',
    shirtColor: '#485A6E',
    hairColor: '#252120',
    walkFrame: 0,
    role: 'queue',
    hasBasket: true,
    phoneGlow: true,
    dialogue: 'Покупатель в очереди не отрывается от телефона: «В два ночи тут спокойно. Только музыка по кругу надоедает».',
  },
  {
    id: 'roam_produce',
    x: 245,
    y: 205,
    homeX: 245,
    homeY: 205,
    dir: 'left',
    shirtColor: '#4F6652',
    hairColor: '#4A3628',
    walkFrame: 0,
    role: 'roam',
    hasBasket: true,
    patrolIdx: 0,
    pauseTimer: 2.2,
    patrolPoints: [
      { x: 245, y: 200, face: 'left' },
      { x: 245, y: 285, face: 'left' },
      { x: 285, y: 125, face: 'up' },
    ],
    dialogue: 'Покупатель крутит в руках яблоко: «Странно, машина с поставкой сегодня не приезжала, а ящики полные».',
  },
  {
    id: 'roam_aisle',
    x: 610,
    y: 235,
    homeX: 610,
    homeY: 235,
    dir: 'left',
    shirtColor: '#665C4A',
    hairColor: '#1E1D22',
    walkFrame: 0,
    role: 'roam',
    hasBasket: true,
    patrolIdx: 0,
    pauseTimer: 1.4,
    patrolPoints: [
      { x: 610, y: 235, face: 'left' },
      { x: 610, y: 415, face: 'down' },
      { x: 610, y: 585, face: 'right' },
    ],
    dialogue: 'Мужчина в серой куртке: «Не замечали? В дальнем углу зала будто пахнет сырым подвалом».',
  },
  {
    id: 'roam_bakery',
    x: 225,
    y: 575,
    homeX: 225,
    homeY: 575,
    dir: 'left',
    shirtColor: '#5B4A62',
    hairColor: '#2B201B',
    walkFrame: 0,
    role: 'roam',
    patrolIdx: 0,
    pauseTimer: 2.8,
    patrolPoints: [
      { x: 220, y: 575, face: 'left' },
      { x: 220, y: 635, face: 'left' },
      { x: 300, y: 590, face: 'right' },
    ],
    dialogue: 'Женщина у витрины: «Хлеб ещё тёплый, хотя пекаря я тут ни разу не видела».',
  },
  {
    id: 'roam_freezer',
    x: 765,
    y: 265,
    homeX: 765,
    homeY: 265,
    dir: 'left',
    shirtColor: '#3E5566',
    hairColor: '#362A22',
    walkFrame: 0,
    role: 'roam',
    hasBasket: true,
    patrolIdx: 0,
    pauseTimer: 1.8,
    patrolPoints: [
      { x: 765, y: 260, face: 'left' },
      { x: 765, y: 385, face: 'down' },
      { x: 850, y: 385, face: 'down' },
      { x: 765, y: 385, face: 'down' },
      { x: 765, y: 560, face: 'left' },
      { x: 850, y: 500, face: 'up' },
      { x: 765, y: 560, face: 'left' },
    ],
    dialogue: 'Парень у морозилок ёжится от холода: «Здесь как-то особенно тянет сквозняком...»',
  },
  {
    id: 'roam_clerk',
    x: 1235,
    y: 225,
    homeX: 1235,
    homeY: 225,
    dir: 'left',
    shirtColor: '#2E5442',
    hairColor: '#1B1D22',
    walkFrame: 0,
    role: 'roam',
    isStaff: true,
    patrolIdx: 0,
    pauseTimer: 3.1,
    patrolPoints: [
      { x: 1235, y: 210, face: 'left' },
      { x: 1235, y: 580, face: 'right' },
      { x: 1235, y: 710, face: 'down' },
      { x: 1065, y: 710, face: 'left' },
      { x: 1065, y: 550, face: 'left' },
      { x: 1065, y: 710, face: 'down' },
      { x: 1235, y: 710, face: 'right' },
    ],
    dialogue: 'Сотрудник зала пересчитывает банки на полке: «Извините, смена тяжёлая. Касса только вторая работает».',
  },
  {
    id: 'guardian_shopper',
    x: 1385,
    y: 225,
    homeX: 1385,
    homeY: 225,
    dir: 'right',
    shirtColor: '#424652',
    hairColor: '#18181C',
    walkFrame: 0,
    role: 'guardian',
    state: 'idle',
    dialogue: 'Покупатель стоит неподвижно и смотрит в пустую полку. На голос он не реагирует.',
  },
];
