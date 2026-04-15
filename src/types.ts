export type SongSectionType = 'Intro' | 'Verse' | 'Chorus' | 'Bridge' | 'Outro' | 'Pre-Chorus' | 'Hook';

export interface SongSection {
  id: string;
  type: SongSectionType;
  content: string;
}

export interface MusicMetadata {
  bpm: number;
  genre: string;
  vocalStyle: string;
  energyLevel: 'Low' | 'Medium' | 'High';
  emotion: string;
  instruments: string[];
  notesForAI: string;
}

export interface Song {
  id: string;
  title: string;
  sections: SongSection[];
  metadata: MusicMetadata;
  createdAt: number;
}

export interface GenerationParams {
  title?: string;
  idea?: string;
  genre: string;
  mood: string;
  scene?: string;
}
