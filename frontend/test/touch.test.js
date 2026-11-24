import { describe, expect, it } from 'vitest';
import { STICK_RADIUS, mergeInputs, stickVector } from '../src/touch.js';

describe('joystick táctil', () => {
  it('arriba en la pantalla = avanzar (-z), derecha = +x', () => {
    expect(stickVector(0, -STICK_RADIUS)).toEqual({ x: 0, z: -1 });
    const right = stickVector(STICK_RADIUS, 0);
    expect(right.x).toBeCloseTo(1);
    expect(right.z).toBeCloseTo(0);
  });

  it('zona muerta en el centro y tope en el borde', () => {
    expect(stickVector(2, 2)).toEqual({ x: 0, z: 0 });
    const far = stickVector(STICK_RADIUS * 3, 0);
    expect(far.x).toBeCloseTo(1);
  });

  it('a medio camino es analógico (camina más lento)', () => {
    const half = stickVector(STICK_RADIUS / 2, 0);
    expect(half.x).toBeGreaterThan(0.3);
    expect(half.x).toBeLessThan(0.7);
  });
});

describe('teclado + táctil', () => {
  const idle = { x: 0, z: 0, jumpPressed: false, jumpHeld: false };

  it('sin táctil queda el teclado', () => {
    expect(mergeInputs(idle, null)).toBe(idle);
  });

  it('gana el que empuja más fuerte; saltar con cualquiera', () => {
    const keys = { x: 1, z: 0, jumpPressed: false, jumpHeld: false };
    const touch = { x: 0.2, z: -0.8, jumpPressed: true, jumpHeld: true };
    expect(mergeInputs(keys, touch)).toEqual({ x: 1, z: -0.8, jumpPressed: true, jumpHeld: true });
  });
});
