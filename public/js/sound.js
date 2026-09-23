// Sound utility using Web Audio API to play programmatically synthesized sounds without needing external assets.
class SoundManager {
  constructor() {
    this.ctx = null;
    this.compressor = null;
    this.isPlayingAlarm = false;
    this.isVibrating = false;
    this.vibrationInterval = null;
    this.alarmInterval = null;
    this.alarmTimeout = null;
    this.lastStartedAt = 0;
    this.activeOscillators = [];
    this.onAlarmStartListeners = [];
    this.onAlarmStopListeners = [];
  }

  init() {
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          try {
            this.compressor = this.ctx.createDynamicsCompressor();
            this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
            this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
            this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
            this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
            this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
            this.compressor.connect(this.ctx.destination);
          } catch(e) {
            this.compressor = null;
          }
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch(e) {
      console.warn('AudioContext init notice:', e);
    }
  }

  getDestination() {
    return this.compressor || (this.ctx ? this.ctx.destination : null);
  }

  onAlarmStart(cb) {
    if (typeof cb === 'function') this.onAlarmStartListeners.push(cb);
  }

  onAlarmStop(cb) {
    if (typeof cb === 'function') this.onAlarmStopListeners.push(cb);
  }

  // Synthesizes an ultra-loud, piercing, scandalous kitchen alert burst
  playLoudAlarmBurst() {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      const dest = this.getDestination();
      if (!dest) return;
      const now = this.ctx.currentTime;

      // 4 Rapid, penetrating beeps/alarm pulses (Strobe Buzzer)
      const pulses = [
        { start: 0.00, duration: 0.14, freq: 1100, highFreq: 2200 },
        { start: 0.18, duration: 0.14, freq: 1400, highFreq: 2800 },
        { start: 0.36, duration: 0.14, freq: 1750, highFreq: 3500 },
        { start: 0.54, duration: 0.30, freq: 2100, highFreq: 4200 }
      ];

      pulses.forEach(p => {
        const pulseStart = now + p.start;
        const pulseEnd = pulseStart + p.duration;

        // Primary piercing tone (Square wave for maximum penetration)
        const oscSquare = this.ctx.createOscillator();
        const gainSquare = this.ctx.createGain();
        oscSquare.type = 'square';
        oscSquare.frequency.setValueAtTime(p.freq, pulseStart);
        oscSquare.frequency.exponentialRampToValueAtTime(p.freq * 1.15, pulseEnd);

        gainSquare.gain.setValueAtTime(0.001, pulseStart);
        gainSquare.gain.linearRampToValueAtTime(0.60, pulseStart + 0.02);
        gainSquare.gain.exponentialRampToValueAtTime(0.001, pulseEnd);

        oscSquare.connect(gainSquare);
        gainSquare.connect(dest);

        oscSquare.start(pulseStart);
        oscSquare.stop(pulseEnd);
        this.activeOscillators.push(oscSquare);

        // Secondary rich harmonic tone (Sawtooth wave)
        const oscSaw = this.ctx.createOscillator();
        const gainSaw = this.ctx.createGain();
        oscSaw.type = 'sawtooth';
        oscSaw.frequency.setValueAtTime(p.highFreq, pulseStart);

        gainSaw.gain.setValueAtTime(0.001, pulseStart);
        gainSaw.gain.linearRampToValueAtTime(0.40, pulseStart + 0.02);
        gainSaw.gain.exponentialRampToValueAtTime(0.001, pulseEnd);

        oscSaw.connect(gainSaw);
        gainSaw.connect(dest);

        oscSaw.start(pulseStart);
        oscSaw.stop(pulseEnd);
        this.activeOscillators.push(oscSaw);
      });

      // Cleanup finished oscillator references
      setTimeout(() => {
        this.activeOscillators = this.activeOscillators.filter(o => {
          try { return o.playbackState !== 3; } catch(e) { return false; }
        });
      }, 1500);

      // Trigger mobile vibration if available
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([140, 40, 140, 40, 140, 40, 300]);
        } catch(e) {}
      }
    } catch(e) {
      console.warn('Error in playLoudAlarmBurst:', e);
    }
  }

  // Starts a continuous, uninterrupted aggressive vibration loop until stopped
  startContinuousVibration() {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;
    this.stopContinuousVibration();
    this.isVibrating = true;

    // Pattern: 1200ms intense vibration, 200ms pause, 1200ms intense vibration, 200ms pause, 1500ms continuous vibration, 400ms pause
    // Total cycle length: 4500ms
    const intensePattern = [1200, 200, 1200, 200, 1500, 400];

    const runVibrate = () => {
      if (!this.isVibrating) return;
      try {
        navigator.vibrate(intensePattern);
      } catch (e) {
        console.warn('Vibration API error:', e);
      }
    };

    runVibrate();
    // Continuous loop: re-trigger pattern immediately every 4.5 seconds
    this.vibrationInterval = setInterval(runVibrate, 4500);
  }

  // Immediately halts any active vibration loop
  stopContinuousVibration() {
    this.isVibrating = false;
    if (this.vibrationInterval) {
      clearInterval(this.vibrationInterval);
      this.vibrationInterval = null;
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(0);
      } catch(e) {}
    }
  }

  // Starts an insistent, penetrating alarm & continuous vibration loop until cook acknowledges / accepts order
  startPersistentOrderAlarm(durationSeconds = 120) {
    try {
      this.init();
      this.lastStartedAt = Date.now();

      // Clear any prior interval/timeout cleanly
      if (this.alarmInterval) {
        clearInterval(this.alarmInterval);
        this.alarmInterval = null;
      }
      if (this.alarmTimeout) {
        clearTimeout(this.alarmTimeout);
        this.alarmTimeout = null;
      }

      this.isPlayingAlarm = true;

      // 1. Start continuous uninterrupted aggressive vibration
      this.startContinuousVibration();

      // 2. Play first burst immediately
      this.playLoudAlarmBurst();

      // Repeat burst every 2.5 seconds insistently
      this.alarmInterval = setInterval(() => {
        if (this.isPlayingAlarm) {
          this.playLoudAlarmBurst();
        } else {
          clearInterval(this.alarmInterval);
          this.alarmInterval = null;
        }
      }, 2500);

      // Timeout after durationSeconds (default 120s = 2 minutes) if not stopped manually
      if (durationSeconds > 0) {
        this.alarmTimeout = setTimeout(() => {
          this.stopAlarm();
        }, durationSeconds * 1000);
      }

      // Notify UI listeners
      this.onAlarmStartListeners.forEach(cb => {
        try { cb(); } catch(e) {}
      });
    } catch(e) {
      console.warn('Error starting persistent order alarm:', e);
    }
  }

  // Toggle alarm state cleanly for testing / manual controls
  toggleAlarm(durationSeconds = 10) {
    if (this.isPlayingAlarm) {
      this.stopAlarm();
    } else {
      this.startPersistentOrderAlarm(durationSeconds);
    }
  }

  // Immediately silences the alarm and stops continuous vibration
  stopAlarm() {
    this.isPlayingAlarm = false;

    // Immediately stop continuous vibration loop
    this.stopContinuousVibration();

    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
    if (this.alarmTimeout) {
      clearTimeout(this.alarmTimeout);
      this.alarmTimeout = null;
    }

    // Stop active oscillators safely
    this.activeOscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch(e) {}
    });
    this.activeOscillators = [];

    // Notify UI listeners
    this.onAlarmStopListeners.forEach(cb => {
      try { cb(); } catch(e) {}
    });
  }

  // Synthesizes a clean "ding" (service bell) sound
  playBell() {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      const dest = this.getDestination() || this.ctx.destination;
      const now = this.ctx.currentTime;
      
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1200, now);
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc1.connect(gain1);
      gain1.connect(dest);
      
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1500, now);
      gain2.gain.setValueAtTime(0.2, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc2.connect(gain2);
      gain2.connect(dest);

      osc1.start(now);
      osc1.stop(now + 1.2);
      osc2.start(now);
      osc2.stop(now + 0.8);
    } catch (e) {
      console.warn('Web Audio API playBell error:', e);
    }
  }

  // 🍔 Sound Channel 1: Food / Restaurant Order (Cash Register "Cha-ching" + Chef's Bell)
  playFoodOrderSound() {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      const dest = this.getDestination() || this.ctx.destination;
      const now = this.ctx.currentTime;

      // 1. Cha-ching coin register slide
      const oscCoin1 = this.ctx.createOscillator();
      const gainCoin1 = this.ctx.createGain();
      oscCoin1.type = 'triangle';
      oscCoin1.frequency.setValueAtTime(1900, now);
      oscCoin1.frequency.exponentialRampToValueAtTime(3200, now + 0.12);
      gainCoin1.gain.setValueAtTime(0.001, now);
      gainCoin1.gain.linearRampToValueAtTime(0.45, now + 0.02);
      gainCoin1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      oscCoin1.connect(gainCoin1);
      gainCoin1.connect(dest);
      oscCoin1.start(now);
      oscCoin1.stop(now + 0.25);

      // 2. High chime resonance
      const oscCoin2 = this.ctx.createOscillator();
      const gainCoin2 = this.ctx.createGain();
      oscCoin2.type = 'sine';
      oscCoin2.frequency.setValueAtTime(3600, now + 0.08);
      gainCoin2.gain.setValueAtTime(0.001, now + 0.08);
      gainCoin2.gain.linearRampToValueAtTime(0.50, now + 0.10);
      gainCoin2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      oscCoin2.connect(gainCoin2);
      gainCoin2.connect(dest);
      oscCoin2.start(now + 0.08);
      oscCoin2.stop(now + 0.65);

      // 3. Chef's double bell ring (C6 & E6)
      const oscBell = this.ctx.createOscillator();
      const gainBell = this.ctx.createGain();
      oscBell.type = 'sine';
      oscBell.frequency.setValueAtTime(1046.50, now + 0.20);
      gainBell.gain.setValueAtTime(0.001, now + 0.20);
      gainBell.gain.linearRampToValueAtTime(0.40, now + 0.22);
      gainBell.gain.exponentialRampToValueAtTime(0.001, now + 1.10);
      oscBell.connect(gainBell);
      gainBell.connect(dest);
      oscBell.start(now + 0.20);
      oscBell.stop(now + 1.10);

      // Mobile vibration pattern: short happy pulses
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 60, 100, 60, 250]);
      }
    } catch (e) {
      console.warn('playFoodOrderSound error:', e);
    }
  }

  // 🛵 Sound Channel 2: Vehicle Ride / Mototaxi Request (Acoustic horn "Beep-Beep" + Rev)
  playRideOrderSound() {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      const dest = this.getDestination() || this.ctx.destination;
      const now = this.ctx.currentTime;

      // Play double horn pulse (440Hz + 554Hz)
      const playHornBeep = (startTime, duration) => {
        [440, 554.37].forEach(f => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, startTime);
          osc.frequency.linearRampToValueAtTime(f * 1.04, startTime + duration); // Doppler effect

          gain.gain.setValueAtTime(0.001, startTime);
          gain.gain.linearRampToValueAtTime(0.35, startTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

          osc.connect(gain);
          gain.connect(dest);
          osc.start(startTime);
          osc.stop(startTime + duration);
        });
      };

      // Beep 1
      playHornBeep(now, 0.16);
      // Beep 2
      playHornBeep(now + 0.22, 0.28);

      // Low engine rev acoustic undertone
      const oscRev = this.ctx.createOscillator();
      const gainRev = this.ctx.createGain();
      oscRev.type = 'triangle';
      oscRev.frequency.setValueAtTime(110, now);
      oscRev.frequency.exponentialRampToValueAtTime(220, now + 0.50);
      gainRev.gain.setValueAtTime(0.001, now);
      gainRev.gain.linearRampToValueAtTime(0.25, now + 0.10);
      gainRev.gain.exponentialRampToValueAtTime(0.001, now + 0.60);
      oscRev.connect(gainRev);
      gainRev.connect(dest);
      oscRev.start(now);
      oscRev.stop(now + 0.60);

      // Mobile vibration pattern: double horn vibration
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([160, 70, 260]);
      }
    } catch(e) {
      console.warn('playRideOrderSound error:', e);
    }
  }

  // 📦 Sound Channel 3: Parcel / Delivery Logistics (Crisp Dual-Chime)
  playParcelOrderSound() {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      const dest = this.getDestination() || this.ctx.destination;
      const now = this.ctx.currentTime;

      // Two-tone logistics chime (A5 -> E6)
      const playTone = (freq, startTime, duration) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.40, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      playTone(880, now, 0.35);
      playTone(1318.51, now + 0.15, 0.85);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([120, 50, 180]);
      }
    } catch(e) {
      console.warn('playParcelOrderSound error:', e);
    }
  }

  // Synthesizes a loud, distinctive multi-tone order alarm sequence for Owners
  playOrderAlarm() {
    this.startPersistentOrderAlarm(10);
  }

  // Synthesizes pleasant, distinctive audio chimes for customer order status changes
  playCustomerStatusChime(status) {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      const dest = this.getDestination() || this.ctx.destination;
      const now = this.ctx.currentTime;

      const playTone = (freq, startTime, duration, vol = 0.35, type = 'sine') => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const s = String(status || '').trim();
      if (s === 'Preparando' || s === 'Aceptado') {
        // Uplifting ascending chime (C5 -> E5 -> G5)
        playTone(523.25, now, 0.35, 0.35);
        playTone(659.25, now + 0.14, 0.40, 0.38);
        playTone(783.99, now + 0.28, 0.80, 0.42);
      } else if (s === 'Listo') {
        // Double crisp bell chime (A5 -> D6)
        playTone(880.00, now, 0.30, 0.38);
        playTone(1174.66, now + 0.15, 0.70, 0.42);
      } else if (s === 'En Camino') {
        // Dynamic transport rhythm
        playTone(440.00, now, 0.18, 0.32);
        playTone(554.37, now + 0.12, 0.20, 0.36);
        playTone(659.25, now + 0.24, 0.25, 0.40);
        playTone(880.00, now + 0.36, 0.75, 0.45);
      } else if (s === 'Entregado' || s === 'completed') {
        // Celebration fanfare (C5 -> E5 -> G5 -> C6)
        playTone(523.25, now, 0.18, 0.35);
        playTone(659.25, now + 0.12, 0.18, 0.38);
        playTone(783.99, now + 0.24, 0.22, 0.40);
        playTone(1046.50, now + 0.36, 0.90, 0.46);
      } else if (s === 'Cancelado' || s === 'cancelled') {
        // Descending alert
        playTone(440, now, 0.25, 0.35, 'triangle');
        playTone(330, now + 0.18, 0.55, 0.30, 'triangle');
      } else {
        this.playBell();
      }
    } catch (e) {
      console.warn('Customer sound chime notice:', e);
    }
  }
}

const Sound = new SoundManager();
window.Sound = Sound;
