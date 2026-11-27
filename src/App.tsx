import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import {
  CHAPTERS,
  DEFAULT_SETTINGS,
  GamepadLayout,
  GameSettings,
  MenuModal,
  ScreenMode,
} from './types/game';
import { PIXEL_H, PIXEL_W, PixelWorldRenderer } from './canvas/pixelRenderer';
import { HypermarketRenderer } from './canvas/hypermarketRenderer';
import {
  CHECKOUT_POS,
  EXIT_TRIGGER_RECT,
  INITIAL_ITEMS,
  INITIAL_NPCS,
  INSPECTABLE_SPOTS,
  InspectableSpot,
  MASK_POS,
  NpcShopper,
  SolidRect,
  STORE_SOLIDS,
  StoreItem,
  WORLD_H,
  WORLD_W,
} from './game/chapter1Data';
import {
  CH2_INSPECTABLE_SPOTS,
  CH2_ROAM_NODES,
  CH2_WALK_TRIGGER_SECONDS,
  Chapter2Entity,
  Chapter2Solid,
  computeFarthestEntitySpawn,
  createInitialChapter2Solids,
  DebrisPiece,
  EntityAiState,
} from './game/chapter2Data';
import { NavAction, useGamepad } from './hooks/useGamepad';
import { soundEngine } from './utils/audio';
import { ScaledViewport } from './components/ScaledViewport';
import { TitleMenu } from './components/TitleMenu';
import { GamepadSetupModal } from './components/GamepadSetupModal';
import { SettingsModal } from './components/SettingsModal';
import { ChaptersModal } from './components/ChaptersModal';
import { CalibrationStep } from './components/CalibrationStep';
import { BOOT_SPLASH_DURATION, BootSplash } from './components/BootSplash';
import { IntroSequence } from './components/IntroSequence';
import { ChapterOneHud, ChapterPhase } from './components/ChapterOneHud';
import { ChapterTwoHud, ChapterTwoPhase } from './components/ChapterTwoHud';
import { PauseModal } from './components/PauseModal';

const STORAGE_KEY = 'market24_settings_v1';
const LAYOUT_ORDER: GamepadLayout[] = ['playstation', 'xbox', 'nintendo'];

function loadSavedSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function findBlockingSolid<T extends SolidRect & { broken?: boolean }>(
  px: number,
  py: number,
  radius: number,
  solids: T[]
): T | null {
  const left = px - radius;
  const right = px + radius;
  const top = py - radius + 2;
  const bottom = py + radius;

  for (const s of solids) {
    if (s.broken) continue;
    if (right > s.x && left < s.x + s.w && bottom > s.y && top < s.y + s.h) {
      return s;
    }
  }
  return null;
}

function collidesWithSolids(
  px: number,
  py: number,
  radius = 7,
  solids: Array<SolidRect & { broken?: boolean }> = STORE_SOLIDS
): boolean {
  return findBlockingSolid(px, py, radius, solids) !== null;
}

function hasLineOfSight(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  solids: Array<SolidRect & { broken?: boolean }>
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.floor(dist / 14));
  for (let i = 1; i < steps; i++) {
    const sx = x1 + (dx * i) / steps;
    const sy = y1 + (dy * i) / steps;
    if (findBlockingSolid(sx, sy, 2, solids)) {
      return false;
    }
  }
  return true;
}

function spawnBreakDebris(solid: SolidRect): DebrisPiece[] {
  const palette =
    solid.kind === 'freezer'
      ? ['#9CD6ED', '#CFEAF5', '#3B4A59', '#6B8CA0']
      : solid.kind === 'plant'
      ? ['#3A6B42', '#528A5B', '#4D3828', '#2A1E15']
      : ['#5E4630', '#8A6746', '#B5483E', '#D1A04B', '#404A57'];
  const pieces: DebrisPiece[] = [];
  for (let i = 0; i < 14; i++) {
    pieces.push({
      x: Math.round(solid.x + 2 + Math.random() * Math.max(4, solid.w - 8)),
      y: Math.round(solid.y + 2 + Math.random() * Math.max(4, solid.h - 8)),
      w: 3 + Math.floor(Math.random() * 4),
      h: 2 + Math.floor(Math.random() * 4),
      color: palette[i % palette.length],
    });
  }
  return pieces;
}

interface PlayerEntity {
  x: number;
  y: number;
  dir: 'up' | 'down' | 'left' | 'right';
  walkFrame: number;
  stepTimer: number;
  knockVx: number;
  knockVy: number;
  shakeTimer: number;
}

type NearbyTarget =
  | { kind: 'item'; item: StoreItem }
  | { kind: 'mask' }
  | { kind: 'checkout' }
  | { kind: 'spot'; spot: InspectableSpot }
  | { kind: 'npc'; npc: NpcShopper };

export default function App() {
  const [settings, setSettings] = useState<GameSettings>(loadSavedSettings);
  const [screenMode, setScreenMode] = useState<ScreenMode>('CALIBRATION');
  const [activeModal, setActiveModal] = useState<MenuModal>('NONE');
  const [returnToPause, setReturnToPause] = useState<boolean>(false);

  // Focus states for 100% mouse-free gamepad navigation
  const [selectedMenuIdx, setSelectedMenuIdx] = useState<number>(0);
  const [calibrationStep, setCalibrationStep] = useState<number>(0);
  const [calibrationFocusIdx, setCalibrationFocusIdx] = useState<number>(0);
  const [gamepadFocusIdx, setGamepadFocusIdx] = useState<number>(0);
  const [settingsFocusIdx, setSettingsFocusIdx] = useState<number>(0);
  const [chaptersFocusIdx, setChaptersFocusIdx] = useState<number>(0);
  const [pauseFocusIdx, setPauseFocusIdx] = useState<number>(0);
  const [endingFocusIdx, setEndingFocusIdx] = useState<number>(0);

  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fullscreenNote, setFullscreenNote] = useState<string | null>(null);

  // Boot splash, Intro & Chapter 1 states
  const [bootElapsed, setBootElapsed] = useState<number>(0);
  const [introElapsed, setIntroElapsed] = useState<number>(0);
  const [chapterElapsed, setChapterElapsed] = useState<number>(0);
  const [chapterPhase, setChapterPhase] = useState<ChapterPhase>('SHOPPING');
  const [items, setItems] = useState<StoreItem[]>(() =>
    INITIAL_ITEMS.map((i) => ({ ...i }))
  );
  const [nearbyPrompt, setNearbyPrompt] = useState<string | null>(null);
  const [activeDialogue, setActiveDialogue] = useState<string | null>(null);

  // Chapter 2 states
  const [ch2Phase, setCh2Phase] = useState<ChapterTwoPhase>('ACTIVE');
  const [ch2EntityState, setCh2EntityState] = useState<EntityAiState>('dormant');
  const [screamerFlash, setScreamerFlash] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<PixelWorldRenderer | null>(null);
  const marketRendererRef = useRef<HypermarketRenderer | null>(null);
  const bootStartRef = useRef<number>(0);
  const introStartRef = useRef<number>(0);
  const introStepRef = useRef<number>(0);
  const chapterTimerRef = useRef<number>(0);
  const chapterElapsedSyncedRef = useRef<number>(0);

  // Chapter 2 simulation refs
  const ch2PhaseRef = useRef<ChapterTwoPhase>('ACTIVE');
  ch2PhaseRef.current = ch2Phase;
  const ch2SolidsRef = useRef<Chapter2Solid[]>(createInitialChapter2Solids());
  const ch2DebrisRef = useRef<DebrisPiece[]>([]);
  const ch2WalkTimeRef = useRef<number>(0);
  const ch2PhoneFlashOnRef = useRef<boolean>(true);
  const ch2FlashAngleRef = useRef<number>(-Math.PI / 2);
  const ch2LastAimTimeRef = useRef<number>(-10);
  const ch2ScreamerTimerRef = useRef<number>(0);
  const ch2CreepyCueStepRef = useRef<number>(0);
  const entityRef = useRef<Chapter2Entity>({
    state: 'dormant',
    x: 245,
    y: 140,
    dir: 'down',
    walkFrame: 0,
    roamTargetIdx: 0,
    pauseTimer: 0,
    breathTimer: 0,
    stepTimer: 0,
    smashCooldown: 0,
    roarWindup: 0,
    lostSightTimer: 0,
    lastKnownX: 245,
    lastKnownY: 140,
  });

  // Mutable simulation refs for smooth 60fps loop
  const playerRef = useRef<PlayerEntity>({
    x: 840,
    y: 1030,
    dir: 'up',
    walkFrame: 0,
    stepTimer: 0,
    knockVx: 0,
    knockVy: 0,
    shakeTimer: 0,
  });
  const itemsRef = useRef<StoreItem[]>(INITIAL_ITEMS.map((i) => ({ ...i })));
  const npcsRef = useRef<NpcShopper[]>(INITIAL_NPCS.map((n) => ({ ...n })));
  const cameraRef = useRef<{ x: number; y: number }>({
    x: clamp(840 - PIXEL_W / 2, 0, WORLD_W - PIXEL_W),
    y: clamp(1030 - PIXEL_H / 2, 0, WORLD_H - PIXEL_H),
  });
  const nearbyTargetRef = useRef<NearbyTarget | null>(null);
  const maskTriggeredCountRef = useRef<number>(0);
  const blackoutTimerRef = useRef<number>(0);
  const chapterPhaseRef = useRef<ChapterPhase>('SHOPPING');
  chapterPhaseRef.current = chapterPhase;

  const updateSettings = useCallback((patch: Partial<GameSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      soundEngine.setVolumes(next.masterVolume, next.ambienceVolume);
      return next;
    });
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
      setFullscreenNote(null);
    } catch {
      setFullscreenNote('Браузер требует нажатие мышью или клавиши F11 для полного экрана');
      window.setTimeout(() => setFullscreenNote(null), 3200);
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    const onKeyF11 = (e: KeyboardEvent) => {
      if (e.code === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('keydown', onKeyF11);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('keydown', onKeyF11);
    };
  }, [toggleFullscreen]);

  const unlockAudio = useCallback(
    (mode: 'off' | 'outside' | 'inside' | 'blackout' | 'chapter2' | 'chase' = 'outside') => {
      soundEngine.init();
      soundEngine.setVolumes(settings.masterVolume, settings.ambienceVolume);
      soundEngine.setAmbienceMode(mode);
      setAudioUnlocked(true);
    },
    [settings.ambienceVolume, settings.masterVolume]
  );

  const closeModal = useCallback(() => {
    if (returnToPause && (screenMode === 'CHAPTER_1' || screenMode === 'CHAPTER_2')) {
      setActiveModal('PAUSE');
    } else {
      setActiveModal('NONE');
    }
  }, [returnToPause, screenMode]);

  const startBootSplash = useCallback(() => {
    unlockAudio('outside');
    bootStartRef.current = performance.now();
    setBootElapsed(0);
    setActiveModal('NONE');
    setReturnToPause(false);
    setScreenMode('BOOT_SPLASH');
  }, [unlockAudio]);

  const startIntro = useCallback(() => {
    unlockAudio('outside');
    introStartRef.current = performance.now();
    introStepRef.current = 0;
    setIntroElapsed(0);
    setActiveModal('NONE');
    setReturnToPause(false);
    setScreenMode('INTRO');
  }, [unlockAudio]);

  const enterTitleMenu = useCallback(() => {
    soundEngine.setAmbienceMode('outside');
    setActiveModal('NONE');
    setReturnToPause(false);
    setScreenMode('TITLE_MENU');
  }, []);

  const startChapterOne = useCallback(() => {
    unlockAudio('inside');
    soundEngine.playDoorHiss();

    const freshItems = INITIAL_ITEMS.map((i) => ({ ...i }));
    const freshNpcs = INITIAL_NPCS.map((n) => ({ ...n }));
    itemsRef.current = freshItems;
    npcsRef.current = freshNpcs;
    setItems(freshItems);

    playerRef.current = {
      x: 840,
      y: 1030,
      dir: 'up',
      walkFrame: 0,
      stepTimer: 0,
      knockVx: 0,
      knockVy: 0,
      shakeTimer: 0,
    };
    cameraRef.current = {
      x: clamp(840 - PIXEL_W / 2, 0, WORLD_W - PIXEL_W),
      y: clamp(1030 - PIXEL_H / 2, 0, WORLD_H - PIXEL_H),
    };

    chapterTimerRef.current = 0;
    chapterElapsedSyncedRef.current = 0;
    setChapterElapsed(0);
    maskTriggeredCountRef.current = 0;
    blackoutTimerRef.current = 0;
    nearbyTargetRef.current = null;
    setNearbyPrompt(null);
    setActiveDialogue(null);
    setEndingFocusIdx(0);
    setChapterPhase('SHOPPING');
    chapterPhaseRef.current = 'SHOPPING';
    setActiveModal('NONE');
    setReturnToPause(false);
    setScreenMode('CHAPTER_1');
  }, [unlockAudio]);

  const startChapterTwo = useCallback(
    (spawnMonsterImmediately = false) => {
      // If monster spawns right away (retry after caught), disable soundtrack!
      unlockAudio(spawnMonsterImmediately ? 'off' : 'chapter2');

      ch2SolidsRef.current = createInitialChapter2Solids();
      ch2DebrisRef.current = [];
      ch2WalkTimeRef.current = spawnMonsterImmediately ? CH2_WALK_TRIGGER_SECONDS : 0;
      ch2PhoneFlashOnRef.current = true;
      ch2FlashAngleRef.current = -Math.PI / 2;
      ch2LastAimTimeRef.current = -10;
      ch2ScreamerTimerRef.current = 0;
      ch2CreepyCueStepRef.current = spawnMonsterImmediately ? 3 : 0;
      setScreamerFlash(0);

      const spawn = computeFarthestEntitySpawn(840, 1055);
      entityRef.current = {
        state: spawnMonsterImmediately ? 'wander' : 'dormant',
        x: spawn.x,
        y: spawn.y,
        dir: 'down',
        walkFrame: 0,
        roamTargetIdx: 0,
        pauseTimer: 0,
        breathTimer: spawnMonsterImmediately ? 0.9 : 0,
        stepTimer: spawnMonsterImmediately ? 0.4 : 0,
        smashCooldown: 0,
        roarWindup: 0,
        lostSightTimer: 0,
        lastKnownX: spawn.x,
        lastKnownY: spawn.y,
      };

      playerRef.current = {
        x: 840,
        y: 1055,
        dir: 'up',
        walkFrame: 0,
        stepTimer: 0,
        knockVx: 0,
        knockVy: 0,
        shakeTimer: 0,
      };
      cameraRef.current = {
        x: clamp(840 - PIXEL_W / 2, 0, WORLD_W - PIXEL_W),
        y: clamp(1055 - PIXEL_H / 2, 0, WORLD_H - PIXEL_H),
      };

      chapterTimerRef.current = 0;
      chapterElapsedSyncedRef.current = 0;
      setChapterElapsed(0);
      nearbyTargetRef.current = null;
      setNearbyPrompt(null);
      setActiveDialogue(null);
      setEndingFocusIdx(0);
      setCh2Phase('ACTIVE');
      ch2PhaseRef.current = 'ACTIVE';
      setCh2EntityState(spawnMonsterImmediately ? 'wander' : 'dormant');
      setActiveModal('NONE');
      setReturnToPause(false);
      setScreenMode('CHAPTER_2');
    },
    [unlockAudio]
  );

  const activateMenuItem = useCallback(
    (idx: number) => {
      unlockAudio('outside');
      soundEngine.playUiConfirm();
      setReturnToPause(false);
      if (idx === 0) {
        // Play the night walk & parking lot cutscene right after clicking "Начать смену"!
        startIntro();
      } else if (idx === 1) {
        setGamepadFocusIdx(0);
        setActiveModal('GAMEPAD');
      } else if (idx === 2) {
        setSettingsFocusIdx(0);
        setActiveModal('SETTINGS');
      } else if (idx === 3) {
        setChaptersFocusIdx(0);
        setActiveModal('CHAPTERS');
      }
    },
    [startIntro, unlockAudio]
  );

  const activatePauseItem = useCallback(
    (idx: number) => {
      if (idx === 0) {
        soundEngine.playUiBack();
        setActiveModal('NONE');
      } else if (idx === 1) {
        soundEngine.playUiConfirm();
        setReturnToPause(true);
        setGamepadFocusIdx(0);
        setActiveModal('GAMEPAD');
      } else if (idx === 2) {
        soundEngine.playUiConfirm();
        setReturnToPause(true);
        setSettingsFocusIdx(0);
        setActiveModal('SETTINGS');
      } else if (idx === 3) {
        soundEngine.playUiBack();
        setActiveModal('NONE');
        setReturnToPause(false);
        soundEngine.setAmbienceMode('outside');
        setScreenMode('TITLE_MENU');
      }
    },
    []
  );

  const activateEndingItem = useCallback(
    (idx: number) => {
      soundEngine.playUiConfirm();
      if (idx === 0) {
        startChapterTwo(false);
      } else if (idx === 1) {
        startChapterOne();
      } else {
        enterTitleMenu();
      }
    },
    [enterTitleMenu, startChapterOne, startChapterTwo]
  );

  const activateCh2EndingItem = useCallback(
    (idx: number) => {
      soundEngine.playUiConfirm();
      if (idx === 0) {
        // Spawn monster immediately on retry if the player was caught
        startChapterTwo(ch2PhaseRef.current === 'CAUGHT');
      } else {
        enterTitleMenu();
      }
    },
    [enterTitleMenu, startChapterTwo]
  );

  const rumbleRef = useRef<(dur?: number, w?: number, s?: number) => void>(() => {});

  const handleChapterInteract = useCallback(() => {
    if (chapterPhaseRef.current === 'BLACKOUT' || chapterPhaseRef.current === 'ENDED') {
      return;
    }
    if (activeDialogue) {
      soundEngine.playUiBack();
      setActiveDialogue(null);
      return;
    }

    const target = nearbyTargetRef.current;
    if (!target) return;

    if (target.kind === 'item') {
      soundEngine.playItemPickup();
      rumbleRef.current(65, 0.2, 0.12);
      const updated = itemsRef.current.map((it) =>
        it.id === target.item.id ? { ...it, collected: true } : it
      );
      itemsRef.current = updated;
      setItems(updated);

      if (updated.every((it) => it.collected)) {
        setChapterPhase('CHECKOUT');
        chapterPhaseRef.current = 'CHECKOUT';
        setActiveDialogue(
          'Все продукты собраны. Пора пройти на вторую кассу для оплаты.'
        );
      }
      return;
    }

    if (target.kind === 'mask') {
      // Trigger guardian shopper to sprint over and shove player away from the mask!
      const guardian = npcsRef.current.find((n) => n.role === 'guardian');
      if (guardian && guardian.state !== 'charging') {
        soundEngine.playUiConfirm();
        guardian.state = 'charging';
        maskTriggeredCountRef.current += 1;
      }
      return;
    }

    if (target.kind === 'checkout') {
      if (chapterPhaseRef.current === 'SHOPPING') {
        soundEngine.playUiBack();
        setActiveDialogue(
          'Кассир: «Сначала возьмите всё по списку, потом пробьём на второй кассе».'
        );
      } else if (chapterPhaseRef.current === 'CHECKOUT') {
        soundEngine.playScannerBeep();
        rumbleRef.current(80, 0.2, 0.15);
        setChapterPhase('EXIT');
        chapterPhaseRef.current = 'EXIT';
        setActiveDialogue(
          'Кассир пробивает товары: «Пакет нужен? ...С вас по карте прошло. Доброй ночи».'
        );
      } else {
        soundEngine.playUiMove();
        setActiveDialogue('Кассир смотрит мимо вас в сторону пустого входа: «Всего доброго».');
      }
      return;
    }

    if (target.kind === 'spot') {
      if (target.spot.sfx === 'beep') {
        soundEngine.playPriceCheckerBeep();
      } else if (target.spot.sfx === 'buzz') {
        soundEngine.playElectricalBuzz();
      } else {
        soundEngine.playUiConfirm();
      }
      setActiveDialogue(target.spot.dialogue);
      return;
    }

    if (target.kind === 'npc') {
      soundEngine.playUiConfirm();
      const dx = playerRef.current.x - target.npc.x;
      const dy = playerRef.current.y - target.npc.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        target.npc.dir = dx > 0 ? 'right' : 'left';
      } else {
        target.npc.dir = dy > 0 ? 'down' : 'up';
      }
      if (target.npc.role === 'roam') {
        target.npc.pauseTimer = 3.5;
        target.npc.walkFrame = 0;
      }
      setActiveDialogue(target.npc.dialogue);
    }
  }, [activeDialogue]);

  const handleChapterTwoInteract = useCallback(() => {
    if (ch2PhaseRef.current !== 'ACTIVE') return;
    if (activeDialogue) {
      soundEngine.playUiBack();
      setActiveDialogue(null);
      return;
    }
    const target = nearbyTargetRef.current;
    if (!target || target.kind !== 'spot') return;

    if (target.spot.id === 'staff_door') {
      if (entityRef.current.state !== 'dormant') {
        soundEngine.playStaffDoorEscape();
        soundEngine.setAmbienceMode('blackout');
        rumbleRef.current(320, 0.85, 0.9);
        setActiveDialogue(null);
        setEndingFocusIdx(0);
        setCh2Phase('ESCAPED');
        ch2PhaseRef.current = 'ESCAPED';
      } else {
        soundEngine.playUiBack();
        setActiveDialogue(
          'Магнитный замок погас без электричества, и тяжёлая дверь чуть поддаётся. Но там кромешная тьма — пока нет причины уходить вглубь подсобки.'
        );
      }
      return;
    }

    if (target.spot.sfx === 'buzz') {
      soundEngine.playElectricalBuzz();
    } else {
      soundEngine.playUiConfirm();
    }
    setActiveDialogue(target.spot.dialogue);
  }, [activeDialogue]);

  const cycleLayout = useCallback(
    (delta: number) => {
      const idx = LAYOUT_ORDER.indexOf(settings.gamepadLayout);
      const next = LAYOUT_ORDER[(idx + delta + LAYOUT_ORDER.length) % LAYOUT_ORDER.length];
      soundEngine.playUiConfirm();
      updateSettings({ gamepadLayout: next });
    },
    [settings.gamepadLayout, updateSettings]
  );

  const handleNavAction = useCallback(
    (action: NavAction) => {
      if (!audioUnlocked) {
        unlockAudio(
          screenMode === 'CHAPTER_2'
            ? entityRef.current.state === 'wander'
              ? 'off'
              : entityRef.current.state === 'chase'
              ? 'chase'
              : 'chapter2'
            : screenMode === 'CHAPTER_1'
            ? 'inside'
            : 'outside'
        );
      }

      // 1. Modals
      if (activeModal === 'GAMEPAD') {
        if (action === 'CANCEL' || action === 'PAUSE') {
          soundEngine.playUiBack();
          closeModal();
          return;
        }
        if (action === 'UP') {
          soundEngine.playUiMove();
          setGamepadFocusIdx((i) => (i + 5) % 6);
        } else if (action === 'DOWN') {
          soundEngine.playUiMove();
          setGamepadFocusIdx((i) => (i + 1) % 6);
        } else if (action === 'LEFT' || action === 'RIGHT') {
          const dir = action === 'RIGHT' ? 1 : -1;
          if (gamepadFocusIdx === 0) {
            cycleLayout(dir);
          } else if (gamepadFocusIdx === 1) {
            soundEngine.playUiMove();
            updateSettings({
              stickDeadzone: Number(clamp(settings.stickDeadzone + dir * 0.02, 0.08, 0.35).toFixed(2)),
            });
          } else if (gamepadFocusIdx === 2) {
            soundEngine.playUiMove();
            updateSettings({ vibration: !settings.vibration });
          } else if (gamepadFocusIdx === 4) {
            soundEngine.playUiMove();
            updateSettings({ keyboardAssist: !settings.keyboardAssist });
          }
        } else if (action === 'CONFIRM') {
          if (gamepadFocusIdx === 0) {
            cycleLayout(1);
          } else if (gamepadFocusIdx === 2) {
            soundEngine.playUiMove();
            updateSettings({ vibration: !settings.vibration });
          } else if (gamepadFocusIdx === 3) {
            soundEngine.playUiConfirm();
            rumbleRef.current(180, 0.45, 0.35);
          } else if (gamepadFocusIdx === 4) {
            soundEngine.playUiMove();
            updateSettings({ keyboardAssist: !settings.keyboardAssist });
          } else if (gamepadFocusIdx === 5) {
            soundEngine.playUiBack();
            closeModal();
          }
        }
        return;
      }

      if (activeModal === 'SETTINGS') {
        if (action === 'CANCEL' || action === 'PAUSE') {
          soundEngine.playUiBack();
          closeModal();
          return;
        }
        if (action === 'UP') {
          soundEngine.playUiMove();
          setSettingsFocusIdx((i) => (i + 8) % 9);
        } else if (action === 'DOWN') {
          soundEngine.playUiMove();
          setSettingsFocusIdx((i) => (i + 1) % 9);
        } else if (action === 'LEFT' || action === 'RIGHT') {
          const dir = action === 'RIGHT' ? 1 : -1;
          if (settingsFocusIdx === 0) {
            soundEngine.playUiMove();
            updateSettings({
              brightness: Number(clamp(settings.brightness + dir * 0.05, 0.65, 1.45).toFixed(2)),
            });
          } else if (settingsFocusIdx === 1) {
            soundEngine.playUiMove();
            updateSettings({
              masterVolume: Number(clamp(settings.masterVolume + dir * 0.05, 0, 1).toFixed(2)),
            });
          } else if (settingsFocusIdx === 2) {
            soundEngine.playUiMove();
            updateSettings({
              ambienceVolume: Number(clamp(settings.ambienceVolume + dir * 0.05, 0, 1).toFixed(2)),
            });
          } else if (settingsFocusIdx === 3) {
            soundEngine.playUiMove();
            updateSettings({ scanlines: !settings.scanlines });
          } else if (settingsFocusIdx === 4) {
            soundEngine.playUiMove();
            updateSettings({ filmGrain: !settings.filmGrain });
          } else if (settingsFocusIdx === 5) {
            soundEngine.playUiMove();
            toggleFullscreen();
          } else if (settingsFocusIdx === 6) {
            soundEngine.playUiMove();
            updateSettings({ flickerEffect: !settings.flickerEffect });
          } else if (settingsFocusIdx === 7 || settingsFocusIdx === 8) {
            setSettingsFocusIdx(settingsFocusIdx === 7 ? 8 : 7);
            soundEngine.playUiMove();
          }
        } else if (action === 'CONFIRM') {
          if (settingsFocusIdx === 3) {
            soundEngine.playUiMove();
            updateSettings({ scanlines: !settings.scanlines });
          } else if (settingsFocusIdx === 4) {
            soundEngine.playUiMove();
            updateSettings({ filmGrain: !settings.filmGrain });
          } else if (settingsFocusIdx === 5) {
            soundEngine.playUiMove();
            toggleFullscreen();
          } else if (settingsFocusIdx === 6) {
            soundEngine.playUiMove();
            updateSettings({ flickerEffect: !settings.flickerEffect });
          } else if (settingsFocusIdx === 7) {
            soundEngine.playUiMove();
            updateSettings(DEFAULT_SETTINGS);
          } else if (settingsFocusIdx === 8) {
            soundEngine.playUiConfirm();
            closeModal();
          }
        }
        return;
      }

      if (activeModal === 'CHAPTERS') {
        if (action === 'CANCEL' || action === 'PAUSE') {
          soundEngine.playUiBack();
          closeModal();
          return;
        }
        if (action === 'UP') {
          soundEngine.playUiMove();
          setChaptersFocusIdx((i) => (i + CHAPTERS.length - 1) % CHAPTERS.length);
        } else if (action === 'DOWN') {
          soundEngine.playUiMove();
          setChaptersFocusIdx((i) => (i + 1) % CHAPTERS.length);
        } else if (action === 'CONFIRM') {
          const ch = CHAPTERS[chaptersFocusIdx];
          if (ch?.status === 'AVAILABLE') {
            soundEngine.playUiConfirm();
            if (ch.id === 2) startChapterTwo();
            else startChapterOne();
          } else {
            soundEngine.playUiBack();
          }
        }
        return;
      }

      if (activeModal === 'PAUSE') {
        if (action === 'CANCEL' || action === 'PAUSE') {
          soundEngine.playUiBack();
          setActiveModal('NONE');
          return;
        }
        if (action === 'UP') {
          soundEngine.playUiMove();
          setPauseFocusIdx((i) => (i + 3) % 4);
        } else if (action === 'DOWN') {
          soundEngine.playUiMove();
          setPauseFocusIdx((i) => (i + 1) % 4);
        } else if (action === 'CONFIRM') {
          activatePauseItem(pauseFocusIdx);
        }
        return;
      }

      // 2. Main Screens
      if (screenMode === 'CALIBRATION') {
        const rowCount = calibrationStep === 2 ? 6 : 2;
        if (action === 'UP') {
          soundEngine.playUiMove();
          setCalibrationFocusIdx((i) => (i + rowCount - 1) % rowCount);
        } else if (action === 'DOWN') {
          soundEngine.playUiMove();
          setCalibrationFocusIdx((i) => (i + 1) % rowCount);
        } else if (action === 'LEFT' || action === 'RIGHT') {
          const dir = action === 'RIGHT' ? 1 : -1;
          if (calibrationStep === 0 && calibrationFocusIdx === 0) {
            cycleLayout(dir);
          } else if (calibrationStep === 1 && calibrationFocusIdx === 0) {
            soundEngine.playUiMove();
            updateSettings({
              brightness: Number(clamp(settings.brightness + dir * 0.05, 0.65, 1.45).toFixed(2)),
            });
          } else if (calibrationStep === 2) {
            if (calibrationFocusIdx === 0) {
              soundEngine.playUiMove();
              updateSettings({
                masterVolume: Number(clamp(settings.masterVolume + dir * 0.05, 0, 1).toFixed(2)),
              });
            } else if (calibrationFocusIdx === 1) {
              soundEngine.playUiMove();
              updateSettings({
                ambienceVolume: Number(clamp(settings.ambienceVolume + dir * 0.05, 0, 1).toFixed(2)),
              });
            } else if (calibrationFocusIdx === 2) {
              soundEngine.playUiMove();
              updateSettings({ scanlines: !settings.scanlines });
            } else if (calibrationFocusIdx === 3) {
              soundEngine.playUiMove();
              updateSettings({ filmGrain: !settings.filmGrain });
            }
          }
        } else if (action === 'CANCEL') {
          if (calibrationStep > 0) {
            soundEngine.playUiBack();
            setCalibrationStep((s) => Math.max(0, s - 1));
            setCalibrationFocusIdx(0);
          }
        } else if (action === 'CONFIRM') {
          if (calibrationStep === 0) {
            if (calibrationFocusIdx === 0) {
              cycleLayout(1);
            } else {
              soundEngine.playUiConfirm();
              setCalibrationStep(1);
              setCalibrationFocusIdx(0);
            }
          } else if (calibrationStep === 1) {
            soundEngine.playUiConfirm();
            setCalibrationStep(2);
            setCalibrationFocusIdx(0);
          } else {
            if (calibrationFocusIdx === 2) {
              soundEngine.playUiMove();
              updateSettings({ scanlines: !settings.scanlines });
            } else if (calibrationFocusIdx === 3) {
              soundEngine.playUiMove();
              updateSettings({ filmGrain: !settings.filmGrain });
            } else if (calibrationFocusIdx === 4) {
              soundEngine.playAudioCalibrationTest();
            } else {
              soundEngine.playUiConfirm();
              startBootSplash();
            }
          }
        }
        return;
      }

      if (screenMode === 'BOOT_SPLASH') {
        if (action === 'CONFIRM' || action === 'PAUSE' || action === 'CANCEL') {
          soundEngine.playUiConfirm();
          enterTitleMenu();
        }
        return;
      }

      if (screenMode === 'INTRO') {
        if (action === 'CONFIRM' || action === 'PAUSE' || action === 'CANCEL') {
          soundEngine.playUiConfirm();
          startChapterOne();
        }
        return;
      }

      if (screenMode === 'TITLE_MENU') {
        if (action === 'UP') {
          soundEngine.playUiMove();
          setSelectedMenuIdx((i) => (i + 3) % 4);
        } else if (action === 'DOWN') {
          soundEngine.playUiMove();
          setSelectedMenuIdx((i) => (i + 1) % 4);
        } else if (action === 'CONFIRM') {
          activateMenuItem(selectedMenuIdx);
        }
        return;
      }

      if (screenMode === 'CHAPTER_1') {
        if (chapterPhaseRef.current === 'ENDED') {
          if (action === 'UP') {
            soundEngine.playUiMove();
            setEndingFocusIdx((i) => (i + 2) % 3);
          } else if (action === 'DOWN') {
            soundEngine.playUiMove();
            setEndingFocusIdx((i) => (i + 1) % 3);
          } else if (action === 'CONFIRM') {
            activateEndingItem(endingFocusIdx);
          }
          return;
        }

        if (chapterPhaseRef.current === 'BLACKOUT' || chapterTimerRef.current < 1.9) {
          return;
        }

        if (action === 'INTERACT') {
          handleChapterInteract();
        } else if (action === 'CONFIRM' && activeDialogue) {
          soundEngine.playUiBack();
          setActiveDialogue(null);
        } else if (action === 'PAUSE') {
          soundEngine.playUiMove();
          setPauseFocusIdx(0);
          setActiveModal('PAUSE');
        } else if (action === 'CANCEL') {
          if (activeDialogue) {
            soundEngine.playUiBack();
            setActiveDialogue(null);
          } else {
            soundEngine.playUiMove();
            setPauseFocusIdx(0);
            setActiveModal('PAUSE');
          }
        }
        return;
      }

      if (screenMode === 'CHAPTER_2') {
        if (ch2PhaseRef.current === 'CAUGHT' || ch2PhaseRef.current === 'ESCAPED') {
          if (action === 'UP' || action === 'DOWN') {
            soundEngine.playUiMove();
            setEndingFocusIdx((i) => (i === 0 ? 1 : 0));
          } else if (action === 'CONFIRM') {
            activateCh2EndingItem(endingFocusIdx);
          }
          return;
        }

        if (chapterTimerRef.current < 1.9) {
          return;
        }

        if (action === 'FLASHLIGHT') {
          ch2PhoneFlashOnRef.current = !ch2PhoneFlashOnRef.current;
          soundEngine.playPhoneFlashClick();
        } else if (action === 'INTERACT') {
          handleChapterTwoInteract();
        } else if (action === 'CONFIRM' && activeDialogue) {
          soundEngine.playUiBack();
          setActiveDialogue(null);
        } else if (action === 'PAUSE') {
          soundEngine.playUiMove();
          setPauseFocusIdx(0);
          setActiveModal('PAUSE');
        } else if (action === 'CANCEL') {
          if (activeDialogue) {
            soundEngine.playUiBack();
            setActiveDialogue(null);
          } else {
            soundEngine.playUiMove();
            setPauseFocusIdx(0);
            setActiveModal('PAUSE');
          }
        }
      }
    },
    [
      activeDialogue,
      activeModal,
      activateCh2EndingItem,
      activateEndingItem,
      activateMenuItem,
      activatePauseItem,
      audioUnlocked,
      calibrationFocusIdx,
      calibrationStep,
      chaptersFocusIdx,
      closeModal,
      cycleLayout,
      endingFocusIdx,
      enterTitleMenu,
      gamepadFocusIdx,
      handleChapterInteract,
      handleChapterTwoInteract,
      pauseFocusIdx,
      screenMode,
      selectedMenuIdx,
      settings.ambienceVolume,
      settings.brightness,
      settings.filmGrain,
      settings.flickerEffect,
      settings.keyboardAssist,
      settings.masterVolume,
      settings.scanlines,
      settings.stickDeadzone,
      settings.vibration,
      settingsFocusIdx,
      startBootSplash,
      startChapterOne,
      startChapterTwo,
      toggleFullscreen,
      unlockAudio,
      updateSettings,
    ]
  );

  const { snapshot, movementRef, aimRef, rumble } = useGamepad({
    layout: settings.gamepadLayout,
    deadzone: settings.stickDeadzone,
    vibrationEnabled: settings.vibration,
    keyboardAssist: settings.keyboardAssist,
    onAction: handleNavAction,
  });

  rumbleRef.current = (dur = 180, w = 0.45, s = 0.35) => rumble(dur, w, s);

  // Main 60fps Pixel-Art Canvas & Chapter 1 Simulation Loop
  useEffect(() => {
    if (!rendererRef.current) {
      rendererRef.current = new PixelWorldRenderer();
    }
    if (!marketRendererRef.current) {
      marketRendererRef.current = new HypermarketRenderer();
    }

    let rafId = 0;
    let lastTime = performance.now();
    let silhouetteTimer = 0;
    let flickerSoundTimer = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const t = now / 1000;

      const renderer = rendererRef.current!;
      const marketRenderer = marketRendererRef.current!;
      const canvas = canvasRef.current;

      renderer.updateRain(dt);

      if (canvas) {
        if (screenMode === 'TITLE_MENU' || screenMode === 'CALIBRATION') {
          silhouetteTimer = (silhouetteTimer + dt) % 14;
          const silhouetteVisible = silhouetteTimer > 3.5 && silhouetteTimer < 9.5;
          const silhouetteX = 95 + ((silhouetteTimer - 3.5) / 6) * 240;

          if (settings.flickerEffect && audioUnlocked) {
            flickerSoundTimer += dt;
            if (flickerSoundTimer > 9.5) {
              flickerSoundTimer = 0;
              soundEngine.playFluorescentBuzz();
            }
          }

          renderer.renderExterior(canvas, {
            time: t,
            brightness: settings.brightness,
            flickerEnabled: settings.flickerEffect,
            doorOpen: 0,
            playerVisible: false,
            playerX: 0,
            playerY: 0,
            playerDir: 'up',
            walkFrame: 0,
            cameraX: Math.sin(t * 0.25) * 4,
            cameraY: Math.cos(t * 0.18) * 2,
            silhouetteX,
            silhouetteVisible,
          });
        } else if (screenMode === 'BOOT_SPLASH') {
          const elapsed = (now - bootStartRef.current) / 1000;
          setBootElapsed(elapsed);
          if (elapsed >= BOOT_SPLASH_DURATION) {
            enterTitleMenu();
          }
        } else if (screenMode === 'INTRO') {
          const elapsed = (now - introStartRef.current) / 1000;
          setIntroElapsed(elapsed);

          if (elapsed < 14.5) {
            const p = elapsed / 14.5;
            const px = 34 + p * 540;
            const camX = Math.max(0, Math.min(200, px - 180));

            if (elapsed - introStepRef.current > 0.45) {
              introStepRef.current = elapsed;
              soundEngine.playFootstep('asphalt');
            }

            renderer.renderIntroStreet(canvas, {
              time: t,
              brightness: settings.brightness,
              flickerEnabled: settings.flickerEffect,
              playerX: px,
              playerY: 118,
              walkFrame: elapsed * 7.5,
              cameraX: camX,
            });
          } else {
            const localT = elapsed - 14.5;
            let px = 18;
            let py = 205;
            let dir: 'up' | 'down' | 'left' | 'right' = 'right';
            let walkFrame = 0;
            let doorOpen = 0;

            if (localT <= 5.8) {
              const p = localT / 5.8;
              px = 18 + p * (302 - 18);
              py = 205 - p * 42;
              dir = 'right';
              walkFrame = elapsed * 7.5;
            } else if (localT <= 9.6) {
              const p = (localT - 5.8) / 3.8;
              px = 302;
              py = 163 - p * (163 - 86);
              dir = 'up';
              walkFrame = elapsed * 7.5;
            } else {
              px = 302;
              py = 82;
              dir = 'up';
            }

            if (localT < 9.6 && elapsed - introStepRef.current > 0.44) {
              introStepRef.current = elapsed;
              soundEngine.playFootstep('asphalt');
            }

            if (elapsed >= 23.0) {
              doorOpen = Math.min(1, (elapsed - 23.0) / 1.1);
            }

            renderer.renderExterior(canvas, {
              time: t,
              brightness: settings.brightness,
              flickerEnabled: settings.flickerEffect,
              doorOpen,
              playerVisible: elapsed < 25.0,
              playerX: px,
              playerY: py,
              playerDir: dir,
              walkFrame,
              cameraX: Math.max(0, Math.min(16, (px - 220) * 0.12)),
              cameraY: 0,
              silhouetteX: 195,
              silhouetteVisible: elapsed >= 18.5 && elapsed < 22.8,
            });

            if (elapsed >= 28.0) {
              startChapterOne();
            }
          }
        } else if (screenMode === 'CHAPTER_1') {
          const p = playerRef.current;
          const phase = chapterPhaseRef.current;

          if (activeModal === 'NONE' && phase !== 'BLACKOUT' && phase !== 'ENDED') {
            chapterTimerRef.current += dt;
            if (
              chapterElapsedSyncedRef.current < 22.5 &&
              chapterTimerRef.current - chapterElapsedSyncedRef.current >= 0.1
            ) {
              chapterElapsedSyncedRef.current = chapterTimerRef.current;
              setChapterElapsed(chapterTimerRef.current);
            }
          }

          const guardianCharging = npcsRef.current.some(
            (n) => n.role === 'guardian' && n.state === 'charging'
          );

          const canMove =
            activeModal === 'NONE' &&
            chapterTimerRef.current >= 1.9 &&
            !activeDialogue &&
            !guardianCharging &&
            phase !== 'BLACKOUT' &&
            phase !== 'ENDED';

          const mv = canMove ? movementRef.current : { x: 0, y: 0, sprint: false };
          const speed = mv.sprint ? 114 : 72;

          // Combine movement input + knockback velocity
          const stepX = (mv.x * speed + p.knockVx) * dt;
          const stepY = (mv.y * speed + p.knockVy) * dt;

          p.knockVx *= Math.pow(0.02, dt);
          p.knockVy *= Math.pow(0.02, dt);
          if (Math.abs(p.knockVx) < 3) p.knockVx = 0;
          if (Math.abs(p.knockVy) < 3) p.knockVy = 0;
          if (p.shakeTimer > 0) p.shakeTimer = Math.max(0, p.shakeTimer - dt);

          const nextX = clamp(p.x + stepX, 46, WORLD_W - 46);
          if (!collidesWithSolids(nextX, p.y)) {
            p.x = nextX;
          }
          const nextY = clamp(p.y + stepY, 54, WORLD_H - 38);
          if (!collidesWithSolids(p.x, nextY)) {
            p.y = nextY;
          }

          const moving = canMove && (Math.abs(mv.x) > 0.08 || Math.abs(mv.y) > 0.08);
          if (moving) {
            if (Math.abs(mv.x) > Math.abs(mv.y)) {
              p.dir = mv.x > 0 ? 'right' : 'left';
            } else {
              p.dir = mv.y > 0 ? 'down' : 'up';
            }
            p.walkFrame += dt * (mv.sprint ? 12 : 8);
            p.stepTimer += dt;
            const stepInterval = mv.sprint ? 0.27 : 0.42;
            if (p.stepTimer >= stepInterval) {
              p.stepTimer = 0;
              soundEngine.playFootstep('tile');
            }
          } else {
            p.walkFrame = 0;
          }

          // Update NPCs (calm roaming + scripted Mask Guardian shove!)
          if (activeModal === 'NONE' && phase !== 'BLACKOUT' && phase !== 'ENDED') {
            for (const npc of npcsRef.current) {
              if (npc.role === 'roam' && npc.patrolPoints && npc.patrolPoints.length > 0) {
                if (npc.pauseTimer && npc.pauseTimer > 0) {
                  npc.pauseTimer = Math.max(0, npc.pauseTimer - dt);
                  npc.walkFrame = 0;
                  continue;
                }
                const idx = npc.patrolIdx ?? 0;
                const target = npc.patrolPoints[idx % npc.patrolPoints.length];
                const dx = target.x - npc.x;
                const dy = target.y - npc.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 3) {
                  const s = (npc.isStaff ? 32 : 25) * dt;
                  npc.x += (dx / dist) * s;
                  npc.y += (dy / dist) * s;
                  npc.dir =
                    Math.abs(dx) > Math.abs(dy)
                      ? dx > 0
                        ? 'right'
                        : 'left'
                      : dy > 0
                      ? 'down'
                      : 'up';
                  npc.walkFrame += dt * (npc.isStaff ? 6 : 5);
                } else {
                  npc.x = target.x;
                  npc.y = target.y;
                  if (target.face) npc.dir = target.face;
                  npc.walkFrame = 0;
                  npc.pauseTimer = 2.0 + ((idx * 1.37) % 2.4);
                  npc.patrolIdx = (idx + 1) % npc.patrolPoints.length;
                }
              } else if (npc.role === 'guardian') {
                if (npc.state === 'charging') {
                  const dx = p.x - npc.x;
                  const dy = p.y - npc.y;
                  const dist = Math.hypot(dx, dy);
                  if (dist > 18) {
                    const runSpeed = 195 * dt;
                    npc.x += (dx / dist) * runSpeed;
                    npc.y += (dy / dist) * runSpeed;
                    npc.dir =
                      Math.abs(dx) > Math.abs(dy)
                        ? dx > 0
                          ? 'right'
                          : 'left'
                        : dy > 0
                        ? 'down'
                        : 'up';
                    npc.walkFrame += dt * 15;
                  } else {
                    // Shove the player away from the mask & staff door!
                    soundEngine.playShove();
                    rumbleRef.current(260, 0.75, 0.85);
                    p.knockVx = -320;
                    p.knockVy = 95;
                    p.shakeTimer = 0.35;
                    npc.state = 'returning';
                    npc.walkFrame = 0;
                    setActiveDialogue(
                      maskTriggeredCountRef.current > 1
                        ? 'Покупатель резко толкает вас в плечо: «Я же сказал — не трогай маску. Занимайся покупками».'
                        : 'Покупатель подбегает и грубо отталкивает вас от маски: «Не трогай. Это не для посетителей».'
                    );
                  }
                } else if (npc.state === 'returning') {
                  const dx = npc.homeX - npc.x;
                  const dy = npc.homeY - npc.y;
                  const dist = Math.hypot(dx, dy);
                  if (dist > 3) {
                    const walkSpeed = 48 * dt;
                    npc.x += (dx / dist) * walkSpeed;
                    npc.y += (dy / dist) * walkSpeed;
                    npc.dir =
                      Math.abs(dx) > Math.abs(dy)
                        ? dx > 0
                          ? 'right'
                          : 'left'
                        : dy > 0
                        ? 'down'
                        : 'up';
                    npc.walkFrame += dt * 6;
                  } else {
                    npc.state = 'idle';
                    npc.dir = 'right';
                    npc.walkFrame = 0;
                  }
                }
              }
            }
          }

          // Theft prevention: stop player at exit if carrying unpaid items
          if (
            phase !== 'EXIT' &&
            phase !== 'BLACKOUT' &&
            phase !== 'ENDED' &&
            !activeDialogue &&
            p.x > EXIT_TRIGGER_RECT.x &&
            p.x < EXIT_TRIGGER_RECT.x + EXIT_TRIGGER_RECT.w &&
            p.y > EXIT_TRIGGER_RECT.y
          ) {
            if (itemsRef.current.some((it) => it.collected)) {
              p.y = EXIT_TRIGGER_RECT.y - 6;
              p.knockVx = 0;
              p.knockVy = 0;
              soundEngine.playUiBack();
              rumbleRef.current(90, 0.25, 0.2);
              setActiveDialogue(
                phase === 'CHECKOUT'
                  ? 'Я не могу уйти с неоплаченными продуктами. Нужно подойти ко второй кассе и оплатить.'
                  : 'Я не могу просто уйти с неоплаченным товаром — я не вор. Надо собрать список и оплатить на кассе.'
              );
            }
          }

          // Check exit blackout trigger once groceries are paid!
          if (
            phase === 'EXIT' &&
            !activeDialogue &&
            p.x > EXIT_TRIGGER_RECT.x &&
            p.x < EXIT_TRIGGER_RECT.x + EXIT_TRIGGER_RECT.w &&
            p.y > EXIT_TRIGGER_RECT.y &&
            p.y < EXIT_TRIGGER_RECT.y + EXIT_TRIGGER_RECT.h
          ) {
            setChapterPhase('BLACKOUT');
            chapterPhaseRef.current = 'BLACKOUT';
            blackoutTimerRef.current = 0;
            p.shakeTimer = 0.45;
            soundEngine.setAmbienceMode('blackout');
            soundEngine.playBlackout();
            rumbleRef.current(380, 0.85, 0.9);
          }

          if (phase === 'BLACKOUT') {
            blackoutTimerRef.current += dt;
            if (blackoutTimerRef.current > 1.1 && blackoutTimerRef.current < 1.2) {
              setActiveDialogue('...Что? Свет вырубили. Двери заблокированы.');
            }
            if (blackoutTimerRef.current >= 3.6) {
              setActiveDialogue(null);
              setChapterPhase('ENDED');
              chapterPhaseRef.current = 'ENDED';
            }
          }

          // Find nearest interactable target
          let foundTarget: NearbyTarget | null = null;
          let foundPrompt: string | null = null;
          let bestDist = Infinity;

          for (const it of itemsRef.current) {
            if (it.collected) continue;
            const d = Math.hypot(p.x - it.x, p.y - it.y);
            if (d < 34 && d < bestDist) {
              bestDist = d;
              foundTarget = { kind: 'item', item: it };
              foundPrompt = `Взять: ${it.name}`;
            }
          }

          const dMask = Math.hypot(p.x - MASK_POS.x, p.y - MASK_POS.y);
          if (dMask < 32 && dMask < bestDist) {
            bestDist = dMask;
            foundTarget = { kind: 'mask' };
            foundPrompt = 'Осмотреть маску';
          }

          const dCheckout = Math.hypot(p.x - CHECKOUT_POS.x, p.y - CHECKOUT_POS.y);
          if (dCheckout < 44 && dCheckout < bestDist) {
            bestDist = dCheckout;
            foundTarget = { kind: 'checkout' };
            foundPrompt =
              phase === 'CHECKOUT' ? 'Оплатить покупки' : 'Подойти к кассе №2';
          }

          for (const spot of INSPECTABLE_SPOTS) {
            const radius = spot.radius ?? 36;
            const dSpot = Math.hypot(p.x - spot.x, p.y - spot.y);
            if (dSpot < radius && dSpot < bestDist) {
              bestDist = dSpot;
              foundTarget = { kind: 'spot', spot };
              foundPrompt = spot.prompt;
            }
          }

          for (const npc of npcsRef.current) {
            if (npc.role === 'cashier' || npc.state === 'charging') continue;
            const dNpc = Math.hypot(p.x - npc.x, p.y - npc.y);
            if (dNpc < 30 && dNpc < bestDist) {
              bestDist = dNpc;
              foundTarget = { kind: 'npc', npc };
              foundPrompt = 'Поговорить';
            }
          }

          nearbyTargetRef.current = foundTarget;
          setNearbyPrompt((prev) => (prev === foundPrompt ? prev : foundPrompt));

          // Smooth camera follow clamped inside store bounds
          const targetCamX = clamp(p.x - PIXEL_W / 2, 0, WORLD_W - PIXEL_W);
          const targetCamY = clamp(p.y - PIXEL_H / 2, 0, WORLD_H - PIXEL_H);
          const lerp = 1 - Math.pow(0.001, dt);
          cameraRef.current.x += (targetCamX - cameraRef.current.x) * lerp;
          cameraRef.current.y += (targetCamY - cameraRef.current.y) * lerp;

          const shakeMag = p.shakeTimer > 0 ? p.shakeTimer * 10 : 0;
          const shakeX = shakeMag > 0 ? (Math.random() - 0.5) * shakeMag : 0;
          const shakeY = shakeMag > 0 ? (Math.random() - 0.5) * shakeMag : 0;

          let nearbyPos: { x: number; y: number } | null = null;
          if (foundTarget) {
            if (foundTarget.kind === 'item') nearbyPos = foundTarget.item;
            else if (foundTarget.kind === 'mask') nearbyPos = MASK_POS;
            else if (foundTarget.kind === 'checkout') nearbyPos = CHECKOUT_POS;
            else if (foundTarget.kind === 'spot') nearbyPos = foundTarget.spot;
            else if (foundTarget.kind === 'npc') nearbyPos = foundTarget.npc;
          }

          marketRenderer.render(canvas, {
            time: t,
            brightness: settings.brightness,
            flickerEnabled: settings.flickerEffect,
            blackout: phase === 'BLACKOUT' || phase === 'ENDED',
            chapter: 1,
            cameraX: cameraRef.current.x,
            cameraY: cameraRef.current.y,
            shakeX,
            shakeY,
            playerX: p.x,
            playerY: p.y,
            playerDir: p.dir,
            walkFrame: p.walkFrame,
            items: itemsRef.current,
            npcs: npcsRef.current,
            nearbyPos,
            exitLocked: phase === 'BLACKOUT' || phase === 'ENDED',
          });
        } else if (screenMode === 'CHAPTER_2') {
          const p = playerRef.current;
          const phase = ch2PhaseRef.current;
          const solids = ch2SolidsRef.current;
          const ent = entityRef.current;

          if (activeModal === 'NONE' && phase === 'ACTIVE') {
            chapterTimerRef.current += dt;
            if (
              chapterElapsedSyncedRef.current < 22.5 &&
              chapterTimerRef.current - chapterElapsedSyncedRef.current >= 0.1
            ) {
              chapterElapsedSyncedRef.current = chapterTimerRef.current;
              setChapterElapsed(chapterTimerRef.current);
            }
          }

          if (ch2ScreamerTimerRef.current > 0) {
            ch2ScreamerTimerRef.current = Math.max(0, ch2ScreamerTimerRef.current - dt);
            setScreamerFlash(ch2ScreamerTimerRef.current);
          }

          const canMove =
            activeModal === 'NONE' &&
            chapterTimerRef.current >= 1.9 &&
            !activeDialogue &&
            phase === 'ACTIVE';

          const mv = canMove ? movementRef.current : { x: 0, y: 0, sprint: false };
          const speed = mv.sprint ? 114 : 72;

          if (p.shakeTimer > 0) p.shakeTimer = Math.max(0, p.shakeTimer - dt);

          const nextX = clamp(p.x + mv.x * speed * dt, 46, WORLD_W - 46);
          if (!collidesWithSolids(nextX, p.y, 7, solids)) {
            p.x = nextX;
          }
          const nextY = clamp(p.y + mv.y * speed * dt, 54, WORLD_H - 38);
          if (!collidesWithSolids(p.x, nextY, 7, solids)) {
            p.y = nextY;
          }

          const moving = canMove && (Math.abs(mv.x) > 0.08 || Math.abs(mv.y) > 0.08);
          if (moving) {
            if (Math.abs(mv.x) > Math.abs(mv.y)) {
              p.dir = mv.x > 0 ? 'right' : 'left';
            } else {
              p.dir = mv.y > 0 ? 'down' : 'up';
            }
            p.walkFrame += dt * (mv.sprint ? 12 : 8);
            p.stepTimer += dt;
            const stepInterval = mv.sprint ? 0.27 : 0.42;
            if (p.stepTimer >= stepInterval) {
              p.stepTimer = 0;
              soundEngine.playFootstep('tile');
            }

            // 2m30s ACTIVE WALKING timer (only increments while player actually walks!)
            if (ent.state === 'dormant') {
              ch2WalkTimeRef.current += dt;

              // Subtle escalating eerie audio cues during the 2:30 walk
              const wSec = ch2WalkTimeRef.current;
              if (wSec > 45 && ch2CreepyCueStepRef.current === 0) {
                ch2CreepyCueStepRef.current = 1;
                soundEngine.playFluorescentBuzz();
              } else if (wSec > 95 && ch2CreepyCueStepRef.current === 1) {
                ch2CreepyCueStepRef.current = 2;
                soundEngine.playEntityFootstep(0.28);
              } else if (wSec > 132 && ch2CreepyCueStepRef.current === 2) {
                ch2CreepyCueStepRef.current = 3;
                soundEngine.playEntityBreath(0.32);
              }

              if (wSec >= CH2_WALK_TRIGGER_SECONDS) {
                const spawn = computeFarthestEntitySpawn(p.x, p.y);
                ent.state = 'wander';
                ent.x = spawn.x;
                ent.y = spawn.y;
                ent.breathTimer = 0.7;
                ent.stepTimer = 0.35;
                setCh2EntityState('wander');
                // Silence ambient soundtrack once monster enters the store!
                soundEngine.setAmbienceMode('off');
                ch2ScreamerTimerRef.current = 0.96;
                setScreamerFlash(0.96);
                p.shakeTimer = 0.9;
                setActiveDialogue(null);
                soundEngine.playScreamer();
                rumbleRef.current(550, 1.0, 1.0);
              }
            }
          } else {
            p.walkFrame = 0;
          }

          // Smooth rotational Phone Flash aiming with pleasant angular input lag
          if (activeModal === 'NONE' && phase === 'ACTIVE') {
            const aim = aimRef.current;
            let desiredAngle: number | null = null;
            let dampSpeed = 9.5;
            if (aim.active) {
              desiredAngle = Math.atan2(aim.y, aim.x);
              ch2LastAimTimeRef.current = t;
            } else if (moving && t - ch2LastAimTimeRef.current > 2.0) {
              desiredAngle = Math.atan2(mv.y, mv.x);
              dampSpeed = 6.5;
            }
            if (desiredAngle !== null) {
              let diff = desiredAngle - ch2FlashAngleRef.current;
              while (diff > Math.PI) diff -= Math.PI * 2;
              while (diff < -Math.PI) diff += Math.PI * 2;
              ch2FlashAngleRef.current += diff * (1 - Math.exp(-dampSpeed * dt));
            }
          }

          // Backroom escape check once the Entity is active
          if (
            phase === 'ACTIVE' &&
            ent.state !== 'dormant' &&
            p.x >= 1478 &&
            p.y >= 306 &&
            p.y <= 380
          ) {
            soundEngine.playStaffDoorEscape();
            soundEngine.setAmbienceMode('blackout');
            rumbleRef.current(320, 0.85, 0.9);
            setActiveDialogue(null);
            setEndingFocusIdx(0);
            setCh2Phase('ESCAPED');
            ch2PhaseRef.current = 'ESCAPED';
          }

          // Update Chapter 2 Stalking Entity AI
          if (activeModal === 'NONE' && phase === 'ACTIVE' && ent.state !== 'dormant') {
            const distToPlayer = Math.hypot(p.x - ent.x, p.y - ent.y);
            const proximity = Math.max(0, 1 - distToPlayer / 780);

            if (ent.smashCooldown > 0) ent.smashCooldown = Math.max(0, ent.smashCooldown - dt);

            // Distinct heavy ragged breathing scaled by distance
            ent.breathTimer -= dt;
            if (ent.breathTimer <= 0) {
              ent.breathTimer = ent.state === 'chase' ? 0.82 : 1.45;
              const breathVol = ent.state === 'chase' ? Math.min(1, proximity + 0.3) : proximity;
              soundEngine.playEntityBreath(breathVol);
            }

            if (ent.state === 'wander') {
              const detectRange = ch2PhoneFlashOnRef.current ? 315 : 210;
              const spotted =
                (distToPlayer < detectRange || distToPlayer < 75) &&
                hasLineOfSight(ent.x, ent.y, p.x, p.y, solids);

              if (spotted) {
                ent.state = 'chase';
                ent.roarWindup = 0.72;
                ent.lostSightTimer = 0;
                ent.lastKnownX = p.x;
                ent.lastKnownY = p.y;
                setCh2EntityState('chase');
                setActiveDialogue(null);
                // Re-enable intense chase soundtrack!
                soundEngine.setAmbienceMode('chase');
                soundEngine.playEntityRoar();
                p.shakeTimer = Math.max(p.shakeTimer, 0.6);
                rumbleRef.current(420, 0.9, 0.95);
              } else {
                if (ent.pauseTimer > 0) {
                  ent.pauseTimer = Math.max(0, ent.pauseTimer - dt);
                  ent.walkFrame = 0;
                } else {
                  const targetNode = CH2_ROAM_NODES[ent.roamTargetIdx % CH2_ROAM_NODES.length];
                  const dx = targetNode.x - ent.x;
                  const dy = targetNode.y - ent.y;
                  const d = Math.hypot(dx, dy);
                  if (d > 6) {
                    const wanderSpeed = 56 * dt;
                    const stepEx = (dx / d) * wanderSpeed;
                    const stepEy = (dy / d) * wanderSpeed;
                    if (!collidesWithSolids(ent.x + stepEx, ent.y, 9, solids)) {
                      ent.x += stepEx;
                    }
                    if (!collidesWithSolids(ent.x, ent.y + stepEy, 9, solids)) {
                      ent.y += stepEy;
                    }
                    ent.dir =
                      Math.abs(dx) > Math.abs(dy)
                        ? dx > 0
                          ? 'right'
                          : 'left'
                        : dy > 0
                        ? 'down'
                        : 'up';
                    ent.walkFrame += dt * 7;
                    ent.stepTimer -= dt;
                    if (ent.stepTimer <= 0) {
                      ent.stepTimer = 0.48;
                      soundEngine.playEntityFootstep(proximity * 0.65);
                    }
                  } else {
                    ent.roamTargetIdx = (ent.roamTargetIdx + 1) % CH2_ROAM_NODES.length;
                    ent.pauseTimer = 1.4;
                    ent.walkFrame = 0;
                  }
                }
              }
            } else if (ent.state === 'chase') {
              if (ent.roarWindup > 0) {
                ent.roarWindup = Math.max(0, ent.roarWindup - dt);
                ent.walkFrame += dt * 14;
                const dx = p.x - ent.x;
                const dy = p.y - ent.y;
                ent.dir =
                  Math.abs(dx) > Math.abs(dy)
                    ? dx > 0
                      ? 'right'
                      : 'left'
                    : dy > 0
                    ? 'down'
                    : 'up';
              } else {
                const seesPlayer = hasLineOfSight(ent.x, ent.y, p.x, p.y, solids);
                if (seesPlayer || distToPlayer < 240) {
                  ent.lastKnownX = p.x;
                  ent.lastKnownY = p.y;
                  ent.lostSightTimer = 0;
                } else {
                  ent.lostSightTimer += dt;
                  if (ent.lostSightTimer > 14) {
                    ent.state = 'wander';
                    setCh2EntityState('wander');
                    soundEngine.setAmbienceMode('off');
                  }
                }

                const gx = ent.lastKnownX;
                const gy = ent.lastKnownY;
                const dx = gx - ent.x;
                const dy = gy - ent.y;
                const d = Math.hypot(dx, dy);

                if (d > 2) {
                  // Faster than player sprint (124 vs 114), dips briefly right after smashing a shelf
                  const chaseSpeed = (ent.smashCooldown > 0 ? 58 : 124) * dt;
                  const vx = (dx / d) * chaseSpeed;
                  const vy = (dy / d) * chaseSpeed;

                  const tryAxis = (nx: number, ny: number): boolean => {
                    const hit = findBlockingSolid(nx, ny, 10, solids);
                    if (!hit) return true;
                    if (hit.breakable) {
                      hit.broken = true;
                      ch2DebrisRef.current.push(...spawnBreakDebris(hit));
                      ent.smashCooldown = 0.42;
                      p.shakeTimer = Math.max(p.shakeTimer, 0.35);
                      soundEngine.playShelfSmash();
                      rumbleRef.current(220, 0.65, 0.75);
                      return true;
                    }
                    return false;
                  };

                  const nextEx = clamp(ent.x + vx, 48, WORLD_W - 48);
                  const movedX = tryAxis(nextEx, ent.y);
                  if (movedX) ent.x = nextEx;

                  const nextEy = clamp(ent.y + vy, 56, WORLD_H - 42);
                  const movedY = tryAxis(ent.x, nextEy);
                  if (movedY) ent.y = nextEy;

                  // Slight slide assist if grazing an unbreakable wall corner
                  if (!movedX && Math.abs(vy) < chaseSpeed * 0.4) {
                    const slideY = clamp(ent.y + (dy >= 0 ? 1 : -1) * chaseSpeed * 0.85, 56, WORLD_H - 42);
                    if (tryAxis(ent.x, slideY)) ent.y = slideY;
                  }
                  if (!movedY && Math.abs(vx) < chaseSpeed * 0.4) {
                    const slideX = clamp(ent.x + (dx >= 0 ? 1 : -1) * chaseSpeed * 0.85, 48, WORLD_W - 48);
                    if (tryAxis(slideX, ent.y)) ent.x = slideX;
                  }

                  ent.dir =
                    Math.abs(dx) > Math.abs(dy)
                      ? dx > 0
                        ? 'right'
                        : 'left'
                      : dy > 0
                      ? 'down'
                      : 'up';
                  ent.walkFrame += dt * 16;
                  ent.stepTimer -= dt;
                  if (ent.stepTimer <= 0) {
                    ent.stepTimer = 0.24;
                    soundEngine.playEntityFootstep(proximity);
                  }
                }

                // Caught by the Entity
                if (distToPlayer < 17) {
                  soundEngine.playScreamer();
                  soundEngine.setAmbienceMode('blackout');
                  rumbleRef.current(600, 1.0, 1.0);
                  setActiveDialogue(null);
                  setEndingFocusIdx(0);
                  setCh2Phase('CAUGHT');
                  ch2PhaseRef.current = 'CAUGHT';
                }
              }
            }
          }

          // Find nearest inspectable target in Chapter 2
          let foundTarget: NearbyTarget | null = null;
          let foundPrompt: string | null = null;
          let bestDist = Infinity;

          for (const spot of CH2_INSPECTABLE_SPOTS) {
            const radius = spot.radius ?? 36;
            const dSpot = Math.hypot(p.x - spot.x, p.y - spot.y);
            if (dSpot < radius && dSpot < bestDist) {
              bestDist = dSpot;
              foundTarget = { kind: 'spot', spot };
              foundPrompt =
                spot.id === 'staff_door' && ent.state !== 'dormant'
                  ? 'Убежать в подсобку!'
                  : spot.prompt;
            }
          }

          nearbyTargetRef.current = foundTarget;
          setNearbyPrompt((prev) => (prev === foundPrompt ? prev : foundPrompt));

          // Camera follow
          const targetCamX = clamp(p.x - PIXEL_W / 2, 0, WORLD_W - PIXEL_W);
          const targetCamY = clamp(p.y - PIXEL_H / 2, 0, WORLD_H - PIXEL_H);
          const lerp = 1 - Math.pow(0.001, dt);
          cameraRef.current.x += (targetCamX - cameraRef.current.x) * lerp;
          cameraRef.current.y += (targetCamY - cameraRef.current.y) * lerp;

          const dEntNow = ent.state !== 'dormant' ? Math.hypot(p.x - ent.x, p.y - ent.y) : 9999;
          const chaseShake =
            ent.state === 'chase' && dEntNow < 260 ? Math.max(0, (1 - dEntNow / 260) * 3.2) : 0;
          const shakeMag = Math.max(p.shakeTimer > 0 ? p.shakeTimer * 10 : 0, chaseShake);
          const shakeX = shakeMag > 0 ? (Math.random() - 0.5) * shakeMag : 0;
          const shakeY = shakeMag > 0 ? (Math.random() - 0.5) * shakeMag : 0;

          // Subtle phone flash flicker when the Entity gets dangerously close
          let flashFlicker = 1;
          if (ent.state !== 'dormant') {
            const dEnt = Math.hypot(p.x - ent.x, p.y - ent.y);
            if (dEnt < 280 && Math.sin(t * 42) > 0.72) {
              flashFlicker = 0.55;
            }
          }

          marketRenderer.render(canvas, {
            time: t,
            brightness: settings.brightness,
            flickerEnabled: settings.flickerEffect,
            blackout: true,
            chapter: 2,
            cameraX: cameraRef.current.x,
            cameraY: cameraRef.current.y,
            shakeX,
            shakeY,
            playerX: p.x,
            playerY: p.y,
            playerDir: p.dir,
            walkFrame: p.walkFrame,
            items: [],
            npcs: [],
            nearbyPos: foundTarget && foundTarget.kind === 'spot' ? foundTarget.spot : null,
            exitLocked: true,
            solids,
            debris: ch2DebrisRef.current,
            phoneFlash: {
              on: ch2PhoneFlashOnRef.current,
              angle: ch2FlashAngleRef.current,
              flicker: flashFlicker,
            },
            entity:
              ent.state !== 'dormant'
                ? {
                    active: true,
                    x: ent.x,
                    y: ent.y,
                    dir: ent.dir,
                    walkFrame: ent.walkFrame,
                    chasing: ent.state === 'chase',
                  }
                : null,
          });
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [
    activeDialogue,
    activeModal,
    aimRef,
    audioUnlocked,
    enterTitleMenu,
    movementRef,
    screenMode,
    settings.brightness,
    settings.flickerEffect,
    startChapterOne,
  ]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050608]">
      {/* Live 2D Top-Down Pixel Art Canvas */}
      <canvas
        ref={canvasRef}
        width={PIXEL_W}
        height={PIXEL_H}
        className={`absolute inset-0 w-full h-full pixel-canvas ${
          screenMode === 'CHAPTER_1' || screenMode === 'CHAPTER_2'
            ? 'object-contain'
            : 'object-cover'
        }`}
      />

      {/* Full-bleed menu contrast scrim */}
      {screenMode === 'TITLE_MENU' && (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#090B0E]/92 via-[#090B0E]/55 to-transparent"
          aria-hidden="true"
        />
      )}

      {/* Subtle Vignette */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(5,6,8,0.75)_100%)]"
        aria-hidden="true"
      />

      {/* Optional Atmospheric Post-FX */}
      {settings.scanlines && (
        <div
          className="pointer-events-none absolute inset-0 crt-scanlines opacity-35"
          aria-hidden="true"
        />
      )}
      {settings.filmGrain && (
        <div
          className="pointer-events-none absolute inset-0 film-grain opacity-75"
          aria-hidden="true"
        />
      )}

      {/* Auto-Scaled 1280x720 Virtual UI Stage */}
      <ScaledViewport>
        {(screenMode === 'TITLE_MENU' || screenMode === 'CALIBRATION') &&
          activeModal === 'NONE' && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiMove();
                toggleFullscreen();
              }}
              aria-label={isFullscreen ? 'Выйти из полного экрана' : 'На весь экран'}
              title={isFullscreen ? 'Выйти из полного экрана' : 'На весь экран'}
              className="absolute top-7 right-7 z-30 p-2.5 rounded-sm bg-[#0E1217]/75 border border-white/10 text-white/70 hover:text-white hover:border-white/50 transition-colors cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          )}

        {screenMode === 'CALIBRATION' && (
          <CalibrationStep
            settings={settings}
            snapshot={snapshot}
            step={calibrationStep}
            focusIndex={calibrationFocusIdx}
            onStepChange={setCalibrationStep}
            onFocusIndex={setCalibrationFocusIdx}
            onUpdateSettings={updateSettings}
            onTestSound={() => soundEngine.playAudioCalibrationTest()}
            onContinue={startBootSplash}
          />
        )}

        {screenMode === 'BOOT_SPLASH' && (
          <BootSplash
            settings={settings}
            elapsed={bootElapsed}
            onSkip={enterTitleMenu}
          />
        )}

        {screenMode === 'INTRO' && (
          <IntroSequence
            settings={settings}
            elapsed={introElapsed}
            onSkip={startChapterOne}
          />
        )}

        {screenMode === 'TITLE_MENU' && (
          <TitleMenu
            settings={settings}
            selectedIndex={selectedMenuIdx}
            activeModal={activeModal}
            onSelectIndex={(idx) => {
              if (idx !== selectedMenuIdx) {
                soundEngine.playUiMove();
                setSelectedMenuIdx(idx);
              }
            }}
            onActivateItem={activateMenuItem}
            audioUnlocked={audioUnlocked}
            onUnlockAudio={() => unlockAudio('outside')}
          />
        )}

        {screenMode === 'CHAPTER_1' && (
          <ChapterOneHud
            settings={settings}
            phase={chapterPhase}
            chapterElapsed={chapterElapsed}
            items={items}
            nearbyPrompt={nearbyPrompt}
            activeDialogue={activeDialogue}
            endingFocusIdx={endingFocusIdx}
            onSelectEndingFocus={setEndingFocusIdx}
            onActivateEnding={activateEndingItem}
            onDismissDialogue={() => setActiveDialogue(null)}
          />
        )}

        {screenMode === 'CHAPTER_2' && (
          <ChapterTwoHud
            settings={settings}
            phase={ch2Phase}
            entityState={ch2EntityState}
            chapterElapsed={chapterElapsed}
            screamerFlash={screamerFlash}
            nearbyPrompt={nearbyPrompt}
            activeDialogue={activeDialogue}
            endingFocusIdx={endingFocusIdx}
            onSelectEndingFocus={setEndingFocusIdx}
            onActivateEnding={activateCh2EndingItem}
            onDismissDialogue={() => setActiveDialogue(null)}
          />
        )}

        {activeModal === 'PAUSE' && (
          <PauseModal
            settings={settings}
            focusIndex={pauseFocusIdx}
            onSelectIndex={(idx) => {
              if (idx !== pauseFocusIdx) {
                soundEngine.playUiMove();
                setPauseFocusIdx(idx);
              }
            }}
            onActivate={activatePauseItem}
          />
        )}

        {activeModal === 'GAMEPAD' && (
          <GamepadSetupModal
            settings={settings}
            snapshot={snapshot}
            focusIndex={gamepadFocusIdx}
            onFocusIndex={setGamepadFocusIdx}
            onUpdateSettings={updateSettings}
            onRumbleTest={() => rumbleRef.current(180, 0.45, 0.35)}
            onClose={closeModal}
          />
        )}

        {activeModal === 'SETTINGS' && (
          <SettingsModal
            settings={settings}
            isFullscreen={isFullscreen}
            focusIndex={settingsFocusIdx}
            fullscreenNote={fullscreenNote}
            onFocusIndex={setSettingsFocusIdx}
            onToggleFullscreen={toggleFullscreen}
            onUpdateSettings={updateSettings}
            onClose={closeModal}
          />
        )}

        {activeModal === 'CHAPTERS' && (
          <ChaptersModal
            settings={settings}
            focusIndex={chaptersFocusIdx}
            onFocusIndex={setChaptersFocusIdx}
            onStartChapter={(id) => {
              setActiveModal('NONE');
              if (id === 2) startChapterTwo();
              else startChapterOne();
            }}
            onClose={closeModal}
          />
        )}
      </ScaledViewport>
    </div>
  );
}
