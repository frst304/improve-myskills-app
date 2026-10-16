let ctx = null
const ac = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)())

function tone(freq, start, dur, gain = 0.12, type = 'sine') {
  const c = ac()
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(0, c.currentTime + start)
  g.gain.linearRampToValueAtTime(gain, c.currentTime + start + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur)
  o.connect(g).connect(c.destination)
  o.start(c.currentTime + start)
  o.stop(c.currentTime + start + dur + 0.05)
}

export const sounds = {
  chime() { [523.25, 659.25, 783.99].forEach((f, i) => tone(f, i * 0.16, 1.2)) },
  soft() { tone(880, 0, 0.25, 0.05) },
  good() { tone(660, 0, 0.12, 0.06, 'triangle'); tone(990, 0.07, 0.18, 0.05, 'triangle') },
  bad() { tone(220, 0, 0.25, 0.07, 'sawtooth') },
  tick() { tone(1400, 0, 0.03, 0.02, 'square') },
}
