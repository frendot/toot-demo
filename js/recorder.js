// Press-to-record (spec S1, 6 Lab AC1-3, 12 Press-to-record).
// The mic is requested ONLY on Record press and every track is stopped on release,
// on pointercancel, when the page is hidden, or at 6 s. Audio never leaves the device.
import { getCtx, setAudioSessionType } from './audio.js';
import { isIOS } from './util.js';

export const MAX_RECORD_MS = 6000;
const TRIM_MS = 150;

// QA hook: lets automated tests confirm no mic tracks stay live.
window.__tootMic = { liveTracks: 0, requests: 0 };

let workletReady = null;

export function pickRecorderMime() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return null;
  const safari = isIOS() || /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
  const order = safari
    ? ['audio/mp4', 'audio/mp4;codecs=mp4a.40.2', 'audio/webm;codecs=opus', 'audio/webm']
    : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return order.find((m) => MediaRecorder.isTypeSupported(m)) || null;
}

export function micSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

export class HoldRecorder {
  constructor({ onLevel, onAutoStop } = {}) {
    this.onLevel = onLevel;
    this.onAutoStop = onAutoStop;
    this.state = 'idle';
  }

  async start() {
    if (this.state !== 'idle') return;
    this.state = 'starting';
    this.chunks = [];
    this.recChunks = [];
    this.stopRequested = false;
    this.t0 = performance.now();
    this.autoTimer = setTimeout(() => { this.onAutoStop && this.onAutoStop(); }, MAX_RECORD_MS);
    this.onHidden = () => { if (document.visibilityState === 'hidden') this.onAutoStop && this.onAutoStop(); };
    document.addEventListener('visibilitychange', this.onHidden);
    const ctx = getCtx();
    setAudioSessionType('play-and-record');
    try { if (ctx.state !== 'running') await ctx.resume(); } catch (e) { /* ignore */ }
    let stream;
    try {
      window.__tootMic.requests++;
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } });
    } catch (err) {
      this.cleanup();
      this.state = 'idle';
      throw err;
    }
    this.stream = stream;
    window.__tootMic.liveTracks = stream.getTracks().length;
    if (this.stopRequested) { // released before the mic was ready
      this.cleanup();
      this.state = 'idle';
      return;
    }
    this.sampleRate = ctx.sampleRate;
    this.src = ctx.createMediaStreamSource(stream);
    this.sink = ctx.createGain();
    this.sink.gain.value = 0; // silent: never play the mic back
    this.sink.connect(ctx.destination);
    const onChunk = (ch) => {
      this.chunks.push(ch);
      if (this.onLevel) {
        let m = 0; for (let i = 0; i < ch.length; i += 8) m = Math.max(m, Math.abs(ch[i]));
        this.onLevel(m);
      }
    };
    try {
      if (!ctx.audioWorklet) throw new Error('no worklet');
      if (!workletReady) workletReady = ctx.audioWorklet.addModule('js/recorder-worklet.js');
      await workletReady;
      this.node = new AudioWorkletNode(ctx, 'pcm-capture');
      this.node.port.onmessage = (e) => onChunk(e.data);
    } catch (e) {
      // Fallback for engines without AudioWorklet
      this.node = ctx.createScriptProcessor(2048, 1, 1);
      this.node.onaudioprocess = (ev) => onChunk(new Float32Array(ev.inputBuffer.getChannelData(0)));
    }
    if (this.stopRequested) { this.cleanup(); this.state = 'idle'; return; }
    this.src.connect(this.node);
    this.node.connect(this.sink);
    // Optional encoded copy, kept in memory only and stored only if the user taps Save.
    this.mime = pickRecorderMime();
    if (this.mime) {
      try {
        this.mr = new MediaRecorder(stream, { mimeType: this.mime });
        this.mr.ondataavailable = (e) => { if (e.data && e.data.size) this.recChunks.push(e.data); };
        this.mr.start();
      } catch (e) { this.mr = null; }
    }
    this.state = 'recording';
  }

  // Stop everything and return the captured audio (in memory).
  async stop() {
    this.stopRequested = true;
    if (this.state === 'starting') { this.cleanup(); return null; }
    if (this.state !== 'recording') { this.cleanup(); return null; }
    const mrDone = this.mr && this.mr.state !== 'inactive'
      ? new Promise((res) => { this.mr.onstop = res; try { this.mr.stop(); } catch (e) { res(); } })
      : Promise.resolve();
    this.cleanup();
    await mrDone;
    const total = this.chunks.reduce((a, c) => a + c.length, 0);
    const pcm = new Float32Array(total);
    let o = 0;
    for (const c of this.chunks) { pcm.set(c, o); o += c.length; }
    const trim = Math.floor((TRIM_MS / 1000) * this.sampleRate);
    const samples = pcm.length > trim * 2 ? pcm.slice(trim) : pcm;
    const blob = this.recChunks.length ? new Blob(this.recChunks, { type: this.mime }) : null;
    this.chunks = []; this.recChunks = [];
    this.state = 'idle';
    return { samples, sampleRate: this.sampleRate, blob, mime: blob ? this.mime : null, ms: Math.round(performance.now() - this.t0) };
  }

  cleanup() {
    clearTimeout(this.autoTimer);
    if (this.onHidden) document.removeEventListener('visibilitychange', this.onHidden);
    try { this.src && this.src.disconnect(); } catch (e) { /* ignore */ }
    try { this.node && this.node.disconnect(); } catch (e) { /* ignore */ }
    try { this.sink && this.sink.disconnect(); } catch (e) { /* ignore */ }
    if (this.node && this.node.port) this.node.port.onmessage = null;
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null; this.src = null; this.node = null; this.sink = null;
    window.__tootMic.liveTracks = 0;
    setAudioSessionType('playback');
  }
}

// Encode PCM as 16-bit WAV (used only if MediaRecorder is unavailable and the user taps Save).
export function pcmToWav(samples, sampleRate) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  return new Blob([buf], { type: 'audio/wav' });
}
