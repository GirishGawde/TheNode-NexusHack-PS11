import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
console.log(Object.keys(ai));
console.log(ai.models ? Object.keys(ai.models) : 'no models');
