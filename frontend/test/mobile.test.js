import { describe, expect, it } from 'vitest';
import { isMobileDevice } from '../src/mobile.js';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15';

describe('detección de celular (Coming soon)', () => {
  it('celulares por user agent', () => {
    expect(isMobileDevice({ userAgent: IPHONE })).toBe(true);
    expect(isMobileDevice({ userAgent: ANDROID })).toBe(true);
  });

  it('PC con mouse sigue al juego, aunque tenga pantalla táctil', () => {
    expect(isMobileDevice({ userAgent: WINDOWS, finePointer: true })).toBe(false);
    expect(isMobileDevice({ userAgent: WINDOWS, coarsePointer: true, finePointer: true })).toBe(false);
  });

  it('iPad que se presenta como Mac: solo táctil → celular', () => {
    expect(isMobileDevice({ userAgent: MAC, coarsePointer: true, finePointer: false })).toBe(true);
  });

  it('?mobile y ?desktop fuerzan el resultado', () => {
    expect(isMobileDevice({ search: '?mobile', userAgent: WINDOWS, finePointer: true })).toBe(true);
    expect(isMobileDevice({ search: '?desktop', userAgent: IPHONE })).toBe(false);
  });
});
