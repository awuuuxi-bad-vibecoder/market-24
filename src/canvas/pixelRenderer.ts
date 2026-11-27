export const PIXEL_W = 480;
export const PIXEL_H = 270;

export interface RainDrop {
  x: number;
  y: number;
  speed: number;
  len: number;
}

export interface Ripple {
  x: number;
  y: number;
  age: number;
  maxAge: number;
}

export interface ExteriorRenderState {
  time: number;
  brightness: number; // 0.6..1.4
  flickerEnabled: boolean;
  doorOpen: number; // 0..1
  playerVisible: boolean;
  playerX: number;
  playerY: number;
  playerDir: 'up' | 'down' | 'left' | 'right';
  walkFrame: number;
  cameraX: number;
  cameraY: number;
  silhouetteX: number;
  silhouetteVisible: boolean;
}

export interface StreetRenderState {
  time: number;
  brightness: number;
  flickerEnabled: boolean;
  playerX: number;
  playerY: number;
  walkFrame: number;
  cameraX: number;
}

export interface LobbyRenderState {
  time: number;
  brightness: number;
  flickerEnabled: boolean;
  playerX: number;
  playerY: number;
  playerDir: 'up' | 'down' | 'left' | 'right';
  walkFrame: number;
  phoneFlashOn: boolean;
  nearbyInteractable: string | null;
}

export class PixelWorldRenderer {
  private buffer: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lightCanvas: HTMLCanvasElement;
  private lightCtx: CanvasRenderingContext2D;
  private rain: RainDrop[] = [];
  private ripples: Ripple[] = [];
  private asphaltPattern: CanvasPattern | null = null;

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

    // Seed rain
    for (let i = 0; i < 95; i++) {
      this.rain.push({
        x: Math.random() * PIXEL_W,
        y: Math.random() * PIXEL_H,
        speed: 170 + Math.random() * 90,
        len: 5 + Math.floor(Math.random() * 5),
      });
    }

    // Seed puddle ripples
    for (let i = 0; i < 8; i++) {
      this.ripples.push({
        x: 90 + Math.random() * 320,
        y: 135 + Math.random() * 115,
        age: Math.random() * 1.4,
        maxAge: 0.9 + Math.random() * 0.7,
      });
    }

    this.buildAsphaltPattern();
  }

  private buildAsphaltPattern(): void {
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 32;
    pCanvas.height = 32;
    const pCtx = pCanvas.getContext('2d')!;
    pCtx.fillStyle = '#11151B';
    pCtx.fillRect(0, 0, 32, 32);

    // Deterministic pixel grain for wet asphalt
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const hash = ((x * 73856093) ^ (y * 19349663)) & 255;
        if (hash < 28) {
          pCtx.fillStyle = '#171D26';
          pCtx.fillRect(x, y, 1, 1);
        } else if (hash > 232) {
          pCtx.fillStyle = '#0C0F14';
          pCtx.fillRect(x, y, 1, 1);
        }
      }
    }
    this.asphaltPattern = this.ctx.createPattern(pCanvas, 'repeat');
  }

  public updateRain(dt: number): void {
    for (const drop of this.rain) {
      drop.y += drop.speed * dt;
      drop.x -= drop.speed * 0.14 * dt;
      if (drop.y > PIXEL_H) {
        drop.y = -10;
        drop.x = Math.random() * (PIXEL_W + 40);
      }
    }
    for (const r of this.ripples) {
      r.age += dt;
      if (r.age >= r.maxAge) {
        r.age = 0;
        r.x = 70 + Math.random() * 350;
        r.y = 130 + Math.random() * 125;
      }
    }
  }

  private computeFlicker(time: number, enabled: boolean, seed = 0): number {
    if (!enabled) return 1.0;
    const wave =
      Math.sin(time * 23 + seed) * 0.5 +
      Math.sin(time * 57 + seed * 3) * 0.3 +
      Math.sin(time * 7.3) * 0.2;
    if (wave > 0.88) return 0.42;
    if (wave > 0.78) return 0.75;
    return 1.0;
  }

  public renderExterior(target: HTMLCanvasElement, state: ExteriorRenderState): void {
    const ctx = this.ctx;
    const t = state.time;

    const signFlicker = this.computeFlicker(t, state.flickerEnabled, 1.2);
    const tubeFlicker = this.computeFlicker(t * 0.7, state.flickerEnabled, 4.7);

    ctx.save();
    ctx.clearRect(0, 0, PIXEL_W, PIXEL_H);
    ctx.translate(Math.round(-state.cameraX), Math.round(-state.cameraY));

    // 1. Wet Parking Lot Asphalt
    if (this.asphaltPattern) {
      ctx.fillStyle = this.asphaltPattern;
      ctx.fillRect(-40, 108, PIXEL_W + 80, PIXEL_H);
    } else {
      ctx.fillStyle = '#11151B';
      ctx.fillRect(-40, 108, PIXEL_W + 80, PIXEL_H);
    }

    // Parking bay painted lines (faded yellow-grey)
    ctx.fillStyle = '#3B3A2C';
    for (let px = 30; px <= 210; px += 45) {
      ctx.fillRect(px, 165, 2, 68);
    }
    ctx.fillRect(30, 165, 182, 2);

    // Sidewalk concrete apron along store front
    ctx.fillStyle = '#1E242D';
    ctx.fillRect(0, 88, PIXEL_W + 40, 32);
    // Sidewalk tile seams
    ctx.fillStyle = '#161B22';
    for (let sx = 0; sx < PIXEL_W + 40; sx += 16) {
      ctx.fillRect(sx, 88, 1, 32);
    }
    // Concrete curb edge
    ctx.fillStyle = '#2B3340';
    ctx.fillRect(0, 118, PIXEL_W + 40, 2);
    ctx.fillStyle = '#0B0D11';
    ctx.fillRect(0, 120, PIXEL_W + 40, 2);

    // Tactile yellow warning strip by entrance doors
    ctx.fillStyle = '#735828';
    ctx.fillRect(268, 112, 68, 5);

    // 2. Rain Puddles on Asphalt (with subtle colored reflections!)
    this.drawPuddle(ctx, 130, 198, 46, 16, '#1E3331', '#6E2626', signFlicker);
    this.drawPuddle(ctx, 286, 152, 58, 18, '#2C3D39', '#8CC5AD', tubeFlicker);
    this.drawPuddle(ctx, 375, 210, 40, 14, '#1B252E', '#7A592A', 1);

    // Ripple pixels in puddles
    for (const r of this.ripples) {
      const progress = r.age / r.maxAge;
      const rad = Math.floor(progress * 6);
      ctx.fillStyle = `rgba(180, 210, 215, ${(1 - progress) * 0.22})`;
      ctx.fillRect(Math.round(r.x - rad), Math.round(r.y), 1, 1);
      ctx.fillRect(Math.round(r.x + rad), Math.round(r.y), 1, 1);
      ctx.fillRect(Math.round(r.x), Math.round(r.y - Math.floor(rad * 0.5)), 1, 1);
      ctx.fillRect(Math.round(r.x), Math.round(r.y + Math.floor(rad * 0.5)), 1, 1);
    }

    // 3. Store Interior glimpsed behind the glass wall (top 0..88)
    // Interior tiled floor
    for (let ty = 12; ty < 88; ty += 8) {
      for (let tx = 40; tx < 450; tx += 8) {
        const even = ((tx / 8 + ty / 8) | 0) % 2 === 0;
        ctx.fillStyle = even ? '#26302E' : '#202928';
        ctx.fillRect(tx, ty, 8, 8);
      }
    }

    // Interior shelves & checkout silhouette inside the store
    // Checkout counter 1 & 2
    ctx.fillStyle = '#38434D';
    ctx.fillRect(156, 36, 36, 10);
    ctx.fillStyle = '#E59A3C';
    ctx.fillRect(160, 38, 4, 3); // little register screen
    ctx.fillStyle = '#38434D';
    ctx.fillRect(210, 36, 36, 10);

    // Far shelves inside
    ctx.fillStyle = '#333C45';
    ctx.fillRect(62, 16, 72, 10);
    ctx.fillRect(360, 18, 76, 12);
    // Colorful pixel product boxes on shelves
    const itemColors = ['#9A4848', '#4F7A65', '#B08543', '#526B8A'];
    for (let ix = 64; ix < 130; ix += 6) {
      ctx.fillStyle = itemColors[(ix / 6) % itemColors.length];
      ctx.fillRect(ix, 18, 4, 5);
    }
    for (let ix = 364; ix < 432; ix += 6) {
      ctx.fillStyle = itemColors[(ix / 6 + 1) % itemColors.length];
      ctx.fillRect(ix, 20, 4, 6);
    }

    // Eerie customer silhouette passing inside behind the glass
    if (state.silhouetteVisible) {
      const sx = Math.round(state.silhouetteX);
      const sy = 50;
      ctx.fillStyle = '#0D1214';
      ctx.fillRect(sx - 4, sy - 6, 8, 10);
      ctx.fillStyle = '#182022';
      ctx.fillRect(sx - 3, sy - 10, 6, 5); // head
    }

    // 4. Store Facade & Glass Mullions
    // Left concrete pillar wall
    ctx.fillStyle = '#171C23';
    ctx.fillRect(0, 0, 56, 88);
    // Right concrete wall
    ctx.fillRect(438, 0, 60, 88);
    // Top roof canopy overhang
    ctx.fillStyle = '#11151B';
    ctx.fillRect(0, 0, PIXEL_W + 40, 22);
    ctx.fillStyle = '#1F2630';
    ctx.fillRect(0, 22, PIXEL_W + 40, 3);

    // Glass window tint + vertical frames
    ctx.fillStyle = 'rgba(130, 175, 165, 0.14)';
    ctx.fillRect(56, 25, 212, 63);
    ctx.fillRect(336, 25, 102, 63);
    ctx.fillStyle = '#202730';
    for (let fx = 56; fx <= 268; fx += 42) {
      ctx.fillRect(fx, 25, 2, 63);
    }
    ctx.fillRect(336, 25, 2, 63);
    ctx.fillRect(386, 25, 2, 63);
    ctx.fillRect(436, 25, 2, 63);

    // Automatic Sliding Glass Doors (x = 268..336, width 68)
    const openOffset = Math.round(state.doorOpen * 26);
    // Door frame
    ctx.fillStyle = '#28313D';
    ctx.fillRect(268, 25, 68, 3);
    // Left door panel
    ctx.fillStyle = 'rgba(155, 210, 195, 0.25)';
    ctx.fillRect(270 - openOffset, 28, 32, 60);
    ctx.fillStyle = '#394554';
    ctx.fillRect(300 - openOffset, 28, 2, 60);
    // Right door panel
    ctx.fillStyle = 'rgba(155, 210, 195, 0.25)';
    ctx.fillRect(302 + openOffset, 28, 32, 60);
    ctx.fillStyle = '#394554';
    ctx.fillRect(302 + openOffset, 28, 2, 60);

    // 5. Exterior Props: Shopping Cart Corral (left sidewalk), Vending Machine (right wall), Parked Car
    this.drawShoppingCartsRow(ctx, 74, 93, 4);

    // Glowing Soda / Coffee Vending Machine by right concrete wall
    ctx.fillStyle = '#1F2833';
    ctx.fillRect(442, 68, 18, 22);
    ctx.fillStyle = '#5FA8B8';
    ctx.fillRect(445, 71, 10, 12);
    ctx.fillStyle = '#D9EFE3';
    ctx.fillRect(447, 73, 3, 2);
    ctx.fillRect(451, 76, 3, 2);
    ctx.fillRect(447, 79, 5, 2);

    // Bollards in front of entrance
    ctx.fillStyle = '#5E4B27';
    ctx.fillRect(256, 110, 3, 7);
    ctx.fillRect(344, 110, 3, 7);
    ctx.fillStyle = '#D49A3A';
    ctx.fillRect(256, 110, 3, 2);
    ctx.fillRect(344, 110, 3, 2);

    // Lone Parked Sedan (top-down pixel car in left bay)
    this.drawParkedCar(ctx, 44, 178, t);

    // Glowing Store Canopy Sign: "МАРКЕТ 24"
    ctx.fillStyle = '#180E10';
    ctx.fillRect(252, 5, 100, 14);
    ctx.fillStyle = signFlicker > 0.6 ? '#C93B3B' : '#5E1E1E';
    ctx.fillRect(254, 7, 96, 10);
    ctx.fillStyle = signFlicker > 0.6 ? '#FFE2C2' : '#7A4E4E';
    // Pixel-crisp "24/7" & block lettering indicator on canopy
    this.drawPixelText24(ctx, 266, 9, signFlicker > 0.6 ? '#FFF0DB' : '#6F4949');

    // 6. Player character if visible (during Intro / Transition)
    if (state.playerVisible) {
      this.drawPlayerSprite(
        ctx,
        Math.round(state.playerX),
        Math.round(state.playerY),
        state.playerDir,
        state.walkFrame
      );
    }

    // 7. Falling Rain Streaks (foreground)
    ctx.fillStyle = 'rgba(185, 210, 225, 0.22)';
    for (const drop of this.rain) {
      const dx = Math.round(drop.x);
      const dy = Math.round(drop.y);
      for (let s = 0; s < drop.len; s++) {
        ctx.fillRect(dx - Math.floor(s * 0.2), dy + s, 1, 1);
      }
    }

    ctx.restore();

    // 8. Dynamic 2D Atmospheric Lighting Pass
    this.applyExteriorLighting(state, signFlicker, tubeFlicker);

    // Blit pixel buffer cleanly to visible canvas
    const tCtx = target.getContext('2d');
    if (tCtx) {
      tCtx.imageSmoothingEnabled = false;
      tCtx.clearRect(0, 0, target.width, target.height);
      tCtx.drawImage(this.buffer, 0, 0, target.width, target.height);
    }
  }

  private applyExteriorLighting(
    state: ExteriorRenderState,
    signFlicker: number,
    tubeFlicker: number
  ): void {
    const lCtx = this.lightCtx;
    const baseDark = Math.max(0.06, Math.min(0.45, 0.17 * state.brightness));
    const ambVal = Math.round(baseDark * 255);

    lCtx.globalCompositeOperation = 'source-over';
    lCtx.fillStyle = `rgb(${Math.round(ambVal * 0.82)}, ${Math.round(ambVal * 0.9)}, ${ambVal})`;
    lCtx.fillRect(0, 0, PIXEL_W, PIXEL_H);

    lCtx.globalCompositeOperation = 'lighter';

    // Bright cold-mint spill pouring out of the sliding glass doors onto wet asphalt
    const doorSpread = 1 + state.doorOpen * 0.35;
    this.drawRadialLight(
      lCtx,
      302 - state.cameraX,
      98 - state.cameraY,
      115 * doorSpread,
      `rgba(180, 225, 210, ${0.78 * tubeFlicker})`
    );

    // Storefront window soft spill
    this.drawRadialLight(lCtx, 165 - state.cameraX, 82 - state.cameraY, 72, 'rgba(145, 195, 185, 0.42)');
    this.drawRadialLight(lCtx, 390 - state.cameraX, 82 - state.cameraY, 62, 'rgba(145, 195, 185, 0.38)');

    // Crimson-amber glow from "24" store sign
    this.drawRadialLight(
      lCtx,
      302 - state.cameraX,
      14 - state.cameraY,
      78,
      `rgba(225, 85, 65, ${0.58 * signFlicker})`
    );

    // Vending machine cyan-white glow
    this.drawRadialLight(lCtx, 448 - state.cameraX, 78 - state.cameraY, 34, 'rgba(110, 190, 210, 0.45)');

    // Distant warm sodium streetlamp on the far right edge
    this.drawRadialLight(lCtx, 435 - state.cameraX, 180 - state.cameraY, 95, 'rgba(229, 154, 60, 0.32)');

    // Car hazard / subtle parking light
    const hazardPulse = Math.sin(state.time * 4.5) > 0.2 ? 0.35 : 0.08;
    this.drawRadialLight(
      lCtx,
      68 - state.cameraX,
      188 - state.cameraY,
      32,
      `rgba(229, 140, 45, ${hazardPulse})`
    );

    // Composite lightmap over buffer with multiply
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'multiply';
    this.ctx.drawImage(this.lightCanvas, 0, 0);
    this.ctx.restore();

    // Subtle additive bloom on the 24 sign & glass doors
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    this.drawRadialLight(
      this.ctx,
      302 - state.cameraX,
      12 - state.cameraY,
      36,
      `rgba(210, 65, 50, ${0.18 * signFlicker})`
    );
    this.ctx.restore();
  }

  public renderIntroStreet(target: HTMLCanvasElement, state: StreetRenderState): void {
    const ctx = this.ctx;
    const t = state.time;
    const busFlicker = this.computeFlicker(t, state.flickerEnabled, 3.1);

    ctx.save();
    ctx.clearRect(0, 0, PIXEL_W, PIXEL_H);
    ctx.translate(Math.round(-state.cameraX), 0);

    // 1. Dark wet road (lower half y = 148..270)
    if (this.asphaltPattern) {
      ctx.fillStyle = this.asphaltPattern;
      ctx.fillRect(0, 148, PIXEL_W + 240, 130);
    } else {
      ctx.fillStyle = '#0F1318';
      ctx.fillRect(0, 148, PIXEL_W + 240, 130);
    }

    // Faded road center dashed markings
    ctx.fillStyle = '#3B3D38';
    for (let rx = 18; rx < PIXEL_W + 220; rx += 38) {
      ctx.fillRect(rx, 206, 18, 2);
    }

    // Concrete sidewalk (y = 86..148)
    ctx.fillStyle = '#1B212A';
    ctx.fillRect(0, 86, PIXEL_W + 240, 62);
    ctx.fillStyle = '#141920';
    for (let sx = 0; sx < PIXEL_W + 240; sx += 16) {
      ctx.fillRect(sx, 86, 1, 62);
    }
    ctx.fillRect(0, 117, PIXEL_W + 240, 1);

    // Curb
    ctx.fillStyle = '#29323E';
    ctx.fillRect(0, 146, PIXEL_W + 240, 2);
    ctx.fillStyle = '#0A0D10';
    ctx.fillRect(0, 148, PIXEL_W + 240, 2);

    // Background dark residential block & yard fence (y = 0..86)
    ctx.fillStyle = '#0B0E13';
    ctx.fillRect(0, 0, PIXEL_W + 240, 86);
    // Panel apartment block silhouette on left
    ctx.fillStyle = '#12171F';
    ctx.fillRect(18, 6, 170, 74);
    ctx.fillStyle = '#181F29';
    ctx.fillRect(18, 72, 170, 8);
    // Faint warm window in apartment
    ctx.fillStyle = '#5F4B2B';
    ctx.fillRect(46, 26, 14, 10);
    ctx.fillRect(128, 44, 14, 10);

    // Closed night kiosk ("ТАБАК / ПРОДУКТЫ" shuttered)
    ctx.fillStyle = '#192028';
    ctx.fillRect(230, 38, 72, 46);
    ctx.fillStyle = '#232C37';
    ctx.fillRect(236, 52, 60, 28); // corrugated shutter
    ctx.fillStyle = '#141920';
    for (let sy = 55; sy < 78; sy += 4) {
      ctx.fillRect(236, sy, 60, 1);
    }

    // Empty Bus Stop Shelter (x = 395..475)
    ctx.fillStyle = '#1F2730';
    ctx.fillRect(392, 54, 84, 34);
    ctx.fillStyle = '#12171E';
    ctx.fillRect(398, 60, 72, 22);
    // Bench inside shelter
    ctx.fillStyle = '#4B3A2C';
    ctx.fillRect(408, 74, 48, 5);
    // Flickering timetable box
    ctx.fillStyle = busFlicker > 0.65 ? '#B7D4CC' : '#3C4A47';
    ctx.fillRect(462, 64, 6, 10);

    // Sodium Streetlamp posts along sidewalk
    for (const lx of [108, 325, 560]) {
      ctx.fillStyle = '#2C3540';
      ctx.fillRect(lx, 78, 4, 68);
      ctx.fillStyle = '#E59A3C';
      ctx.fillRect(lx - 2, 76, 8, 3);
    }

    // Rain puddles on road & sidewalk
    this.drawPuddle(ctx, 118, 176, 44, 14, '#1B252E', '#94622A', 1);
    this.drawPuddle(ctx, 315, 168, 54, 16, '#1B252E', '#94622A', 1);
    this.drawPuddle(ctx, 430, 125, 36, 11, '#1E2A2D', '#80ACA2', busFlicker);

    // Ripple pixels
    for (const r of this.ripples) {
      const progress = r.age / r.maxAge;
      const rad = Math.floor(progress * 5);
      ctx.fillStyle = `rgba(180, 210, 215, ${(1 - progress) * 0.2})`;
      ctx.fillRect(Math.round(r.x + state.cameraX - rad), Math.round(r.y), 1, 1);
      ctx.fillRect(Math.round(r.x + state.cameraX + rad), Math.round(r.y), 1, 1);
    }

    // Protagonist walking right along sidewalk
    this.drawPlayerSprite(
      ctx,
      Math.round(state.playerX),
      Math.round(state.playerY),
      'right',
      state.walkFrame
    );

    // Falling rain
    ctx.fillStyle = 'rgba(185, 210, 225, 0.24)';
    for (const drop of this.rain) {
      const dx = Math.round(drop.x + state.cameraX);
      const dy = Math.round(drop.y);
      for (let s = 0; s < drop.len; s++) {
        ctx.fillRect(dx - Math.floor(s * 0.2), dy + s, 1, 1);
      }
    }

    ctx.restore();

    // Dynamic 2D Night Street Lighting
    const lCtx = this.lightCtx;
    const baseDark = Math.max(0.05, Math.min(0.4, 0.14 * state.brightness));
    const ambVal = Math.round(baseDark * 255);

    lCtx.globalCompositeOperation = 'source-over';
    lCtx.fillStyle = `rgb(${Math.round(ambVal * 0.8)}, ${Math.round(ambVal * 0.88)}, ${ambVal})`;
    lCtx.fillRect(0, 0, PIXEL_W, PIXEL_H);

    lCtx.globalCompositeOperation = 'lighter';
    for (const lx of [108, 325, 560]) {
      this.drawRadialLight(
        lCtx,
        lx - state.cameraX,
        102,
        118,
        'rgba(229, 154, 60, 0.62)'
      );
    }
    this.drawRadialLight(
      lCtx,
      465 - state.cameraX,
      70,
      58,
      `rgba(165, 210, 198, ${0.52 * busFlicker})`
    );
    this.drawRadialLight(lCtx, 53 - state.cameraX, 32, 34, 'rgba(210, 165, 95, 0.3)');

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'multiply';
    this.ctx.drawImage(this.lightCanvas, 0, 0);
    this.ctx.restore();

    const tCtx = target.getContext('2d');
    if (tCtx) {
      tCtx.imageSmoothingEnabled = false;
      tCtx.clearRect(0, 0, target.width, target.height);
      tCtx.drawImage(this.buffer, 0, 0, target.width, target.height);
    }
  }

  public renderLobby(target: HTMLCanvasElement, state: LobbyRenderState): void {
    const ctx = this.ctx;
    const t = state.time;
    const entryFlicker = this.computeFlicker(t, state.flickerEnabled, 2.5);

    ctx.save();
    ctx.clearRect(0, 0, PIXEL_W, PIXEL_H);

    // 1. Interior Hypermarket Floor (Checkered subtle cold linoleum tiles)
    for (let y = 0; y < PIXEL_H; y += 12) {
      for (let x = 0; x < PIXEL_W; x += 12) {
        const checker = (((x / 12) | 0) + ((y / 12) | 0)) % 2 === 0;
        ctx.fillStyle = checker ? '#252C30' : '#1F262A';
        ctx.fillRect(x, y, 12, 12);
        // Subtle grime/tile joint
        ctx.fillStyle = '#181E22';
        ctx.fillRect(x, y, 12, 1);
        ctx.fillRect(x, y, 1, 12);
      }
    }

    // Top wall (Interior partition looking into main hypermarket hall)
    ctx.fillStyle = '#13181E';
    ctx.fillRect(0, 0, PIXEL_W, 42);
    ctx.fillStyle = '#26303B';
    ctx.fillRect(0, 40, PIXEL_W, 3);

    // Wide open entrance archway into main sales floor (center top)
    ctx.fillStyle = '#2B3538';
    ctx.fillRect(176, 8, 128, 35);
    // Faint aisle signs visible beyond archway
    ctx.fillStyle = '#1B2228';
    ctx.fillRect(190, 12, 34, 24);
    ctx.fillRect(256, 12, 34, 24);
    ctx.fillStyle = '#D9EFE3';
    ctx.fillRect(196, 15, 22, 3);
    ctx.fillRect(262, 15, 22, 3);
    // Rope / temporary stanchion across archway ("Глава I — Далее в разработке")
    ctx.fillStyle = '#3F4A56';
    ctx.fillRect(180, 38, 3, 5);
    ctx.fillRect(296, 38, 3, 5);
    ctx.fillStyle = '#9E3838';
    ctx.fillRect(183, 39, 113, 2);

    // Left & Right structural walls
    ctx.fillStyle = '#11161C';
    ctx.fillRect(0, 0, 26, PIXEL_H);
    ctx.fillRect(PIXEL_W - 26, 0, 26, PIXEL_H);

    // Bottom glass wall & sliding doors (behind player, looking back out to dark parking lot)
    ctx.fillStyle = '#0B0E12';
    ctx.fillRect(26, PIXEL_H - 22, PIXEL_W - 52, 22);
    ctx.fillStyle = '#2A3440';
    ctx.fillRect(26, PIXEL_H - 24, PIXEL_W - 52, 3);
    // Glass doors outline at bottom center
    ctx.fillStyle = 'rgba(130, 180, 175, 0.16)';
    ctx.fillRect(204, PIXEL_H - 23, 72, 18);
    ctx.fillStyle = '#435162';
    ctx.fillRect(239, PIXEL_H - 23, 2, 18);

    // Welcome mat inside entrance
    ctx.fillStyle = '#1A1F24';
    ctx.fillRect(200, PIXEL_H - 58, 80, 28);
    ctx.fillStyle = '#2C333B';
    ctx.fillRect(204, PIXEL_H - 54, 72, 20);

    // Security anti-theft gates (EAS pillars) flanking entrance
    for (const gx of [192, 240, 284]) {
      ctx.fillStyle = '#3B4552';
      ctx.fillRect(gx, PIXEL_H - 86, 5, 16);
      ctx.fillStyle = '#E59A3C';
      ctx.fillRect(gx + 1, PIXEL_H - 85, 3, 2);
    }

    // Left bay: Nested shopping carts
    this.drawShoppingCartsRow(ctx, 46, 130, 5);
    ctx.fillStyle = '#2C3540';
    ctx.fillRect(36, 116, 86, 4); // corral rail

    // Top-left: Bulletin board & Store Map
    ctx.fillStyle = '#3C3226';
    ctx.fillRect(48, 32, 46, 14);
    ctx.fillStyle = '#C9BFA8';
    ctx.fillRect(52, 35, 12, 8);
    ctx.fillStyle = '#D98E48';
    ctx.fillRect(68, 36, 10, 6);
    ctx.fillStyle = '#9E3838';
    ctx.fillRect(82, 35, 8, 7);

    // Top-right: Glowing ATM & Coffee Terminal
    ctx.fillStyle = '#252E38';
    ctx.fillRect(356, 30, 26, 20);
    ctx.fillStyle = '#5EB097';
    ctx.fillRect(361, 35, 16, 9);

    ctx.fillStyle = '#2B2320';
    ctx.fillRect(394, 30, 28, 22);
    ctx.fillStyle = '#E59A3C';
    ctx.fillRect(399, 36, 12, 8);

    // Right wall: Locker / Staff Door hint ("Служебная" preview)
    ctx.fillStyle = '#1B2229';
    ctx.fillRect(PIXEL_W - 30, 120, 6, 36);
    ctx.fillStyle = '#C93B3B';
    ctx.fillRect(PIXEL_W - 31, 134, 2, 4); // little red lock LED

    // Subtle interactable highlight ring
    if (state.nearbyInteractable === 'carts') {
      this.drawInteractHighlight(ctx, 82, 138, t);
    } else if (state.nearbyInteractable === 'board') {
      this.drawInteractHighlight(ctx, 71, 52, t);
    } else if (state.nearbyInteractable === 'archway') {
      this.drawInteractHighlight(ctx, 240, 48, t);
    } else if (state.nearbyInteractable === 'atm') {
      this.drawInteractHighlight(ctx, 369, 54, t);
    }

    // Player character
    this.drawPlayerSprite(
      ctx,
      Math.round(state.playerX),
      Math.round(state.playerY),
      state.playerDir,
      state.walkFrame
    );

    ctx.restore();

    // Dynamic 2D Interior Lighting
    const lCtx = this.lightCtx;
    const baseAmb = Math.max(0.18, Math.min(0.65, 0.36 * state.brightness));
    const v = Math.round(baseAmb * 255);

    lCtx.globalCompositeOperation = 'source-over';
    lCtx.fillStyle = `rgb(${Math.round(v * 0.88)}, ${Math.round(v * 0.96)}, ${v})`;
    lCtx.fillRect(0, 0, PIXEL_W, PIXEL_H);

    lCtx.globalCompositeOperation = 'lighter';
    // Overhead fluorescent pools
    this.drawRadialLight(lCtx, 130, 95, 110, 'rgba(205, 232, 222, 0.65)');
    this.drawRadialLight(lCtx, 240, 72, 130, 'rgba(215, 240, 230, 0.78)');
    this.drawRadialLight(lCtx, 355, 95, 110, 'rgba(205, 232, 222, 0.65)');
    // Faulty flickering entrance tube
    this.drawRadialLight(
      lCtx,
      240,
      205,
      105,
      `rgba(195, 225, 215, ${0.65 * entryFlicker})`
    );
    // Warm amber terminal & security gate glows
    this.drawRadialLight(lCtx, 369, 44, 52, 'rgba(110, 200, 170, 0.45)');
    this.drawRadialLight(lCtx, 408, 44, 48, 'rgba(229, 154, 60, 0.42)');

    // Soft smartphone LED flash (Chapter 2 feature — softer, wider near-field warm-white glow)
    if (state.phoneFlashOn) {
      const angle =
        state.playerDir === 'right'
          ? 0
          : state.playerDir === 'down'
          ? Math.PI / 2
          : state.playerDir === 'left'
          ? Math.PI
          : -Math.PI / 2;
      // Soft ambient phone screen glow around player
      this.drawRadialLight(lCtx, state.playerX, state.playerY, 36, 'rgba(220, 234, 245, 0.28)');

      // Soft wide LED flash cone
      const grad = lCtx.createRadialGradient(
        state.playerX,
        state.playerY,
        6,
        state.playerX + Math.cos(angle) * 52,
        state.playerY + Math.sin(angle) * 52,
        78
      );
      grad.addColorStop(0, 'rgba(255, 246, 232, 0.44)');
      grad.addColorStop(0.6, 'rgba(255, 246, 232, 0.16)');
      grad.addColorStop(1, 'rgba(255, 246, 232, 0)');
      lCtx.fillStyle = grad;
      lCtx.beginPath();
      lCtx.moveTo(state.playerX, state.playerY);
      lCtx.arc(state.playerX, state.playerY, 96, angle - 0.62, angle + 0.62);
      lCtx.closePath();
      lCtx.fill();
    }

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'multiply';
    this.ctx.drawImage(this.lightCanvas, 0, 0);
    this.ctx.restore();

    const tCtx = target.getContext('2d');
    if (tCtx) {
      tCtx.imageSmoothingEnabled = false;
      tCtx.clearRect(0, 0, target.width, target.height);
      tCtx.drawImage(this.buffer, 0, 0, target.width, target.height);
    }
  }

  private drawInteractHighlight(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
    const pulse = Math.sin(t * 5) > 0 ? 1 : 0;
    ctx.fillStyle = '#E59A3C';
    ctx.fillRect(x - 1, y - 8 - pulse, 2, 4);
    ctx.fillRect(x - 1, y - 2 - pulse, 2, 1);
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

  private drawPuddle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    baseCol: string,
    reflectCol: string,
    intensity: number
  ): void {
    ctx.fillStyle = baseCol;
    ctx.fillRect(x + 4, y, w - 8, h);
    ctx.fillRect(x + 1, y + 3, w - 2, h - 6);
    ctx.fillRect(x, y + 5, w, h - 10);

    // Reflected neon/fluorescent shimmer lines
    ctx.fillStyle = reflectCol;
    ctx.globalAlpha = 0.25 * intensity;
    ctx.fillRect(x + 8, y + 4, w - 18, 2);
    ctx.fillRect(x + 12, y + 8, w - 26, 1);
    ctx.globalAlpha = 1;
  }

  private drawShoppingCartsRow(ctx: CanvasRenderingContext2D, x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const cx = x + i * 11;
      ctx.fillStyle = '#53606E';
      ctx.fillRect(cx, y, 10, 12);
      ctx.fillStyle = '#252C35';
      ctx.fillRect(cx + 1, y + 2, 8, 8);
      ctx.fillStyle = '#9E3838'; // red plastic handle
      ctx.fillRect(cx, y + 11, 10, 2);
    }
  }

  private drawParkedCar(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x - 2, y + 2, 34, 48);
    // Sedan body (top-down dark navy-grey)
    ctx.fillStyle = '#1D2430';
    ctx.fillRect(x, y, 30, 46);
    ctx.fillStyle = '#283242';
    ctx.fillRect(x + 2, y + 4, 26, 38);
    // Windshield & rear glass
    ctx.fillStyle = '#0E141C';
    ctx.fillRect(x + 4, y + 10, 22, 7);
    ctx.fillRect(x + 4, y + 30, 22, 6);
    // Roof
    ctx.fillStyle = '#222B38';
    ctx.fillRect(x + 4, y + 17, 22, 13);
    // Blinking hazard amber pixel
    if (Math.sin(t * 4.5) > 0.2) {
      ctx.fillStyle = '#E59A3C';
      ctx.fillRect(x + 2, y + 1, 3, 2);
      ctx.fillRect(x + 25, y + 1, 3, 2);
    }
  }

  private drawPixelText24(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
    ctx.fillStyle = color;
    // Simple crisp 3x5 pixel "M24" mark
    // M
    ctx.fillRect(x, y, 1, 6);
    ctx.fillRect(x + 4, y, 1, 6);
    ctx.fillRect(x + 1, y + 1, 1, 2);
    ctx.fillRect(x + 3, y + 1, 1, 2);
    ctx.fillRect(x + 2, y + 2, 1, 2);
    // Spacer + "24"
    const ox = x + 12;
    // 2
    ctx.fillRect(ox, y, 4, 1);
    ctx.fillRect(ox + 3, y + 1, 1, 2);
    ctx.fillRect(ox, y + 3, 4, 1);
    ctx.fillRect(ox, y + 4, 1, 1);
    ctx.fillRect(ox, y + 5, 4, 1);
    // 4
    const fx = ox + 7;
    ctx.fillRect(fx, y, 1, 3);
    ctx.fillRect(fx + 3, y, 1, 6);
    ctx.fillRect(fx, y + 3, 4, 1);

    // /7
    const sx = fx + 7;
    ctx.fillRect(sx + 1, y + 4, 1, 2);
    ctx.fillRect(sx + 2, y + 2, 1, 2);
    ctx.fillRect(sx + 3, y, 1, 2);
    const sev = sx + 6;
    ctx.fillRect(sev, y, 4, 1);
    ctx.fillRect(sev + 3, y + 1, 1, 2);
    ctx.fillRect(sev + 2, y + 3, 1, 3);
  }

  private drawPlayerSprite(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    dir: 'up' | 'down' | 'left' | 'right',
    walkFrame: number
  ): void {
    const bob = Math.abs(Math.sin(walkFrame)) > 0.5 ? 1 : 0;
    const stepL = Math.sin(walkFrame) > 0.35 ? 1 : 0;
    const stepR = Math.sin(walkFrame) < -0.35 ? 1 : 0;

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(x - 6, y + 3, 12, 5);

    // Boots
    ctx.fillStyle = '#0D1015';
    ctx.fillRect(x - 4, y + 2 - stepL, 3, 3);
    ctx.fillRect(x + 1, y + 2 - stepR, 3, 3);

    // Jacket torso (muted olive-slate parka)
    ctx.fillStyle = '#313F3C';
    ctx.fillRect(x - 5, y - 6 - bob, 10, 9);
    ctx.fillStyle = '#40524E';
    ctx.fillRect(x - 4, y - 5 - bob, 8, 6);

    // Head / Hair
    ctx.fillStyle = '#C9A890'; // skin
    ctx.fillRect(x - 3, y - 11 - bob, 6, 5);
    ctx.fillStyle = '#1B1A1F'; // dark hair
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
  }
}
