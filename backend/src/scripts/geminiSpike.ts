import { readFile } from 'node:fs/promises';
import { GoogleGenAI, Modality, type LiveConnectConfig } from '@google/genai';
import { config as appConfig } from '../config.js';

const SAMPLE_RATE = 16000;
const BYTES_PER_SAMPLE = 2;
const CHUNK_MS = 100;
const CHUNK_BYTES = (SAMPLE_RATE * BYTES_PER_SAMPLE * CHUNK_MS) / 1000; // 3200

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function extractPcm(wav: Buffer): Buffer {
  let offset = 12; 

  while (offset + 8 <= wav.length) {
    const chunkId = wav.toString('ascii', offset, offset + 4); 
    const chunkSize = wav.readUInt32LE(offset + 4);            

    if (chunkId === 'fmt ') {
      // Sanity check: Gemini needs mono, 16 kHz, 16-bit. Bail out early if the file is different.
      const channels = wav.readUInt16LE(offset + 10);
      const sampleRate = wav.readUInt32LE(offset + 12);
      const bitsPerSample = wav.readUInt16LE(offset + 22);
      if (channels !== 1 || sampleRate !== SAMPLE_RATE || bitsPerSample !== 16) {
        throw new Error(
          `WAV must be mono 16 kHz 16-bit, got ${channels}ch ${sampleRate} Hz ${bitsPerSample}-bit. ` +
            `Convert with: afconvert -f WAVE -d LEI16@16000 -c 1 in.m4a out.wav`,
        );
      }
    }

    if (chunkId === 'data') {
      return wav.subarray(offset + 8, offset + 8 + chunkSize);
    }

    offset += 8 + chunkSize + (chunkSize % 2);
  }

  throw new Error('No "data" chunk found: is this a valid WAV file?');
}

const ai = new GoogleGenAI({ apiKey: appConfig.geminiApiKey, httpOptions: { apiVersion: 'v1beta' } });

const languageCodes = (process.argv[3] ?? '').split(',').map((c) => c.trim()).filter(Boolean);

const liveConfig: LiveConnectConfig = {
  responseModalities: [Modality.TEXT],
  inputAudioTranscription: { languageCodes },
};

async function main(): Promise<void> {
  const filePath = process.argv[2] ?? 'sample.wav';
  const pcm = extractPcm(await readFile(filePath));
  console.log(
    `Loaded ${filePath}: ${pcm.length} bytes = ${(pcm.length / (SAMPLE_RATE * BYTES_PER_SAMPLE)).toFixed(1)}s of audio`,
  );
  console.log(`Model: ${appConfig.geminiModel}, languageCodes: ${JSON.stringify(languageCodes)}`);


  const session = await ai.live.connect({
    model: appConfig.geminiModel,
    config: liveConfig,
    callbacks: {
      onopen: () => console.log('Connected to Gemini Live'),
      onmessage: (message) => {
        console.log('RAW:', JSON.stringify(message));

        const content = message.serverContent;
        if (content?.interimInputTranscription?.text) {
          console.log('  [interim]', content.interimInputTranscription.text);
        }
        if (content?.inputTranscription?.text) {
          console.log('  [FINAL]  ', content.inputTranscription.text);
        }
      },
      onerror: (e) => console.error('Error:', e.message),
      onclose: (e) => console.log(`Connection closed (code ${e.code}): ${e.reason || 'no reason'}`),
    },
  });

  for (let start = 0; start < pcm.length; start += CHUNK_BYTES) {
    const chunk = pcm.subarray(start, start + CHUNK_BYTES); 
    session.sendRealtimeInput({
      audio: {
        data: chunk.toString('base64'), 
        mimeType: `audio/pcm;rate=${SAMPLE_RATE}`,
      },
    });
    await sleep(CHUNK_MS);
  }
  console.log('All audio sent.');
  session.sendRealtimeInput({ audioStreamEnd: true });
  await sleep(4000);
  session.close();
}

main().catch((err: unknown) => {
  console.error('Spike failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
