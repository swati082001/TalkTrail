import { GoogleGenAI, Modality, type LiveConnectConfig } from '@google/genai';
import { config } from './config.js';


export const ai = new GoogleGenAI({
  apiKey: config.geminiApiKey,
  httpOptions: { apiVersion: 'v1beta' },
});

export const liveConfig: LiveConnectConfig = {
  responseModalities: [Modality.TEXT], 
  inputAudioTranscription: {
    languageCodes: [],
  },
};
