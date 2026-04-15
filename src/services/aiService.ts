import { GoogleGenAI, Type } from "@google/genai";
import { GenerationParams, Song } from "../types";

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SONG_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, description: "Intro, Verse, Chorus, Bridge, Outro, etc." },
          content: { type: Type.STRING }
        },
        required: ["type", "content"]
      }
    },
    metadata: {
      type: Type.OBJECT,
      properties: {
        bpm: { type: Type.NUMBER },
        genre: { type: Type.STRING },
        vocalStyle: { type: Type.STRING },
        energyLevel: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
        emotion: { type: Type.STRING },
        instruments: { type: Type.ARRAY, items: { type: Type.STRING } },
        notesForAI: { type: Type.STRING }
      },
      required: ["bpm", "genre", "vocalStyle", "energyLevel", "emotion", "instruments", "notesForAI"]
    }
  },
  required: ["title", "sections", "metadata"]
};

export async function generateSong(params: GenerationParams): Promise<Song> {
  const prompt = `
    Generate a full structured song based on the following parameters:
    Title/Idea: ${params.title || params.idea}
    Genre: ${params.genre}
    Mood: ${params.mood}
    ${params.scene ? `Scene/Context: ${params.scene}` : ""}

    The song should be professional, structured for AI music generation, and high quality.
    Include standard sections like Intro, Verse 1, Chorus, Verse 2, Bridge, and Outro.
    Also provide music intelligence metadata including BPM, vocal style, energy, emotion, and instrument suggestions.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: SONG_SCHEMA,
      },
    });

    if (!response.text) {
      throw new Error("Empty response from AI");
    }

    const result = JSON.parse(response.text);
    
    return {
      id: Math.random().toString(36).substring(7),
      title: result.title,
      sections: result.sections.map((s: any) => ({
        id: Math.random().toString(36).substring(7),
        ...s
      })),
      metadata: result.metadata,
      createdAt: Date.now()
    };
  } catch (error: any) {
    console.error("Generation error:", error);
    throw new Error(error.message || "Failed to generate song");
  }
}

export async function enhanceLyrics(content: string, context: string): Promise<string> {
  const prompt = `
    Enhance the following lyrics based on this context: "${context}"
    Lyrics:
    ${content}
    
    Return only the enhanced lyrics text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    return (response.text || "").trim();
  } catch (error: any) {
    console.error("Enhancement error:", error);
    throw new Error(error.message || "Failed to enhance lyrics");
  }
}
