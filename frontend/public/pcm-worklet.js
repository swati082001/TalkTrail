const TARGET_RATE = 16000
const CHUNK_SAMPLES = 1600

class PcmWorklet extends AudioWorkletProcessor {
  constructor() {
    super()
    this.ratio = sampleRate / TARGET_RATE
    this.sum = 0
    this.count = 0
    this.consumed = 0
    this.nextBoundary = this.ratio
    this.chunk = new Int16Array(CHUNK_SAMPLES)
    this.length = 0
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0]
    if (!channel) return true

    for (let i = 0; i < channel.length; i++) {
      this.sum += channel[i]
      this.count++
      this.consumed++

      if (this.consumed >= this.nextBoundary) {
        const sample = Math.max(-1, Math.min(1, this.sum / this.count))
        this.chunk[this.length++] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
        this.sum = 0
        this.count = 0
        this.nextBoundary += this.ratio

        if (this.length === CHUNK_SAMPLES) {
          this.port.postMessage(this.chunk.buffer, [this.chunk.buffer])
          this.chunk = new Int16Array(CHUNK_SAMPLES)
          this.length = 0
        }
      }
    }
    return true
  }
}

registerProcessor('pcm-worklet', PcmWorklet)
