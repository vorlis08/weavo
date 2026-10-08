/** a soft, repeating chime for the big reminder — Web Audio, so no sound file to ship */
let ctx: AudioContext | undefined

function chime() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const t0 = ctx.currentTime
    ;[880, 1174.66, 1318.5].forEach((freq, i) => {
      const osc = ctx!.createOscillator()
      const gain = ctx!.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = t0 + i * 0.16
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5)
      osc.connect(gain).connect(ctx!.destination)
      osc.start(start)
      osc.stop(start + 0.55)
    })
  } catch {
    /* no audio available */
  }
}

/** plays the chime now and every few seconds until the returned function is called */
export function startAlarm(everyMs = 6000) {
  chime()
  const id = setInterval(chime, everyMs)
  return () => clearInterval(id)
}
