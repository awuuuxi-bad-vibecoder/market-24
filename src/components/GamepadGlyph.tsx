import React from 'react';
import { GamepadLayout, GamepadSnapshot } from '../types/game';

export type LogicalButton = 'CONFIRM' | 'CANCEL' | 'INTERACT' | 'FLASHLIGHT' | 'SPRINT' | 'PAUSE';

interface GlyphProps {
  layout: GamepadLayout;
  button: LogicalButton;
  size?: 'sm' | 'md';
}

export const GamepadGlyph: React.FC<GlyphProps> = ({ layout, button, size = 'sm' }) => {
  const dim = size === 'sm' ? 'w-5 h-5 text-[11px]' : 'w-6 h-6 text-xs';

  const getLabelAndColor = (): { label: string; color: string; shape: 'circle' | 'rect' } => {
    if (button === 'SPRINT') {
      return {
        label: layout === 'playstation' ? 'L1' : layout === 'nintendo' ? 'L' : 'LB',
        color: 'text-[#E6ECEF] border-[#E6ECEF]/35',
        shape: 'rect',
      };
    }
    if (button === 'PAUSE') {
      return {
        label: layout === 'playstation' ? 'OPT' : layout === 'nintendo' ? '+' : '≡',
        color: 'text-[#E6ECEF] border-[#E6ECEF]/35',
        shape: 'rect',
      };
    }

    if (layout === 'playstation') {
      switch (button) {
        case 'CONFIRM':
          return { label: '✕', color: 'text-[#7AA8E8] border-[#7AA8E8]/50', shape: 'circle' };
        case 'CANCEL':
          return { label: '○', color: 'text-[#E06C75] border-[#E06C75]/50', shape: 'circle' };
        case 'INTERACT':
          return { label: '□', color: 'text-[#D19A66] border-[#D19A66]/50', shape: 'circle' };
        case 'FLASHLIGHT':
          return { label: '△', color: 'text-[#89C29B] border-[#89C29B]/50', shape: 'circle' };
      }
    }

    if (layout === 'xbox') {
      switch (button) {
        case 'CONFIRM':
          return { label: 'A', color: 'text-[#89C29B] border-[#89C29B]/50', shape: 'circle' };
        case 'CANCEL':
          return { label: 'B', color: 'text-[#E06C75] border-[#E06C75]/50', shape: 'circle' };
        case 'INTERACT':
          return { label: 'X', color: 'text-[#7AA8E8] border-[#7AA8E8]/50', shape: 'circle' };
        case 'FLASHLIGHT':
          return { label: 'Y', color: 'text-[#E59A3C] border-[#E59A3C]/50', shape: 'circle' };
      }
    }

    // nintendo
    switch (button) {
      case 'CONFIRM':
        return { label: 'A', color: 'text-[#E6ECEF] border-[#E59A3C]/60', shape: 'circle' };
      case 'CANCEL':
        return { label: 'B', color: 'text-[#9BA6B2] border-[#E6ECEF]/35', shape: 'circle' };
      case 'INTERACT':
        return { label: 'Y', color: 'text-[#E6ECEF] border-[#E6ECEF]/35', shape: 'circle' };
      case 'FLASHLIGHT':
        return { label: 'X', color: 'text-[#E6ECEF] border-[#E6ECEF]/35', shape: 'circle' };
    }
  };

  const { label, color, shape } = getLabelAndColor();

  return (
    <span
      className={`inline-flex items-center justify-center font-mono font-semibold leading-none border bg-[#0E1217] shrink-0 select-none ${
        shape === 'circle' ? `${dim} rounded-full` : 'px-1.5 h-5 text-[10px] rounded-[3px]'
      } ${color}`}
    >
      {label}
    </span>
  );
};

interface ControllerVisualizerProps {
  layout: GamepadLayout;
  snapshot: GamepadSnapshot;
}

export const ControllerVisualizer: React.FC<ControllerVisualizerProps> = ({ layout, snapshot }) => {
  const b = snapshot.buttons;
  const [lx, ly, rx, ry] = snapshot.axes;

  const faceLabels =
    layout === 'playstation'
      ? { bottom: '✕', right: '○', left: '□', top: '△' }
      : layout === 'xbox'
      ? { bottom: 'A', right: 'B', left: 'X', top: 'Y' }
      : { bottom: 'B', right: 'A', left: 'Y', top: 'X' };

  const shoulderL = layout === 'playstation' ? 'L1' : layout === 'nintendo' ? 'L' : 'LB';
  const shoulderR = layout === 'playstation' ? 'R1' : layout === 'nintendo' ? 'R' : 'RB';

  const activeFill = '#E59A3C';
  const idleFill = '#1A212B';
  const strokeCol = '#3A4656';

  return (
    <div className="relative flex flex-col items-center justify-center bg-[#0B0E12] border border-white/10 rounded-md p-4">
      <svg viewBox="0 0 360 200" className="w-full max-w-[340px] h-auto select-none">
        {/* Shoulder buttons L1 / R1 */}
        <rect
          x="52"
          y="22"
          width="58"
          height="14"
          rx="4"
          fill={b[4] ? activeFill : idleFill}
          stroke={strokeCol}
          strokeWidth="1.5"
        />
        <text x="81" y="32" textAnchor="middle" fill={b[4] ? '#090B0E' : '#8E9AA8'} fontSize="9" fontFamily="IBM Plex Mono">
          {shoulderL}
        </text>

        <rect
          x="250"
          y="22"
          width="58"
          height="14"
          rx="4"
          fill={b[5] ? activeFill : idleFill}
          stroke={strokeCol}
          strokeWidth="1.5"
        />
        <text x="279" y="32" textAnchor="middle" fill={b[5] ? '#090B0E' : '#8E9AA8'} fontSize="9" fontFamily="IBM Plex Mono">
          {shoulderR}
        </text>

        {/* Triggers L2 / R2 bars */}
        <rect x="62" y="10" width="38" height="7" rx="2" fill={b[6] ? activeFill : '#141920'} stroke={strokeCol} strokeWidth="1" />
        <rect x="260" y="10" width="38" height="7" rx="2" fill={b[7] ? activeFill : '#141920'} stroke={strokeCol} strokeWidth="1" />

        {/* Controller Silhouette */}
        <path
          d="M 75 40 L 285 40 C 315 40 335 72 340 125 C 343 156 325 178 302 178 C 282 178 268 148 250 135 L 110 135 C 92 148 78 178 58 178 C 35 178 17 156 20 125 C 25 72 45 40 75 40 Z"
          fill="#12171E"
          stroke="#2B3543"
          strokeWidth="2"
        />

        {/* D-Pad (Left) */}
        <g transform="translate(86, 86)">
          {/* Up (12) */}
          <rect x="-7" y="-22" width="14" height="15" rx="2" fill={b[12] ? activeFill : idleFill} stroke={strokeCol} />
          {/* Down (13) */}
          <rect x="-7" y="7" width="14" height="15" rx="2" fill={b[13] ? activeFill : idleFill} stroke={strokeCol} />
          {/* Left (14) */}
          <rect x="-22" y="-7" width="15" height="14" rx="2" fill={b[14] ? activeFill : idleFill} stroke={strokeCol} />
          {/* Right (15) */}
          <rect x="7" y="-7" width="15" height="14" rx="2" fill={b[15] ? activeFill : idleFill} stroke={strokeCol} />
          <rect x="-7" y="-7" width="14" height="14" fill="#161C24" />
        </g>

        {/* Left Stick */}
        <g transform="translate(136, 114)">
          <circle r="16" fill="#0B0E12" stroke={strokeCol} strokeWidth="1.5" />
          <circle
            cx={lx * 8}
            cy={ly * 8}
            r="10"
            fill={b[10] ? activeFill : '#222B37'}
            stroke="#485669"
            strokeWidth="1.5"
          />
          <text y="28" textAnchor="middle" fill="#5D6B7C" fontSize="8" fontFamily="IBM Plex Mono">L</text>
        </g>

        {/* Right Stick */}
        <g transform="translate(224, 114)">
          <circle r="16" fill="#0B0E12" stroke={strokeCol} strokeWidth="1.5" />
          <circle
            cx={rx * 8}
            cy={ry * 8}
            r="10"
            fill={b[11] ? activeFill : '#222B37'}
            stroke="#485669"
            strokeWidth="1.5"
          />
          <text y="28" textAnchor="middle" fill="#5D6B7C" fontSize="8" fontFamily="IBM Plex Mono">R</text>
        </g>

        {/* Center Start / Select */}
        <rect x="155" y="72" width="14" height="7" rx="2" fill={b[8] ? activeFill : idleFill} stroke={strokeCol} />
        <rect x="191" y="72" width="14" height="7" rx="2" fill={b[9] ? activeFill : idleFill} stroke={strokeCol} />

        {/* Face Buttons */}
        <g transform="translate(274, 86)">
          {/* Top (3) */}
          <circle cx="0" cy="-18" r="9.5" fill={b[3] ? activeFill : idleFill} stroke={strokeCol} strokeWidth="1.5" />
          <text x="0" y="-14.5" textAnchor="middle" fill={b[3] ? '#090B0E' : '#DCE4EC'} fontSize="9.5" fontWeight="600" fontFamily="IBM Plex Mono">
            {faceLabels.top}
          </text>

          {/* Bottom (0) */}
          <circle cx="0" cy="18" r="9.5" fill={b[0] ? activeFill : idleFill} stroke={strokeCol} strokeWidth="1.5" />
          <text x="0" y="21.5" textAnchor="middle" fill={b[0] ? '#090B0E' : '#DCE4EC'} fontSize="9.5" fontWeight="600" fontFamily="IBM Plex Mono">
            {faceLabels.bottom}
          </text>

          {/* Left (2) */}
          <circle cx="-18" cy="0" r="9.5" fill={b[2] ? activeFill : idleFill} stroke={strokeCol} strokeWidth="1.5" />
          <text x="-18" y="3.5" textAnchor="middle" fill={b[2] ? '#090B0E' : '#DCE4EC'} fontSize="9.5" fontWeight="600" fontFamily="IBM Plex Mono">
            {faceLabels.left}
          </text>

          {/* Right (1) */}
          <circle cx="18" cy="0" r="9.5" fill={b[1] ? activeFill : idleFill} stroke={strokeCol} strokeWidth="1.5" />
          <text x="18" y="3.5" textAnchor="middle" fill={b[1] ? '#090B0E' : '#DCE4EC'} fontSize="9.5" fontWeight="600" fontFamily="IBM Plex Mono">
            {faceLabels.right}
          </text>
        </g>
      </svg>

      <div className="mt-2 flex items-center gap-3 text-xs font-mono text-[#7F8C9B] tabular-nums">
        <span>LX {lx.toFixed(2)}</span>
        <span aria-hidden="true">·</span>
        <span>LY {ly.toFixed(2)}</span>
        <span aria-hidden="true">·</span>
        <span>{snapshot.connected ? 'Сигнал активен' : 'Ожидание ввода'}</span>
      </div>
    </div>
  );
};
