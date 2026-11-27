import { useCallback, useEffect, useRef, useState } from 'react';
import { GamepadLayout, GamepadSnapshot } from '../types/game';

export type NavAction =
  | 'UP'
  | 'DOWN'
  | 'LEFT'
  | 'RIGHT'
  | 'CONFIRM'
  | 'CANCEL'
  | 'INTERACT'
  | 'FLASHLIGHT'
  | 'PAUSE';

interface UseGamepadOptions {
  layout: GamepadLayout;
  deadzone: number;
  vibrationEnabled: boolean;
  keyboardAssist: boolean;
  onAction?: (action: NavAction) => void;
}

const EMPTY_BUTTONS = new Array(17).fill(false);

export function useGamepad({
  layout,
  deadzone,
  vibrationEnabled,
  keyboardAssist,
  onAction,
}: UseGamepadOptions) {
  const [snapshot, setSnapshot] = useState<GamepadSnapshot>({
    connected: false,
    id: null,
    index: null,
    axes: [0, 0, 0, 0],
    buttons: EMPTY_BUTTONS,
    lastInputSource: 'gamepad',
  });

  // Live continuous movement vector & right-stick phone flash aim vector
  const movementRef = useRef<{ x: number; y: number; sprint: boolean }>({
    x: 0,
    y: 0,
    sprint: false,
  });
  const aimRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  const actionHandlerRef = useRef(onAction);
  actionHandlerRef.current = onAction;

  const keysHeldRef = useRef<Set<string>>(new Set());
  const prevButtonsRef = useRef<boolean[]>(new Array(17).fill(false));
  const dirRepeatRef = useRef<{ dir: NavAction | null; nextTime: number }>({
    dir: null,
    nextTime: 0,
  });

  const rumble = useCallback(
    (durationMs = 80, weak = 0.25, strong = 0.15) => {
      if (!vibrationEnabled) return;
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const pad of pads) {
        if (pad && pad.connected && pad.vibrationActuator) {
          pad.vibrationActuator
            .playEffect('dual-rumble', {
              startDelay: 0,
              duration: durationMs,
              weakMagnitude: weak,
              strongMagnitude: strong,
            })
            .catch(() => {});
          break;
        }
      }
    },
    [vibrationEnabled]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!keyboardAssist) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      keysHeldRef.current.add(e.code);

      const fire = (act: NavAction) => {
        setSnapshot((prev) =>
          prev.lastInputSource === 'keyboard'
            ? prev
            : { ...prev, lastInputSource: 'keyboard' }
        );
        actionHandlerRef.current?.(act);
      };

      if (!e.repeat) {
        if (e.code === 'ArrowUp' || e.code === 'KeyW') fire('UP');
        else if (e.code === 'ArrowDown' || e.code === 'KeyS') fire('DOWN');
        else if (e.code === 'ArrowLeft' || e.code === 'KeyA') fire('LEFT');
        else if (e.code === 'ArrowRight' || e.code === 'KeyD') fire('RIGHT');
        else if (e.code === 'Enter' || e.code === 'Space') fire('CONFIRM');
        else if (e.code === 'KeyE') fire('INTERACT');
        else if (e.code === 'KeyF') fire('FLASHLIGHT');
        else if (e.code === 'Escape' || e.code === 'Backspace') fire('CANCEL');
      } else {
        if (e.code === 'ArrowUp' || e.code === 'KeyW') fire('UP');
        else if (e.code === 'ArrowDown' || e.code === 'KeyS') fire('DOWN');
        else if (e.code === 'ArrowLeft' || e.code === 'KeyA') fire('LEFT');
        else if (e.code === 'ArrowRight' || e.code === 'KeyD') fire('RIGHT');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysHeldRef.current.delete(e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [keyboardAssist]);

  useEffect(() => {
    let rafId = 0;
    let lastSnapshotTime = 0;

    const applyDeadzone = (val: number) => {
      if (Math.abs(val) < deadzone) return 0;
      const sign = Math.sign(val);
      return sign * ((Math.abs(val) - deadzone) / (1 - deadzone));
    };

    const poll = (now: number) => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      let activePad: Gamepad | null = null;
      for (const p of pads) {
        if (p && p.connected) {
          activePad = p;
          break;
        }
      }

      if (activePad) {
        const lx = applyDeadzone(activePad.axes[0] ?? 0);
        const ly = applyDeadzone(activePad.axes[1] ?? 0);
        const rx = applyDeadzone(activePad.axes[2] ?? 0);
        const ry = applyDeadzone(activePad.axes[3] ?? 0);

        const buttons = Array.from({ length: 17 }, (_, i) =>
          Boolean(activePad?.buttons[i]?.pressed)
        );

        // Edge detection for face & shoulder buttons
        const prev = prevButtonsRef.current;
        const justPressed = (idx: number) => buttons[idx] && !prev[idx];

        const confirmBtn = layout === 'nintendo' ? 1 : 0;
        const cancelBtn = layout === 'nintendo' ? 0 : 1;

        const aimActive = Math.hypot(rx, ry) > 0.12;
        aimRef.current = { x: rx, y: ry, active: aimActive };

        let hadGamepadActivity =
          Math.abs(lx) > 0.1 ||
          Math.abs(ly) > 0.1 ||
          aimActive ||
          buttons.some((b) => b);

        if (justPressed(confirmBtn)) actionHandlerRef.current?.('CONFIRM');
        if (justPressed(cancelBtn)) actionHandlerRef.current?.('CANCEL');
        if (justPressed(2)) actionHandlerRef.current?.('INTERACT');
        if (justPressed(3)) actionHandlerRef.current?.('FLASHLIGHT');
        if (justPressed(9)) actionHandlerRef.current?.('PAUSE');

        // Directional navigation (D-Pad + Left Stick) with repeat delay
        let currentDir: NavAction | null = null;
        if (buttons[12] || ly < -0.55) currentDir = 'UP';
        else if (buttons[13] || ly > 0.55) currentDir = 'DOWN';
        else if (buttons[14] || lx < -0.55) currentDir = 'LEFT';
        else if (buttons[15] || lx > 0.55) currentDir = 'RIGHT';

        if (currentDir) {
          if (dirRepeatRef.current.dir !== currentDir) {
            actionHandlerRef.current?.(currentDir);
            dirRepeatRef.current = { dir: currentDir, nextTime: now + 260 };
          } else if (now >= dirRepeatRef.current.nextTime) {
            actionHandlerRef.current?.(currentDir);
            dirRepeatRef.current.nextTime = now + 110;
          }
        } else {
          dirRepeatRef.current = { dir: null, nextTime: 0 };
        }

        prevButtonsRef.current = buttons;

        // Movement vector combines stick + dpad (+ keyboard assist if active)
        let mx = lx;
        let my = ly;
        if (mx === 0 && my === 0) {
          if (buttons[14]) mx -= 1;
          if (buttons[15]) mx += 1;
          if (buttons[12]) my -= 1;
          if (buttons[13]) my += 1;
        }
        const sprint = Boolean(buttons[6] || buttons[7] || buttons[10] || buttons[4]);
        movementRef.current = { x: mx, y: my, sprint };

        // Throttle React state updates (~30fps for UI visualizer, zero lag for movementRef)
        if (now - lastSnapshotTime > 32) {
          lastSnapshotTime = now;
          setSnapshot((prevSnap) => ({
            connected: true,
            id: activePad?.id ?? null,
            index: activePad?.index ?? null,
            axes: [lx, ly, rx, ry],
            buttons,
            lastInputSource: hadGamepadActivity ? 'gamepad' : prevSnap.lastInputSource,
          }));
        }
      } else {
        // No physical gamepad connected: compute keyboard assist movement vector
        let kx = 0;
        let ky = 0;
        const held = keysHeldRef.current;
        if (keyboardAssist) {
          if (held.has('ArrowLeft') || held.has('KeyA')) kx -= 1;
          if (held.has('ArrowRight') || held.has('KeyD')) kx += 1;
          if (held.has('ArrowUp') || held.has('KeyW')) ky -= 1;
          if (held.has('ArrowDown') || held.has('KeyS')) ky += 1;
          if (kx !== 0 && ky !== 0) {
            const inv = 1 / Math.SQRT2;
            kx *= inv;
            ky *= inv;
          }
        }
        movementRef.current = {
          x: kx,
          y: ky,
          sprint: held.has('ShiftLeft') || held.has('ShiftRight'),
        };

        let ax = 0;
        let ay = 0;
        if (keyboardAssist) {
          if (held.has('KeyJ')) ax -= 1;
          if (held.has('KeyL')) ax += 1;
          if (held.has('KeyI')) ay -= 1;
          if (held.has('KeyK')) ay += 1;
        }
        aimRef.current = {
          x: ax,
          y: ay,
          active: ax !== 0 || ay !== 0,
        };

        if (now - lastSnapshotTime > 120) {
          lastSnapshotTime = now;
          setSnapshot((prevSnap) => {
            if (!prevSnap.connected) return prevSnap;
            return {
              connected: false,
              id: null,
              index: null,
              axes: [0, 0, 0, 0],
              buttons: EMPTY_BUTTONS,
              lastInputSource: 'keyboard',
            };
          });
        }
      }

      rafId = requestAnimationFrame(poll);
    };

    rafId = requestAnimationFrame(poll);

    const onConnect = () => {
      rumble(120, 0.3, 0.2);
    };
    window.addEventListener('gamepadconnected', onConnect);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('gamepadconnected', onConnect);
    };
  }, [deadzone, keyboardAssist, layout, rumble]);

  return { snapshot, movementRef, aimRef, rumble };
}
