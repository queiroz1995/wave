"use client";

class AudioSynth {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playClick() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.05);
      
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {
      console.warn("Audio play blocked by browser policy", e);
    }
  }

  playWin() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      // Acorde maior ascendente futurista (C5 -> E5 -> G5 -> C6)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, index) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + index * 0.08);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + index * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.3);
        
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        
        osc.start(now + index * 0.08);
        osc.stop(now + index * 0.08 + 0.3);
      });
    } catch (e) {
      console.warn(e);
    }
  }

  playLoss() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      // Som descendente de aviso discreto
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.25);
      
      // Filtro passa-baixas para deixar o som mais suave/aveludado
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(now + 0.3);
    } catch (e) {
      console.warn(e);
    }
  }

  playStart() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      // Som de inicialização de sistema (Power Up)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.4);
      
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(now + 0.4);
    } catch (e) {
      console.warn(e);
    }
  }
}

export const audioSynth = new AudioSynth();