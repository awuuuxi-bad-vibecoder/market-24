import { PIXEL_H, PIXEL_W } from './pixelRenderer';
import {
  AISLE_SIGNS,
  MASK_POS,
  NpcShopper,
  SolidRect,
  STAFF_DOOR_POS,
  STORE_LIGHTS,
  STORE_SOLIDS,
  StoreItem,
  WORLD_H,
  WORLD_W,
} from '../game/chapter1Data';

export interface HypermarketRenderState {
  time: number;
  brightness: number;
  flickerEnabled: boolean;
  blackout: boolean;
  chapter?: 1 | 2;
  cameraX: number;
  cameraY: number;
  shakeX: number;
  shakeY: number;
  playerX: number;
  playerY: number;
  playerDir: 'up' | 'down' | 'left' | 'right';
  walkFrame: number;
  items: StoreItem[];
  npcs: NpcShopper[];
  nearbyPos: { x: number; y: number } | null;
  exitLocked: boolean;
  solids?: Array<SolidRect & { broken?: boolean }>;
  debris?: Array<{ x: number; y: number; w: number; h: number; color: string }>;
  phoneFlash?: { on: boolean; angle: number; flicker?: number };
  entity?: {
    active: boolean;
    x: number;
    y: number;
    dir: 'up' | 'down' | 'left' | 'right';
    walkFrame: number;
    chasing: boolean;
  } | null;
}

export class HypermarketRenderer {
  private buffer: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lightCanvas: HTMLCanvasElement;
  private lightCtx: CanvasRenderingContext2D;
  private coneCanvas: HTMLCanvasElement;
  private coneCtx: CanvasRenderingContext2D;
  private floorPattern: CanvasPattern | null = null;

  constructor() {
    this.buffer = document.createElement('canvas');
    this.buffer.width = PIXEL_W;
    this.buffer.height = PIXEL_H;
    this.ctx = this.buffer.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;

    this.lightCanvas = document.createElement('canvas');
    this.lightCanvas.width = PIXEL_W;
    this.lightCanvas.height = PIXEL_H;
    this.lightCtx = this.lightCanvas.getContext('2d')!;
    this.lightCtx.imageSmoothingEnabled = false;

    this.coneCanvas = document.createElement('canvas');
    this.coneCanvas.width = PIXEL_W;
    this.coneCanvas.height = PIXEL_H;
    this.coneCtx = this.coneCanvas.getContext('2d')!;
    this.coneCtx.imageSmoothingEnabled = true;

    this.buildFloorPattern();
  }

  private buildFloorPattern(): void {
    const p = document.createElement('canvas');
    p.width = 24;
    p.height = 24;
    const pCtx = p.getContext('2d')!;
    pCtx.fillStyle = '#252E32';
    pCtx.fillRect(0, 0, 12, 12);
    pCtx.fillRect(12, 12, 12, 12);
    pCtx.fillStyle = '#1E2529';
    pCtx.fillRect(12, 0, 12, 12);
    pCtx.fillRect(0, 12, 12, 12);
    // Tile grout lines + subtle specular highlight
    pCtx.fillStyle = '#161C20';
    pCtx.fillRect(0, 0, 24, 1);
    pCtx.fillRect(0, 12, 24, 1);
    pCtx.fillRect(0, 0, 1, 24);
    pCtx.fillRect(12, 0, 1, 24);
    pCtx.fillStyle = '#2E393F';
    pCtx.fillRect(2, 2, 2, 1);
    pCtx.fillRect(14, 14, 2, 1);
    this.floorPattern = this.ctx.createPattern(p, 'repeat');
  }

  private computeFlicker(time: number, enabled: boolean, seed = 0): number {
    if (!enabled) return 1.0;
    const wave =
      Math.sin(time * 24 + seed) * 0.5 +
      Math.sin(time * 59 + seed * 3) * 0.3 +
      Math.sin(time * 6.7) * 0.2;
    if (wave > 0.89) return 0.36;
    if (wave > 0.8) return 0.72;
    return 1.0;
  }

  public render(target: HTMLCanvasElement, state: HypermarketRenderState): void {
    const ctx = this.ctx;
    const camX = Math.round(state.cameraX + state.shakeX);
    const camY = Math.round(state.cameraY + state.shakeY);

    ctx.save();
    ctx.clearRect(0, 0, PIXEL_W, PIXEL_H);
    ctx.translate(-camX, -camY);

    // 1. Tiled Hypermarket Floor
    if (this.floorPattern) {
      ctx.fillStyle = this.floorPattern;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    } else {
      ctx.fillStyle = '#222A2E';
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }

    // Department Floor Zones
    // Bakery warm wood-laminate floor + subtle flour specks (Southwest)
    ctx.fillStyle = '#2C231C';
    ctx.fillRect(42, 510, 260, 215);
    ctx.fillStyle = '#231B15';
    for (let by = 514; by < 722; by += 8) {
      ctx.fillRect(42, by, 260, 1);
    }
    ctx.fillStyle = 'rgba(235, 222, 195, 0.14)';
    ctx.fillRect(192, 560, 3, 2);
    ctx.fillRect(204, 610, 4, 2);
    ctx.fillRect(188, 650, 2, 2);

    // Produce dark green rubber mat tiles (West-Center)
    ctx.fillStyle = '#1D2922';
    ctx.fillRect(58, 150, 200, 225);
    ctx.fillStyle = '#24342B';
    ctx.fillRect(62, 154, 192, 2);

    // Frozen aisle cooler tiled floor + subtle frost corner trim
    ctx.fillStyle = '#1D2930';
    ctx.fillRect(655, 165, 270, 520);
    ctx.fillStyle = '#263944';
    ctx.fillRect(655, 165, 270, 2);
    ctx.fillRect(655, 683, 270, 2);

    // Staff-only floor zone (East)
    ctx.fillStyle = '#1A2026';
    ctx.fillRect(1425, 225, 215, 225);
    // Yellow-black hazard stripe in front of staff door
    for (let sy = 310; sy < 376; sy += 6) {
      ctx.fillStyle = (sy / 6) % 2 === 0 ? '#A87F2D' : '#181C22';
      ctx.fillRect(1488, sy, 12, 6);
    }

    // Subtle painted walkway guidance lines along main cross-aisle & checkout lane
    ctx.fillStyle = '#2D383F';
    ctx.fillRect(310, 390, 1080, 2);
    ctx.fillRect(310, 446, 1080, 2);
    ctx.fillStyle = '#263137';
    for (let lx = 210; lx < 1180; lx += 28) {
      ctx.fillRect(lx, 754, 14, 2);
    }

    // Subtle rotating ceiling fan shadow crosses on floor in main hall
    if (!state.blackout) {
      this.drawCeilingFanShadow(ctx, 445, 550, state.time);
      this.drawCeilingFanShadow(ctx, 1045, 280, state.time + 1.4);
    }

    // Stormy wet asphalt & rain streaks visible outside South Glass Entrance (x = 770..910, y = 1106..1140)
    this.drawEntranceExteriorAndDoors(ctx, state);

    // Rich floor & wall details (wet puddle, mop bucket, fallen box, scales, breaker, price checker, boards)
    this.drawFloorAndWallDetails(ctx, state.time, state.blackout, state.chapter ?? 1);

    const activeSolids: Array<SolidRect & { broken?: boolean }> = state.solids ?? STORE_SOLIDS;

    // 2. Drop shadows, Wrecked shelf outlines & Solid Furniture
    for (const s of activeSolids) {
      if (s.broken) {
        ctx.fillStyle = 'rgba(10, 12, 16, 0.55)';
        ctx.fillRect(s.x + 2, s.y + 2, s.w - 4, s.h - 4);
        ctx.fillStyle = '#2A221B';
        ctx.fillRect(s.x, s.y, s.w, 2);
        ctx.fillRect(s.x, s.y + s.h - 2, s.w, 2);
      } else if (s.kind !== 'wall') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.fillRect(s.x + 3, s.y + 4, s.w, s.h);
      }
    }
    for (const s of activeSolids) {
      if (!s.broken) {
        this.drawSolid(ctx, s, state.time, state.blackout);
      }
    }

    // Scattered debris from Entity-smashed shelves & decorations
    if (state.debris && state.debris.length > 0) {
      for (const d of state.debris) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(d.x + 1, d.y + 1, d.w, d.h);
        ctx.fillStyle = d.color;
        ctx.fillRect(d.x, d.y, d.w, d.h);
      }
    }

    // Aisle Endcap Numbers (1..6) on intact shelves
    const rowXs = [350, 515, 950, 1125, 1300];
    rowXs.forEach((rx, idx) => {
      const intact = activeSolids.some(
        (s) => !s.broken && s.x === rx && s.y === 465
      );
      if (!intact) return;
      ctx.fillStyle = '#E59A3C';
      ctx.fillRect(rx + 14, 466, 16, 8);
      ctx.fillStyle = '#090B0E';
      ctx.fillRect(rx + 21, 468, 2, 4 + (idx % 2));
    });

    // Mounted Price Checker on Row 2 cross-aisle endcap (x=537, y=370)
    const row2TopIntact = activeSolids.some((s) => !s.broken && s.x === 515 && s.y === 175);
    if (row2TopIntact) {
      ctx.fillStyle = '#252E38';
      ctx.fillRect(531, 367, 12, 8);
      ctx.fillStyle = state.blackout ? '#11161C' : '#65C4D9';
      ctx.fillRect(533, 369, 8, 3);
      if (!state.blackout && Math.sin(state.time * 12) > -0.3) {
        ctx.fillStyle = 'rgba(225, 58, 58, 0.8)';
        ctx.fillRect(534, 373, 6, 1);
      }
    }

    // Staff-only Door lock indicator (Ch1: red locked LED; Ch2: power dead, door seam slightly ajar)
    if (state.chapter === 2) {
      ctx.fillStyle = '#07090C';
      ctx.fillRect(STAFF_DOOR_POS.x + 1, 314, 4, 58);
      ctx.fillStyle = '#2F3A47';
      ctx.fillRect(STAFF_DOOR_POS.x - 1, STAFF_DOOR_POS.y - 4, 3, 6);
    } else {
      ctx.fillStyle = '#E03E3E';
      ctx.fillRect(STAFF_DOOR_POS.x - 1, STAFF_DOOR_POS.y - 4, 3, 6);
    }

    // Fire extinguisher cabinet next to staff door (x=1501, y=276)
    ctx.fillStyle = '#8F2626';
    ctx.fillRect(1498, 272, 7, 14);
    ctx.fillStyle = '#D94444';
    ctx.fillRect(1499, 274, 5, 10);

    // Electrical Breaker Panel (x=1497, y=185)
    ctx.fillStyle = '#2A333D';
    ctx.fillRect(1496, 182, 10, 26);
    ctx.fillStyle = state.chapter === 2 ? '#161B21' : '#4B5766';
    ctx.fillRect(1497, 184, 7, 22);
    ctx.fillStyle = state.chapter === 2 ? '#4D3816' : '#E5A832';
    ctx.fillRect(1498, 191, 4, 4);
    if (!state.blackout && state.flickerEnabled && Math.sin(state.time * 31) > 0.94) {
      ctx.fillStyle = '#FFF3B0';
      ctx.fillRect(1494, 193, 2, 2);
    }

    // 3. Department Overhead / Wall Signs & Digital Store Clock
    if (!state.blackout) {
      this.drawSigns(ctx);
      this.drawWallClock(ctx, state.time);
    }

    // 4. The Suspicious Mask on the floor near the Staff Door (taken in Chapter 2!)
    if (state.chapter !== 2) {
      this.drawMaskProp(ctx, MASK_POS.x, MASK_POS.y, state.time);
    }

    // 5. Collectible Products on Shelves
    for (const item of state.items) {
      if (!item.collected) {
        this.drawCollectibleItem(ctx, item, state.time);
      }
    }

    // 6. NPCs (with baskets, staff vests, phone glow & idle breathing)
    for (const npc of state.npcs) {
      this.drawPersonSprite(
        ctx,
        Math.round(npc.x),
        Math.round(npc.y),
        npc.dir,
        npc.walkFrame,
        npc.shirtColor,
        npc.hairColor,
        state.time,
        {
          hasBasket: npc.hasBasket,
          isStaff: npc.isStaff,
          phoneGlow: npc.phoneGlow && !state.blackout,
        }
      );
    }

    // 7. Player Character
    this.drawPersonSprite(
      ctx,
      Math.round(state.playerX),
      Math.round(state.playerY),
      state.playerDir,
      state.walkFrame,
      '#354642',
      '#1A191E',
      state.time
    );

    // 7b. Chapter 2 Stalking Entity (masked, tall, hunched figure)
    if (state.entity?.active) {
      this.drawEntitySprite(
        ctx,
        Math.round(state.entity.x),
        Math.round(state.entity.y),
        state.entity.dir,
        state.entity.walkFrame,
        state.entity.chasing,
        state.time
      );
    }

    // 8. Living Atmospheric Particles (cold freezer mist, dust motes, ceiling promo banners)
    if (!state.blackout) {
      this.drawAmbientParticles(ctx, state.time, camX, camY);
      this.drawCeilingPromoBanners(ctx, state.time);
    }

    // 9. Interact Arrow Indicator
    if (state.nearbyPos && (!state.blackout || state.chapter === 2)) {
      const pulse = Math.sin(state.time * 6) > 0 ? 1 : 0;
      const ix = Math.round(state.nearbyPos.x);
      const iy = Math.round(state.nearbyPos.y) - 18 - pulse;
      ctx.fillStyle = '#090B0E';
      ctx.fillRect(ix - 3, iy - 1, 6, 5);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(ix - 2, iy, 4, 2);
      ctx.fillRect(ix - 1, iy + 2, 2, 2);
    }

    ctx.restore();

    // 10. Juicy Dynamic 2D Hypermarket Lighting + Additive Bloom / Chapter 2 Phone Flash
    this.applyLighting(state, camX, camY);

    // Blit buffer cleanly to visible canvas
    const tCtx = target.getContext('2d');
    if (tCtx) {
      tCtx.imageSmoothingEnabled = false;
      tCtx.clearRect(0, 0, target.width, target.height);
      tCtx.drawImage(this.buffer, 0, 0, target.width, target.height);
    }
  }

  private drawCeilingFanShadow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    t: number
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 1.15);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fillRect(-34, -3, 68, 6);
    ctx.fillRect(-3, -34, 6, 68);
    ctx.restore();
  }

  private drawEntranceExteriorAndDoors(
    ctx: CanvasRenderingContext2D,
    state: HypermarketRenderState
  ): void {
    // Exterior dark rainy asphalt visible outside the entrance doors
    ctx.fillStyle = '#0B0E12';
    ctx.fillRect(770, 1108, 140, 32);

    // Animated rain streaks outside the entrance
    ctx.fillStyle = 'rgba(130, 165, 195, 0.28)';
    for (let i = 0; i < 12; i++) {
      const rx = 776 + ((i * 19 + Math.floor(state.time * 24)) % 128);
      const ry = 1110 + ((i * 11 + Math.floor(state.time * 95)) % 24);
      ctx.fillRect(rx, ry, 1, 5);
    }

    // Welcome mat inside entrance
    ctx.fillStyle = '#161B20';
    ctx.fillRect(780, 1066, 120, 40);
    ctx.fillStyle = '#2A333C';
    ctx.fillRect(786, 1070, 108, 32);

    // Faint wet shoe-print smudges leading inside from the mat
    ctx.fillStyle = 'rgba(115, 155, 175, 0.14)';
    ctx.fillRect(828, 1054, 4, 3);
    ctx.fillRect(838, 1046, 4, 3);
    ctx.fillRect(830, 1036, 4, 3);
    ctx.fillRect(850, 1058, 3, 3);
    ctx.fillRect(856, 1049, 3, 3);

    // Proximity sensor automatic sliding door gap
    const distToExit = Math.hypot(state.playerX - 840, state.playerY - 1090);
    const doorOpenAmount =
      !state.exitLocked && distToExit < 56 ? Math.round((1 - distToExit / 56) * 24) : 0;

    // Door frame top motion sensor LED
    ctx.fillStyle = state.exitLocked
      ? '#C93B3B'
      : doorOpenAmount > 2
      ? '#65C496'
      : '#3E5E4E';
    ctx.fillRect(836, 1102, 8, 3);

    // Left & Right sliding glass panels
    const panelW = 68 - doorOpenAmount;
    ctx.fillStyle = state.exitLocked ? 'rgba(185, 48, 48, 0.35)' : 'rgba(130, 195, 185, 0.32)';
    ctx.fillRect(772, 1106, panelW, 18);
    ctx.fillRect(908 - panelW, 1106, panelW, 18);

    // Metallic door rims
    ctx.fillStyle = state.exitLocked ? '#C93B3B' : '#526475';
    ctx.fillRect(772 + panelW - 2, 1106, 2, 18);
    ctx.fillRect(908 - panelW, 1106, 2, 18);
    if (state.exitLocked) {
      ctx.fillStyle = '#C93B3B';
      ctx.fillRect(772, 1104, 136, 3);
    }
  }

  private drawSigns(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const sign of AISLE_SIGNS) {
      const w = sign.text.length * 5 + 10;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(sign.x - w / 2 + 1, sign.y - 5, w, 12);
      ctx.fillStyle = sign.bg;
      ctx.fillRect(sign.x - w / 2, sign.y - 6, w, 11);
      ctx.fillStyle = sign.fg;
      ctx.fillText(sign.text, sign.x, sign.y);
    }
    ctx.restore();
  }

  private drawWallClock(ctx: CanvasRenderingContext2D, t: number): void {
    // Digital clock mounted above Checkout #2
    const cx = 529;
    const cy = 766;
    ctx.fillStyle = '#12161B';
    ctx.fillRect(cx - 17, cy - 6, 34, 11);
    ctx.fillStyle = '#252E38';
    ctx.fillRect(cx - 16, cy - 5, 32, 9);

    ctx.save();
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#E05A4E';
    const colon = Math.sin(t * 3.14) > 0 ? ':' : ' ';
    ctx.fillText(`02${colon}14`, cx, cy);
    ctx.restore();
  }

  private drawFloorAndWallDetails(
    ctx: CanvasRenderingContext2D,
    t: number,
    blackout: boolean,
    chapter: 1 | 2
  ): void {
    // Bulletin board on West vestibule wall
    ctx.fillStyle = '#3C3226';
    ctx.fillRect(42, 954, 10, 32);
    ctx.fillStyle = '#D9CEB4';
    ctx.fillRect(44, 958, 6, 9);
    ctx.fillStyle = '#D48A42';
    ctx.fillRect(44, 970, 6, 8);

    // Employee of the Month Board on South Wall (x=345, y=1098)
    ctx.fillStyle = '#382B20';
    ctx.fillRect(326, 1097, 38, 9);
    ctx.fillStyle = '#1E2329';
    ctx.fillRect(330, 1099, 8, 5);
    ctx.fillRect(341, 1099, 8, 5);
    ctx.fillRect(352, 1099, 8, 5);
    // Scratched red cross marks inside empty frames
    ctx.fillStyle = '#8F3434';
    ctx.fillRect(333, 1101, 2, 2);
    ctx.fillRect(344, 1101, 2, 2);
    ctx.fillRect(355, 1101, 2, 2);

    // Umbrella stand near South Exit left plant (x=754, y=1074)
    ctx.fillStyle = 'rgba(115, 160, 180, 0.2)';
    ctx.fillRect(748, 1076, 14, 8);
    ctx.fillStyle = '#3D4854';
    ctx.fillRect(751, 1068, 8, 12);
    ctx.fillStyle = '#1B2028';
    ctx.fillRect(753, 1062, 3, 12);
    ctx.fillStyle = '#7C5338';
    ctx.fillRect(753, 1060, 4, 2);

    // Produce electronic scales on island (160, 325)
    ctx.fillStyle = '#2C343D';
    ctx.fillRect(172, 332, 20, 18);
    ctx.fillStyle = blackout ? '#12181B' : '#65C496';
    ctx.fillRect(176, 336, 12, 5);

    // Discount rack sign near North Dairy (925, 96)
    ctx.fillStyle = '#C93B3B';
    ctx.fillRect(910, 96, 30, 8);
    ctx.fillStyle = '#FFE082';
    ctx.fillRect(914, 98, 22, 4);

    // Logbook on closed Checkout #4 (1095, 810)
    ctx.fillStyle = '#D4CBB8';
    ctx.fillRect(1088, 816, 14, 10);
    ctx.fillStyle = '#733838';
    ctx.fillRect(1088, 816, 3, 10);

    // Wet puddle + yellow caution cone + janitor mop bucket in Row 4 walkway
    ctx.fillStyle = 'rgba(130, 175, 190, 0.24)';
    ctx.fillRect(872, 544, 38, 18);
    ctx.fillRect(880, 538, 22, 28);
    ctx.fillStyle = '#E5A832';
    ctx.fillRect(900, 534, 8, 10);
    ctx.fillStyle = '#181B20';
    ctx.fillRect(902, 537, 4, 4);

    // Blue Janitor Mop Bucket + leaning mop stick (x=912, y=556)
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(910, 560, 14, 10);
    ctx.fillStyle = '#2E6299';
    ctx.fillRect(909, 553, 13, 12);
    ctx.fillStyle = '#3B7BBD';
    ctx.fillRect(911, 555, 9, 5);
    ctx.fillStyle = '#A6885E';
    ctx.fillRect(921, 544, 2, 16);

    // Fallen open cardboard box & spilled cans near Row 6 (x = 1345, y = 235)
    ctx.fillStyle = '#5E4832';
    ctx.fillRect(1337, 228, 16, 14);
    ctx.fillStyle = '#7A5E42';
    ctx.fillRect(1339, 230, 12, 10);
    ctx.fillStyle = '#B84A42';
    ctx.fillRect(1356, 234, 4, 4);
    ctx.fillRect(1352, 244, 4, 4);

    // Checkout #2 floor queue mat & subtle green arrow
    ctx.fillStyle = '#24302B';
    ctx.fillRect(496, 855, 42, 52);
    ctx.fillStyle = blackout ? '#22282B' : '#4E8F6B';
    ctx.fillRect(509, 898, 16, 2);
    ctx.fillRect(513, 893, 8, 2);

    // Animated Security Desk CRT screens (965, 945)
    if (chapter === 2) {
      // One dim backup-battery monitor blinking with subtle clue glow
      if (Math.sin(t * 3.5) > -0.65) {
        ctx.fillStyle = '#2C5C4E';
        ctx.fillRect(991, 954, 12, 8);
        ctx.fillStyle = '#7FD9B8';
        ctx.fillRect(993, 956, 8, 2);
      }
    } else if (!blackout && Math.sin(t * 7) > -0.82) {
      ctx.fillStyle = '#387085';
      ctx.fillRect(975, 954, 12, 8);
      ctx.fillStyle = '#305B4B';
      ctx.fillRect(991, 954, 12, 8);
      ctx.fillStyle = '#284552';
      ctx.fillRect(1007, 954, 12, 8);
      const scanY = 954 + Math.floor((t * 6) % 7);
      ctx.fillStyle = 'rgba(180, 245, 255, 0.35)';
      ctx.fillRect(975, scanY, 12, 1);
      ctx.fillRect(991, scanY, 12, 1);
      ctx.fillStyle = Math.sin(t * 4) > 0 ? '#E03E3E' : '#6E2222';
      ctx.fillRect(1026, 955, 3, 3);
    }
  }

  private drawSolid(
    ctx: CanvasRenderingContext2D,
    s: SolidRect,
    t: number,
    blackout: boolean
  ): void {
    if (s.kind === 'wall') {
      ctx.fillStyle = '#10151B';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#222B36';
      ctx.fillRect(s.x, s.y + s.h - 3, s.w, 3);
      return;
    }

    if (s.kind === 'fridge') {
      ctx.fillStyle = '#1A242E';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = blackout ? '#18222B' : '#7CB8CF';
      ctx.fillRect(s.x + 4, s.y + 6, s.w - 8, s.h - 14);
      // Interior stocked products
      for (let rx = s.x + 10; rx < s.x + s.w - 14; rx += 16) {
        ctx.fillStyle = '#E6F4FA';
        ctx.fillRect(rx, s.y + 10, 5, 11);
        ctx.fillStyle = '#5D8AA8';
        ctx.fillRect(rx + 7, s.y + 12, 5, 9);
      }
      // Glass door vertical frames & handles
      ctx.fillStyle = '#2C3947';
      for (let dx = s.x + 48; dx < s.x + s.w - 18; dx += 48) {
        ctx.fillRect(dx, s.y + 6, 2, s.h - 14);
        ctx.fillStyle = '#B7CCD9';
        ctx.fillRect(dx - 3, s.y + 16, 1, 6);
        ctx.fillStyle = '#2C3947';
      }
      // Diagonal glass shine
      if (!blackout) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
        for (let gx = s.x + 16; gx < s.x + s.w - 24; gx += 48) {
          ctx.fillRect(gx, s.y + 8, 8, 2);
          ctx.fillRect(gx - 3, s.y + 11, 8, 2);
        }
      }
      ctx.fillStyle = '#334050';
      ctx.fillRect(s.x, s.y + s.h - 5, s.w, 5);
      return;
    }

    if (s.kind === 'freezer') {
      ctx.fillStyle = '#2B3642';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = blackout ? '#1B252E' : '#7FB8CE';
      ctx.fillRect(s.x + 4, s.y + 4, s.w - 8, s.h - 8);
      // Colorful frozen bags faintly visible under glass
      const bagColors = ['#D9ECFA', '#E59A6E', '#7AB596', '#C95E5E'];
      for (let bx = s.x + 8; bx < s.x + s.w - 14; bx += 14) {
        for (let by = s.y + 10; by < s.y + s.h - 14; by += 14) {
          ctx.fillStyle = bagColors[((bx + by) / 7) % bagColors.length | 0];
          ctx.fillRect(bx, by, 9, 8);
        }
      }
      // Frost rim & divider bars
      ctx.fillStyle = blackout ? 'rgba(20, 30, 38, 0.5)' : 'rgba(215, 242, 252, 0.45)';
      ctx.fillRect(s.x + 4, s.y + 4, s.w - 8, s.h - 8);
      ctx.fillStyle = '#4B5B6B';
      if (s.w > s.h) {
        ctx.fillRect(s.x + s.w / 2 - 1, s.y + 4, 2, s.h - 8);
      } else {
        ctx.fillRect(s.x + 4, s.y + s.h / 2 - 1, s.w - 8, 2);
      }
      // Tiny digital thermometer LED on corner
      if (!blackout) {
        ctx.fillStyle = '#E59A3C';
        ctx.fillRect(s.x + s.w - 8, s.y + 2, 4, 2);
      }
      return;
    }

    if (s.kind === 'produce') {
      ctx.fillStyle = '#3F2D20';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#543D2B';
      ctx.fillRect(s.x + 2, s.y + 2, s.w - 4, s.h - 4);
      const colors = ['#B53B35', '#528A48', '#DDA036', '#7AA646'];
      for (let bx = s.x + 6; bx < s.x + s.w - 12; bx += 24) {
        for (let by = s.y + 6; by < s.y + s.h - 12; by += 20) {
          const ci = ((bx + by) / 4) % colors.length | 0;
          ctx.fillStyle = '#2A1E15';
          ctx.fillRect(bx, by, 18, 15);
          ctx.fillStyle = colors[ci];
          ctx.fillRect(bx + 2, by + 2, 14, 11);
          // Tiny highlight pixel on fruit crates
          ctx.fillStyle = 'rgba(255,255,255,0.22)';
          ctx.fillRect(bx + 4, by + 4, 3, 2);
        }
      }
      return;
    }

    if (s.kind === 'bakery') {
      ctx.fillStyle = '#4A3323';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#6B4B33';
      ctx.fillRect(s.x + 4, s.y + 4, s.w - 8, s.h - 8);
      // Warm pulsing rear oven window glow
      if (!blackout) {
        const ovenPulse = 0.65 + Math.sin(t * 2.5) * 0.2;
        ctx.fillStyle = `rgba(255, 166, 72, ${ovenPulse})`;
        ctx.fillRect(s.x + 6, s.y + 14, 6, 46);
        ctx.fillRect(s.x + 6, s.y + 84, 6, 46);
      }
      for (let by = s.y + 10; by < s.y + s.h - 14; by += 22) {
        ctx.fillStyle = '#2B211A';
        ctx.fillRect(s.x + 16, by, s.w - 24, 14);
        ctx.fillStyle = '#D99E4A';
        ctx.fillRect(s.x + 20, by + 3, 12, 8);
        ctx.fillRect(s.x + 38, by + 3, 14, 8);
        ctx.fillRect(s.x + 58, by + 3, 14, 8);
        ctx.fillRect(s.x + 76, by + 3, 10, 8);
      }
      return;
    }

    if (s.kind === 'shelf_grocery' || s.kind === 'shelf_drinks' || s.kind === 'shelf_chem') {
      ctx.fillStyle = '#1E242B';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#333C47';
      ctx.fillRect(s.x + 2, s.y + 2, s.w - 4, s.h - 4);
      ctx.fillStyle = '#505B69';
      ctx.fillRect(s.x + s.w / 2 - 2, s.y + 2, 4, s.h - 4);

      const palette =
        s.kind === 'shelf_grocery'
          ? ['#A8483E', '#D19D45', '#4F7E62', '#DFD5BF']
          : s.kind === 'shelf_drinks'
          ? ['#5282B0', '#6BAE8A', '#BD4E4E', '#DFAD50']
          : ['#5D86A1', '#8E70AE', '#CCD0D6', '#609B7D'];

      for (let py = s.y + 6; py < s.y + s.h - 8; py += 9) {
        const idx = ((py + s.x) / 9) | 0;
        // Leave occasional realistic shopped-in empty gaps on shelves
        if ((py * 7 + s.x) % 11 !== 0) {
          ctx.fillStyle = palette[idx % palette.length];
          ctx.fillRect(s.x + 4, py, 14, 6);
        }
        if ((py * 5 + s.x) % 13 !== 0) {
          ctx.fillStyle = palette[(idx + 2) % palette.length];
          ctx.fillRect(s.x + s.w - 18, py, 14, 6);
        }
      }
      // Yellow promo price tag ticks along edges
      ctx.fillStyle = '#E5B24A';
      for (let ty = s.y + 20; ty < s.y + s.h - 15; ty += 45) {
        ctx.fillRect(s.x, ty, 2, 5);
        ctx.fillRect(s.x + s.w - 2, ty + 16, 2, 5);
      }
      return;
    }

    if (s.kind === 'promo') {
      ctx.fillStyle = '#3E3224';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#A83E3E';
      ctx.fillRect(s.x + 4, s.y + 4, s.w - 8, s.h - 8);
      ctx.fillStyle = '#E5B24A';
      ctx.fillRect(s.x + 8, s.y + 8, 12, 8);
      ctx.fillRect(s.x + s.w - 22, s.y + 8, 14, 8);
      return;
    }

    if (s.kind === 'checkout') {
      const isOpen = Math.abs(s.x - 465) < 5;
      ctx.fillStyle = '#2B333D';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      // Conveyor belt surface
      ctx.fillStyle = '#12151A';
      ctx.fillRect(s.x + 8, s.y + 8, s.w - 40, 16);
      // Animated ribbed conveyor treads on active Checkout #2!
      if (isOpen && !blackout) {
        const beltOffset = Math.floor(t * 14) % 8;
        ctx.fillStyle = '#262E38';
        for (let bx = s.x + 10 + beltOffset; bx < s.x + s.w - 36; bx += 8) {
          ctx.fillRect(bx, s.y + 9, 2, 14);
        }
        // Subtle red barcode scanner line
        if (Math.sin(t * 8) > 0) {
          ctx.fillStyle = 'rgba(225, 55, 55, 0.75)';
          ctx.fillRect(s.x + s.w - 42, s.y + 10, 2, 12);
        }
      }

      // Small candy/magazine impulse rack along checkout side
      ctx.fillStyle = '#4B3A2C';
      ctx.fillRect(s.x + 12, s.y + 28, s.w - 48, 8);
      ctx.fillStyle = '#D99B48';
      ctx.fillRect(s.x + 16, s.y + 30, 10, 4);
      ctx.fillStyle = '#B84B4B';
      ctx.fillRect(s.x + 32, s.y + 30, 10, 4);
      ctx.fillStyle = '#5D9C73';
      ctx.fillRect(s.x + 48, s.y + 30, 10, 4);

      // Register monitor & receipt paper strip
      ctx.fillStyle = '#181E24';
      ctx.fillRect(s.x + s.w - 28, s.y + 6, 20, 14);
      ctx.fillStyle = blackout ? '#221414' : isOpen ? '#65C496' : '#8A3B3B';
      ctx.fillRect(s.x + s.w - 24, s.y + 9, 12, 8);
      // White paper receipt sticking out
      ctx.fillStyle = '#DCE2E8';
      ctx.fillRect(s.x + s.w - 14, s.y + 21, 5, 4);
      // Lane status beacon pole on corner
      ctx.fillStyle = blackout ? '#1D2228' : isOpen ? '#65C496' : '#9E3838';
      ctx.fillRect(s.x + s.w - 7, s.y + 2, 4, 4);

      ctx.fillStyle = '#536070';
      ctx.fillRect(s.x + 6, s.y + s.h - 6, s.w - 12, 3);
      return;
    }

    if (s.kind === 'security_desk') {
      ctx.fillStyle = '#222A33';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#141920';
      ctx.fillRect(s.x + 4, s.y + 4, s.w - 8, s.h - 8);
      return;
    }

    if (s.kind === 'plant') {
      ctx.fillStyle = '#3D2F24';
      ctx.fillRect(s.x + 3, s.y + 3, s.w - 6, s.h - 6);
      ctx.fillStyle = '#2E5936';
      ctx.fillRect(s.x + 1, s.y + 4, s.w - 2, s.h - 8);
      ctx.fillRect(s.x + 4, s.y + 1, s.w - 8, s.h - 2);
      ctx.fillStyle = '#477A4E';
      ctx.fillRect(s.x + 5, s.y + 5, s.w - 10, s.h - 10);
      return;
    }

    if (s.kind === 'bench') {
      ctx.fillStyle = '#1B2128';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#6E5035';
      for (let sy = s.y + 3; sy < s.y + s.h - 4; sy += 6) {
        ctx.fillRect(s.x + 3, sy, s.w - 6, 4);
      }
      ctx.fillStyle = '#8A6746';
      ctx.fillRect(s.x + 5, s.y + 4, s.w - 10, 2);
      return;
    }

    if (s.kind === 'locker') {
      // Parcel Locker ("ПОСТАМАТ")
      ctx.fillStyle = '#262E38';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#C9782E';
      ctx.fillRect(s.x + 3, s.y + 4, s.w - 6, s.h - 8);
      ctx.fillStyle = '#2B333D';
      for (let ly = s.y + 8; ly < s.y + s.h - 12; ly += 14) {
        ctx.fillRect(s.x + 5, ly, s.w - 12, 11);
      }
      // One slightly ajar dark locker compartment
      ctx.fillStyle = '#0B0D12';
      ctx.fillRect(s.x + 4, s.y + 64, 14, 11);
      // Glowing touchscreen panel
      ctx.fillStyle = blackout ? '#131920' : '#72C9E0';
      ctx.fillRect(s.x + 6, s.y + 48, 12, 12);
      return;
    }

    if (s.kind === 'pallet') {
      ctx.fillStyle = '#5E462D';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#47331E';
      ctx.fillRect(s.x + 3, s.y + 10, s.w - 6, 3);
      ctx.fillRect(s.x + 3, s.y + 23, s.w - 6, 3);
      // Shrink-wrapped blue water packs & brown boxes
      ctx.fillStyle = '#538EB5';
      ctx.fillRect(s.x + 4, s.y + 4, 22, 26);
      ctx.fillStyle = '#9BC8E3';
      ctx.fillRect(s.x + 6, s.y + 6, 18, 22);
      ctx.fillStyle = '#7C5D3D';
      ctx.fillRect(s.x + 28, s.y + 5, 22, 24);
      return;
    }

    if (s.kind === 'baskets') {
      ctx.fillStyle = '#1E252D';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#2E6E49';
      ctx.fillRect(s.x + 2, s.y + 2, s.w - 4, s.h - 4);
      ctx.fillStyle = '#439666';
      ctx.fillRect(s.x + 4, s.y + 6, s.w - 8, s.h - 12);
      ctx.fillStyle = '#AAB5C2';
      ctx.fillRect(s.x + 5, s.y + 4, s.w - 10, 2);
      return;
    }

    if (s.kind === 'bin') {
      ctx.fillStyle = '#2A333D';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#424E5C';
      ctx.fillRect(s.x + 3, s.y + 3, s.w - 6, s.h - 6);
      ctx.fillStyle = '#12161B';
      ctx.fillRect(s.x + 6, s.y + 6, s.w - 12, Math.max(6, s.h - 14));
      return;
    }

    if (s.kind === 'carts') {
      ctx.fillStyle = '#2C3540';
      ctx.fillRect(s.x, s.y - 4, s.w, 4);
      for (let cx = s.x + 4; cx < s.x + s.w - 12; cx += 12) {
        ctx.fillStyle = '#5A6775';
        ctx.fillRect(cx, s.y + 2, 10, 22);
        ctx.fillStyle = '#252C35';
        ctx.fillRect(cx + 1, s.y + 4, 8, 16);
        ctx.fillStyle = '#9E3838';
        ctx.fillRect(cx, s.y + 23, 10, 3);
      }
      return;
    }

    if (s.kind === 'gate') {
      ctx.fillStyle = '#3B4552';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = blackout ? '#401818' : Math.sin(t * 3) > 0 ? '#E59A3C' : '#6E4C22';
      ctx.fillRect(s.x + 2, s.y + 2, 6, 4);
      return;
    }

    if (s.kind === 'crate') {
      ctx.fillStyle = '#4A3623';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#634930';
      ctx.fillRect(s.x + 3, s.y + 3, s.w - 6, s.h - 6);
      ctx.fillStyle = '#3B2A1B';
      ctx.fillRect(s.x + 3, s.y + s.h / 2 - 1, s.w - 6, 2);
      return;
    }

    if (s.kind === 'vending') {
      ctx.fillStyle = '#212A34';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = blackout ? '#131920' : s.x > 1340 ? '#E59A3C' : '#5EB097';
      ctx.fillRect(s.x + 6, s.y + 5, s.w - 12, 14);
      // Blinking card terminal dot
      if (!blackout && Math.sin(t * 4 + s.x) > 0) {
        ctx.fillStyle = '#65C496';
        ctx.fillRect(s.x + s.w - 9, s.y + 22, 3, 3);
      }
    }
  }

  private drawAmbientParticles(
    ctx: CanvasRenderingContext2D,
    t: number,
    camX: number,
    camY: number
  ): void {
    // 1. Cold Mist / Condensation drifting over North Refrigerators & Center Freezers
    const mistCenters = [
      { x: 280, y: 98, w: 220 },
      { x: 630, y: 98, w: 260 },
      { x: 980, y: 98, w: 240 },
      { x: 1295, y: 98, w: 190 },
      { x: 703, y: 255, w: 50 },
      { x: 850, y: 440, w: 96 },
      { x: 703, y: 585, w: 50 },
    ];

    for (let m = 0; m < mistCenters.length; m++) {
      const mc = mistCenters[m];
      for (let i = 0; i < 4; i++) {
        const phase = (t * 0.45 + m * 0.7 + i * 0.27) % 1;
        const mx = mc.x - mc.w / 2 + ((i * 53 + m * 37) % mc.w) + Math.sin(t * 1.3 + i) * 4;
        const my = mc.y + 10 - phase * 14;
        const alpha = Math.sin(phase * Math.PI) * 0.16;
        ctx.fillStyle = `rgba(195, 236, 250, ${alpha.toFixed(3)})`;
        ctx.fillRect(Math.round(mx), Math.round(my), 7, 3);
      }
    }

    // 2. Coffee Machine Steam wisps (x=1386, y=1066)
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.7 + i * 0.33) % 1;
      const sx = 1384 + Math.sin(t * 3 + i) * 2;
      const sy = 1068 - p * 12;
      ctx.fillStyle = `rgba(240, 235, 220, ${(Math.sin(p * Math.PI) * 0.28).toFixed(3)})`;
      ctx.fillRect(Math.round(sx), Math.round(sy), 2, 2);
    }

    // 3. Subtle Dust Motes floating slowly inside the visible viewport
    for (let d = 0; d < 22; d++) {
      const dx = camX + ((d * 83 + t * (6 + (d % 4))) % PIXEL_W);
      const dy = camY + ((d * 57 + Math.sin(t * 0.8 + d) * 14) % PIXEL_H);
      const alpha = 0.08 + 0.06 * Math.sin(t * 2 + d);
      ctx.fillStyle = `rgba(230, 244, 240, ${alpha.toFixed(3)})`;
      ctx.fillRect(Math.round(dx), Math.round(dy), 1, 1);
    }
  }

  private drawCeilingPromoBanners(ctx: CanvasRenderingContext2D, t: number): void {
    // Gently swaying ceiling promo flags along cross-aisle and checkouts
    const banners = [
      { x: 450, y: 404, text: 'АКЦИЯ', bg: '#8C2D2D', fg: '#FFE8B3' },
      { x: 845, y: 392, text: '-30%', bg: '#9E6222', fg: '#FFF2CC' },
      { x: 1058, y: 404, text: '24/7', bg: '#2B573C', fg: '#DCF7E5' },
    ];

    ctx.save();
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const b of banners) {
      const sway = Math.round(Math.sin(t * 1.7 + b.x * 0.02) * 1.2);
      const w = b.text.length * 4 + 8;
      // Floor shadow beneath banner
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(b.x - w / 2 + sway, b.y + 18, w, 4);
      // Hanging banner flag
      ctx.fillStyle = b.bg;
      ctx.fillRect(b.x - w / 2 + sway, b.y - 4, w, 9);
      ctx.fillStyle = b.fg;
      ctx.fillText(b.text, b.x + sway, b.y + 0.5);
    }
    ctx.restore();
  }

  private drawMaskProp(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
    const glint = Math.sin(t * 3.5) > 0.75 ? 1 : 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x - 6, y - 4, 12, 10);
    ctx.fillStyle = glint ? '#F2ECE1' : '#CFC7B8';
    ctx.fillRect(x - 5, y - 5, 10, 9);
    ctx.fillRect(x - 4, y + 4, 8, 2);
    ctx.fillStyle = '#111216';
    ctx.fillRect(x - 3, y - 2, 2, 2);
    ctx.fillRect(x + 1, y - 2, 2, 2);
    ctx.fillRect(x - 2, y + 2, 4, 1);
  }

  private drawCollectibleItem(
    ctx: CanvasRenderingContext2D,
    item: StoreItem,
    t: number
  ): void {
    const bob = Math.round(Math.sin(t * 4 + item.x) * 1.5);
    const ix = Math.round(item.x);
    const iy = Math.round(item.y) + bob;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(ix - 8, Math.round(item.y) - 4, 16, 10);

    ctx.fillStyle = '#090B0E';
    ctx.fillRect(ix - 6, iy - 6, 12, 12);
    ctx.fillStyle = item.color;
    ctx.fillRect(ix - 5, iy - 5, 10, 10);
    ctx.fillStyle = item.accent;
    ctx.fillRect(ix - 4, iy - 2, 8, 4);
  }

  private drawPersonSprite(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    dir: 'up' | 'down' | 'left' | 'right',
    walkFrame: number,
    shirtColor: string,
    hairColor: string,
    time: number,
    extras?: {
      hasBasket?: boolean;
      isStaff?: boolean;
      phoneGlow?: boolean;
    }
  ): void {
    const isMoving = walkFrame !== 0;
    const idleBreath = !isMoving && Math.sin(time * 2.4 + x * 0.1) > 0.65 ? 1 : 0;
    const bob = isMoving ? (Math.abs(Math.sin(walkFrame)) > 0.5 ? 1 : 0) : idleBreath;
    const stepL = isMoving && Math.sin(walkFrame) > 0.35 ? 1 : 0;
    const stepR = isMoving && Math.sin(walkFrame) < -0.35 ? 1 : 0;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(x - 6, y + 3, 12, 5);

    ctx.fillStyle = '#0D1015';
    ctx.fillRect(x - 4, y + 2 - stepL, 3, 3);
    ctx.fillRect(x + 1, y + 2 - stepR, 3, 3);

    ctx.fillStyle = shirtColor;
    ctx.fillRect(x - 5, y - 6 - bob, 10, 9);

    // Optional store staff vest/apron & badge
    if (extras?.isStaff) {
      ctx.fillStyle = '#244A3A';
      ctx.fillRect(x - 4, y - 6 - bob, 8, 8);
      ctx.fillStyle = '#D9C58B';
      ctx.fillRect(x + 1, y - 5 - bob, 2, 2);
    }

    // Optional green plastic shopping basket carried by hand
    if (extras?.hasBasket) {
      const bx = dir === 'left' ? x - 9 : dir === 'right' ? x + 5 : x + 4;
      const by = y - 1 - bob;
      ctx.fillStyle = '#2B6E4A';
      ctx.fillRect(bx, by, 5, 5);
      ctx.fillStyle = '#8EA3B5';
      ctx.fillRect(bx + 1, by - 1, 3, 1);
    }

    // Head & Hair
    ctx.fillStyle = '#C9A890';
    ctx.fillRect(x - 3, y - 11 - bob, 6, 5);
    ctx.fillStyle = hairColor;
    if (dir === 'up') {
      ctx.fillRect(x - 4, y - 13 - bob, 8, 6);
    } else if (dir === 'down') {
      ctx.fillRect(x - 4, y - 13 - bob, 8, 3);
      ctx.fillStyle = '#181D24';
      ctx.fillRect(x - 2, y - 9 - bob, 1, 1);
      ctx.fillRect(x + 1, y - 9 - bob, 1, 1);
    } else if (dir === 'left') {
      ctx.fillRect(x - 3, y - 13 - bob, 7, 3);
      ctx.fillRect(x + 1, y - 11 - bob, 3, 4);
      ctx.fillStyle = '#181D24';
      ctx.fillRect(x - 2, y - 9 - bob, 1, 1);
    } else {
      ctx.fillRect(x - 4, y - 13 - bob, 7, 3);
      ctx.fillRect(x - 4, y - 11 - bob, 3, 4);
      ctx.fillStyle = '#181D24';
      ctx.fillRect(x + 1, y - 9 - bob, 1, 1);
    }

    // Optional subtle glowing phone screen in queue buyer's hands
    if (extras?.phoneGlow) {
      ctx.fillStyle = '#A8E2FF';
      ctx.fillRect(x - 1, y - 7 - bob, 3, 2);
      ctx.fillStyle = 'rgba(155, 220, 255, 0.25)';
      ctx.fillRect(x - 3, y - 10 - bob, 6, 4);
    }
  }

  private drawEntitySprite(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    dir: 'up' | 'down' | 'left' | 'right',
    walkFrame: number,
    chasing: boolean,
    time: number
  ): void {
    const stride = Math.sin(walkFrame);
    const lurch = Math.abs(stride) > 0.5 ? 1 : 0;
    const twitch = chasing && Math.sin(time * 38) > 0.7 ? 1 : 0;

    // Wide dark shadow pool
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(x - 9, y + 3, 18, 6);

    // Long spindly legs
    ctx.fillStyle = '#07080B';
    ctx.fillRect(x - 5, y + 1 - (stride > 0.3 ? 2 : 0), 3, 5);
    ctx.fillRect(x + 2, y + 1 - (stride < -0.3 ? 2 : 0), 3, 5);

    // Tall hunched dark torso & long hanging arms
    ctx.fillStyle = '#12141A';
    ctx.fillRect(x - 7, y - 12 - lurch, 14, 14);
    ctx.fillStyle = '#090A0E';
    ctx.fillRect(x - 9, y - 9 - lurch + (stride > 0 ? 1 : 0), 2, 10);
    ctx.fillRect(x + 7, y - 9 - lurch + (stride < 0 ? 1 : 0), 2, 10);

    // Pale uncanny mask face (callback to the missing mask from Chapter 1!)
    const mx = x + (dir === 'left' ? -1 : dir === 'right' ? 1 : 0) + twitch;
    const my = y - 19 - lurch;
    if (dir !== 'up') {
      ctx.fillStyle = '#DAD2C2';
      ctx.fillRect(mx - 4, my, 8, 8);
      ctx.fillStyle = '#0B0C10';
      // Hollow eye sockets + dark mouth slit
      ctx.fillRect(mx - 3, my + 2, 2, 2);
      ctx.fillRect(mx + 1, my + 2, 2, 2);
      ctx.fillRect(mx - 2, my + 6, 4, chasing ? 2 : 1);

      if (chasing) {
        ctx.fillStyle = '#E64545';
        ctx.fillRect(mx - 2, my + 2, 1, 1);
        ctx.fillRect(mx + 1, my + 2, 1, 1);
      }
    } else {
      ctx.fillStyle = '#181A22';
      ctx.fillRect(mx - 4, my, 8, 8);
    }
  }

  private applyLighting(state: HypermarketRenderState, camX: number, camY: number): void {
    const lCtx = this.lightCtx;
    lCtx.globalCompositeOperation = 'source-over';

    if (state.blackout) {
      const darkFloor =
        state.chapter === 2
          ? Math.max(5, Math.min(18, Math.round(8 * state.brightness)))
          : 7;
      lCtx.fillStyle = `rgb(${darkFloor}, ${darkFloor + 1}, ${darkFloor + 4})`;
      lCtx.fillRect(0, 0, PIXEL_W, PIXEL_H);

      lCtx.globalCompositeOperation = 'lighter';
      // Red emergency exit glow
      this.drawRadialLight(
        lCtx,
        840 - camX,
        1105 - camY,
        95,
        'rgba(205, 42, 42, 0.58)'
      );
      if (state.chapter !== 2) {
        this.drawRadialLight(
          lCtx,
          STAFF_DOOR_POS.x - camX,
          STAFF_DOOR_POS.y - camY,
          46,
          'rgba(185, 40, 40, 0.45)'
        );
      } else {
        // Faint backup-battery monitor glow at Security Desk (subtle anchor for the 1 clue)
        this.drawRadialLight(
          lCtx,
          997 - camX,
          958 - camY,
          36,
          'rgba(85, 168, 134, 0.32)'
        );
      }

      // Soft player ambient visibility halo
      this.drawRadialLight(
        lCtx,
        state.playerX - camX,
        state.playerY - camY,
        state.chapter === 2 ? 28 : 34,
        'rgba(125, 140, 155, 0.22)'
      );

      // Soft diffused Smartphone LED Flash aimed by Right Stick (feathered multi-layer + blur)
      if (state.chapter === 2 && state.phoneFlash?.on) {
        const flicker = state.phoneFlash.flicker ?? 1;
        const px = state.playerX - camX;
        const py = state.playerY - camY - 4;
        const angle = state.phoneFlash.angle;
        const maxRange = 175;

        // Soft warm phone-hand ambient glow around player
        this.drawRadialLight(
          lCtx,
          px + Math.cos(angle) * 10,
          py + Math.sin(angle) * 10,
          56,
          `rgba(232, 238, 248, ${(0.56 * flicker).toFixed(2)})`
        );

        // Render feathered multi-ring angular scatter onto smooth coneCanvas
        const cCtx = this.coneCtx;
        cCtx.clearRect(0, 0, PIXEL_W, PIXEL_H);
        const layers = [
          { spread: 1.08, range: 175, a0: 0.16, aMid: 0.09 },
          { spread: 0.86, range: 168, a0: 0.22, aMid: 0.13 },
          { spread: 0.66, range: 158, a0: 0.28, aMid: 0.16 },
          { spread: 0.48, range: 145, a0: 0.34, aMid: 0.19 },
          { spread: 0.31, range: 128, a0: 0.36, aMid: 0.2 },
        ];
        for (const layer of layers) {
          cCtx.save();
          cCtx.beginPath();
          cCtx.moveTo(px, py);
          cCtx.arc(px, py, layer.range, angle - layer.spread, angle + layer.spread);
          cCtx.closePath();
          const g = cCtx.createRadialGradient(px, py, 6, px, py, layer.range);
          g.addColorStop(0, `rgba(244, 247, 252, ${(layer.a0 * flicker).toFixed(3)})`);
          g.addColorStop(0.5, `rgba(216, 226, 242, ${(layer.aMid * flicker).toFixed(3)})`);
          g.addColorStop(1, 'rgba(0, 0, 0, 0)');
          cCtx.fillStyle = g;
          cCtx.fill();
          cCtx.restore();
        }

        // Extra soft forward scatter pool so edges dissolve organically
        this.drawRadialLight(
          cCtx,
          px + Math.cos(angle) * 68,
          py + Math.sin(angle) * 68,
          76,
          `rgba(222, 232, 246, ${(0.28 * flicker).toFixed(2)})`
        );

        // Composite blurred cone mask onto lightCanvas for zero hard lines
        lCtx.save();
        lCtx.filter = 'blur(8px)';
        lCtx.drawImage(this.coneCanvas, 0, 0);
        lCtx.filter = 'none';
        lCtx.restore();

        void maxRange;
      }
    } else {
      const baseAmb = Math.max(0.2, Math.min(0.62, 0.34 * state.brightness));
      const v = Math.round(baseAmb * 255);
      lCtx.fillStyle = `rgb(${Math.round(v * 0.88)}, ${Math.round(v * 0.94)}, ${v})`;
      lCtx.fillRect(0, 0, PIXEL_W, PIXEL_H);

      lCtx.globalCompositeOperation = 'lighter';
      for (const light of STORE_LIGHTS) {
        const sx = light.x - camX;
        const sy = light.y - camY;
        if (
          sx + light.radius < 0 ||
          sx - light.radius > PIXEL_W ||
          sy + light.radius < 0 ||
          sy - light.radius > PIXEL_H
        ) {
          continue;
        }
        const flick =
          light.flickerSeed !== undefined
            ? this.computeFlicker(state.time, state.flickerEnabled, light.flickerSeed)
            : 1.0;

        if (flick < 0.99) {
          const dimCol = light.color.replace(/[\d.]+\)$/, `${0.6 * flick})`);
          this.drawRadialLight(lCtx, sx, sy, light.radius, dimCol);
        } else {
          this.drawRadialLight(lCtx, sx, sy, light.radius, light.color);
        }
      }
    }

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'multiply';
    this.ctx.drawImage(this.lightCanvas, 0, 0);
    this.ctx.restore();

    // Soft diffused additive bloom pass for phone flash in Ch2 or store lights in Ch1
    if (state.blackout && state.chapter === 2 && state.phoneFlash?.on) {
      const flicker = state.phoneFlash.flicker ?? 1;
      const px = state.playerX - camX;
      const py = state.playerY - camY - 4;
      const angle = state.phoneFlash.angle;
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'lighter';
      this.ctx.filter = 'blur(6px)';
      this.drawRadialLight(
        this.ctx,
        px + Math.cos(angle) * 44,
        py + Math.sin(angle) * 44,
        74,
        `rgba(225, 234, 248, ${(0.095 * flicker).toFixed(3)})`
      );
      this.ctx.filter = 'none';
      this.ctx.restore();
    } else if (!state.blackout) {
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'lighter';
      for (const light of STORE_LIGHTS) {
        if (!light.bloomColor) continue;
        const sx = light.x - camX;
        const sy = light.y - camY;
        if (
          sx + light.radius < 0 ||
          sx - light.radius > PIXEL_W ||
          sy + light.radius < 0 ||
          sy - light.radius > PIXEL_H
        ) {
          continue;
        }
        this.drawRadialLight(this.ctx, sx, sy, light.radius * 0.65, light.bloomColor);
      }
      this.ctx.restore();
    }
  }

  private drawRadialLight(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    color: string
  ): void {
    const grad = ctx.createRadialGradient(x, y, 2, x, y, radius);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
}
