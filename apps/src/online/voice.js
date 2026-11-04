// Micro del jugador para la voz en sala (#68): permiso, silenciar y nivel de voz.
// Enviar el audio al otro PC (WebRTC + señalización) todavía no existe: ver docs/online.md.
import { Emitter } from './emitter.js';

/** 'unsupported' | 'off' | 'asking' | 'on' | 'denied' */
export class VoiceChat {
  constructor({ mediaDevices = globalThis.navigator?.mediaDevices, AudioContextCtor = globalThis.AudioContext } = {}) {
    this._media = mediaDevices;
    this._AudioContext = AudioContextCtor;
    this.state = mediaDevices?.getUserMedia ? 'off' : 'unsupported';
    this.muted = false;
    this.stream = null;
    this._changed = new Emitter();
    this._gen = 0;
    this._ctx = null;
    this._analyser = null;
  }

  onChange(fn) {
    return this._changed.on(fn);
  }

  /** Pide el micro (el navegador muestra su permiso). Se puede reintentar tras 'denied'. */
  async start() {
    if (this.state !== 'off' && this.state !== 'denied') return this.state;
    const gen = ++this._gen;
    this._set('asking');
    let stream;
    try {
      stream = await this._media.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      if (gen === this._gen) this._set('denied');
      return this.state;
    }
    // Se llamó a stop() mientras el navegador preguntaba.
    if (gen !== this._gen) {
      for (const t of stream.getTracks()) t.stop();
      return this.state;
    }
    this.stream = stream;
    this._applyMute();
    this._setupMeter();
    this._set('on');
    return this.state;
  }

  setMuted(muted) {
    this.muted = muted;
    this._applyMute();
    this._changed.emit();
  }

  toggleMute() {
    this.setMuted(!this.muted);
  }

  /** 0..1: qué tan fuerte se está hablando ahora (0 si está silenciado o apagado). */
  level() {
    if (!this._analyser || this.muted || this.state !== 'on') return 0;
    this._analyser.getByteTimeDomainData(this._buf);
    let sum = 0;
    for (const v of this._buf) {
      const d = (v - 128) / 128;
      sum += d * d;
    }
    return Math.min(1, Math.sqrt(sum / this._buf.length) * 4);
  }

  stop() {
    this._gen++;
    for (const t of this.stream?.getTracks() ?? []) t.stop();
    this.stream = null;
    this._ctx?.close?.();
    this._ctx = this._analyser = null;
    this.muted = false;
    if (this.state !== 'unsupported') this._set('off');
  }

  _applyMute() {
    for (const t of this.stream?.getAudioTracks() ?? []) t.enabled = !this.muted;
  }

  _setupMeter() {
    if (!this._AudioContext) return;
    try {
      this._ctx = new this._AudioContext();
      this._analyser = this._ctx.createAnalyser();
      this._analyser.fftSize = 512;
      this._ctx.createMediaStreamSource(this.stream).connect(this._analyser);
      this._buf = new Uint8Array(this._analyser.fftSize);
    } catch {
      this._analyser = null;
    }
  }

  _set(state) {
    this.state = state;
    this._changed.emit();
  }
}
