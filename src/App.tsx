import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Music, 
  Plus, 
  Sparkles, 
  Download, 
  Trash2, 
  GripVertical, 
  Settings2, 
  FileText,
  Save,
  History,
  ChevronRight,
  ChevronLeft,
  LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Song, SongSection, MusicMetadata, GenerationParams, SongSectionType } from "./types";
import { GENRES, MOODS, VOCAL_STYLES, ENERGY_LEVELS, SECTION_TYPES } from "./lib/constants";
import { generateSong, enhanceLyrics } from "./services/aiService";
import { cn } from "@/lib/utils";

// --- Components ---

interface SortableSectionProps {
  section: SongSection;
  onUpdate: (id: string, content: string) => void;
  onTypeChange: (id: string, type: SongSectionType) => void;
  onRemove: (id: string) => void;
}

const SortableSection: React.FC<SortableSectionProps> = ({ section, onUpdate, onTypeChange, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("mb-4 group", isDragging && "opacity-50")}>
      <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-zinc-800 rounded">
              <GripVertical className="w-4 h-4 text-zinc-500" />
            </div>
            <Select 
              value={section.type} 
              onValueChange={(val) => onTypeChange(section.id, val as SongSectionType)}
            >
              <SelectTrigger className="w-[140px] h-8 bg-zinc-800 border-zinc-700 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {SECTION_TYPES.map(type => (
                  <SelectItem key={type} value={type} className="text-xs">{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onRemove(section.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <Textarea
            value={section.content}
            onChange={(e) => onUpdate(section.id, e.target.value)}
            className="min-h-[100px] bg-transparent border-none focus-visible:ring-0 resize-none p-0 text-zinc-300 leading-relaxed placeholder:text-zinc-600"
            placeholder={`Enter ${section.type} lyrics...`}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function App() {
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Song[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Generation Form State
  const [genParams, setGenParams] = useState<GenerationParams>({
    title: "",
    idea: "",
    genre: "Afrobeat",
    mood: "Love",
    scene: ""
  });

  // Load history from local storage
  useEffect(() => {
    const saved = localStorage.getItem("lyricforge_history");
    if (saved && saved !== "undefined" && saved !== "null") {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      } catch (e) {
        console.error("Failed to load history", e);
        localStorage.removeItem("lyricforge_history");
      }
    }
  }, []);

  // Save history to local storage
  useEffect(() => {
    localStorage.setItem("lyricforge_history", JSON.stringify(history));
  }, [history]);

  const handleGenerate = async () => {
    if (!genParams.title && !genParams.idea) return;
    setLoading(true);
    setError(null);
    try {
      const newSong = await generateSong(genParams);
      setSong(newSong);
      setHistory(prev => [newSong, ...prev].slice(0, 20));
    } catch (err: any) {
      console.error("Generation failed", err);
      setError(err.message || "Failed to generate song. Please check your API key and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && song) {
      const oldIndex = song.sections.findIndex(s => s.id === active.id);
      const newIndex = song.sections.findIndex(s => s.id === over.id);
      setSong({
        ...song,
        sections: arrayMove(song.sections, oldIndex, newIndex)
      });
    }
  };

  const updateSection = (id: string, content: string) => {
    if (!song) return;
    setSong({
      ...song,
      sections: song.sections.map(s => s.id === id ? { ...s, content } : s)
    });
  };

  const updateSectionType = (id: string, type: SongSectionType) => {
    if (!song) return;
    setSong({
      ...song,
      sections: song.sections.map(s => s.id === id ? { ...s, type } : s)
    });
  };

  const removeSection = (id: string) => {
    if (!song) return;
    setSong({
      ...song,
      sections: song.sections.filter(s => s.id !== id)
    });
  };

  const addSection = () => {
    if (!song) return;
    const newSection: SongSection = {
      id: Math.random().toString(36).substring(7),
      type: "Verse",
      content: ""
    };
    setSong({
      ...song,
      sections: [...song.sections, newSection]
    });
  };

  const updateMetadata = (key: keyof MusicMetadata, value: any) => {
    if (!song) return;
    setSong({
      ...song,
      metadata: { ...song.metadata, [key]: value }
    });
  };

  const exportSong = () => {
    if (!song) return;
    const lyricsText = song.sections.map(s => `[${s.type.toUpperCase()}]\n${s.content}`).join("\n\n");
    const exportText = `
TITLE: ${song.title.toUpperCase()}

LYRICS:
${lyricsText}

MUSIC PARAMETERS:
- BPM: ${song.metadata.bpm}
- Genre: ${song.metadata.genre}
- Vocal Style: ${song.metadata.vocalStyle}
- Emotion: ${song.metadata.emotion}
- Instruments: ${song.metadata.instruments.join(", ")}
- Energy Level: ${song.metadata.energyLevel}

NOTES FOR AI:
${song.metadata.notesForAI}
    `.trim();

    navigator.clipboard.writeText(exportText);
    alert("Song exported to clipboard in Sony AI format!");
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-orange-500/30">
        {/* Header */}
        <header className="h-16 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Music className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">LyricForge AI</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Music Intelligence System</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {song && (
              <Button 
                variant="outline" 
                className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300"
                onClick={exportSong}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Sony AI
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-zinc-400 hover:text-zinc-100"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <LayoutDashboard className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <main className="flex h-[calc(100vh-64px)] overflow-hidden">
          {/* Left Panel: Generation & History */}
          <AnimatePresence initial={false}>
            {sidebarOpen && (
              <motion.aside 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="border-r border-zinc-800 bg-zinc-950/30 flex flex-col"
              >
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-8">
                    {/* Generation Form */}
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 text-zinc-400 mb-2">
                        <Sparkles className="w-4 h-4" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider">Generate New</h2>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-zinc-500">Song Title or Idea</Label>
                          <Input 
                            placeholder="e.g. Midnight Rain" 
                            className="bg-zinc-900 border-zinc-800 focus:border-orange-500/50 transition-colors"
                            value={genParams.title}
                            onChange={(e) => setGenParams({...genParams, title: e.target.value})}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs text-zinc-500">Genre</Label>
                            <Select value={genParams.genre} onValueChange={(v) => setGenParams({...genParams, genre: v})}>
                              <SelectTrigger className="bg-zinc-900 border-zinc-800">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-zinc-800">
                                {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-zinc-500">Mood</Label>
                            <Select value={genParams.mood} onValueChange={(v) => setGenParams({...genParams, mood: v})}>
                              <SelectTrigger className="bg-zinc-900 border-zinc-800">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-zinc-800">
                                {MOODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-zinc-500">Scene / Story (Optional)</Label>
                          <Textarea 
                            placeholder="Describe the scene..." 
                            className="bg-zinc-900 border-zinc-800 min-h-[80px] text-sm"
                            value={genParams.scene}
                            onChange={(e) => setGenParams({...genParams, scene: e.target.value})}
                          />
                        </div>

                        <Button 
                          className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold h-11 shadow-lg shadow-orange-600/20"
                          onClick={handleGenerate}
                          disabled={loading || (!genParams.title && !genParams.idea)}
                        >
                          {loading ? (
                            <motion.div 
                              animate={{ rotate: 360 }} 
                              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            >
                              <Sparkles className="w-4 h-4" />
                            </motion.div>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Forge Composition
                            </>
                          )}
                        </Button>

                        {error && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-xs leading-relaxed"
                          >
                            {error}
                          </motion.div>
                        )}
                      </div>
                    </section>

                    <Separator className="bg-zinc-800" />

                    {/* History */}
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 text-zinc-400 mb-2">
                        <History className="w-4 h-4" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider">Recent Works</h2>
                      </div>
                      
                      <div className="space-y-2">
                        {history.length === 0 ? (
                          <p className="text-xs text-zinc-600 italic">No recent songs yet.</p>
                        ) : (
                          history.map((h) => (
                            <button
                              key={h.id}
                              onClick={() => setSong(h)}
                              className={cn(
                                "w-full text-left p-3 rounded-lg border transition-all group",
                                song?.id === h.id 
                                  ? "bg-orange-500/10 border-orange-500/50 text-orange-400" 
                                  : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
                              )}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-sm font-medium truncate flex-1">{h.title}</span>
                                <Badge variant="outline" className="text-[9px] h-4 border-zinc-700 text-zinc-500">{h.metadata.genre}</Badge>
                              </div>
                              <span className="text-[10px] opacity-50">{new Date(h.createdAt).toLocaleDateString()}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </section>
                  </div>
                </ScrollArea>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Center Panel: Editor */}
          <section className="flex-1 bg-zinc-950 flex flex-col relative">
            {!song ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-800">
                  <FileText className="w-10 h-10 text-zinc-700" />
                </div>
                <h3 className="text-xl font-bold mb-2">No Active Composition</h3>
                <p className="text-zinc-500 max-w-md mb-8">
                  Start by generating a new song or selecting one from your history to begin editing and optimizing for AI music generation.
                </p>
                <Button 
                  variant="outline" 
                  className="border-zinc-800 hover:bg-zinc-900"
                  onClick={() => setSidebarOpen(true)}
                >
                  Open Forge Panel
                </Button>
              </div>
            ) : (
              <>
                <div className="p-8 border-b border-zinc-900 flex items-center justify-between">
                  <div className="flex-1">
                    <Input 
                      value={song.title}
                      onChange={(e) => setSong({...song, title: e.target.value})}
                      className="text-3xl font-black bg-transparent border-none p-0 h-auto focus-visible:ring-0 tracking-tight"
                    />
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <Music className="w-3.5 h-3.5" />
                        <span className="text-xs uppercase tracking-wider font-bold">{song.metadata.genre}</span>
                      </div>
                      <div className="w-1 h-1 bg-zinc-800 rounded-full" />
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="text-xs uppercase tracking-wider font-bold">{song.metadata.emotion}</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-zinc-500 hover:text-zinc-300"
                    onClick={addSection}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Section
                  </Button>
                </div>

                <ScrollArea className="flex-1 px-8 py-6">
                  <div className="max-w-3xl mx-auto pb-24">
                    <DndContext 
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext 
                        items={song.sections.map(s => s.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {song.sections.map((section) => (
                          <SortableSection 
                            key={section.id} 
                            section={section} 
                            onUpdate={updateSection}
                            onTypeChange={updateSectionType}
                            onRemove={removeSection}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                    
                    <Button 
                      variant="ghost" 
                      className="w-full h-16 border-2 border-dashed border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/50 text-zinc-600 hover:text-zinc-400 transition-all rounded-xl"
                      onClick={addSection}
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add New Section
                    </Button>
                  </div>
                </ScrollArea>
              </>
            )}
          </section>

          {/* Right Panel: Music Intelligence */}
          {song && (
            <aside className="w-[380px] border-l border-zinc-800 bg-zinc-950/50 flex flex-col">
              <div className="p-6 border-b border-zinc-800">
                <div className="flex items-center gap-2 text-zinc-400 mb-1">
                  <Settings2 className="w-4 h-4" />
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em]">Music Intelligence</h2>
                </div>
                <p className="text-[10px] text-zinc-600">Optimization parameters for Sony AI</p>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6 space-y-8">
                  {/* BPM */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-semibold text-zinc-400">Tempo (BPM)</Label>
                      <span className="text-lg font-mono font-bold text-orange-500">{song.metadata.bpm}</span>
                    </div>
                    <Slider 
                      value={[song.metadata.bpm]} 
                      min={60} 
                      max={200} 
                      step={1}
                      onValueChange={(vals) => {
                        const val = Array.isArray(vals) ? vals[0] : vals;
                        updateMetadata("bpm", val);
                      }}
                      className="[&_[role=slider]]:bg-orange-500"
                    />
                  </div>

                  {/* Energy */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-zinc-400">Energy Level</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {ENERGY_LEVELS.map(level => (
                        <Button
                          key={level}
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-8 text-[10px] uppercase font-bold tracking-wider transition-all",
                            song.metadata.energyLevel === level 
                              ? "bg-orange-500/10 border-orange-500/50 text-orange-500" 
                              : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                          )}
                          onClick={() => updateMetadata("energyLevel", level)}
                        >
                          {level}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Vocal Style */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-zinc-400">Vocal Style</Label>
                    <Select value={song.metadata.vocalStyle} onValueChange={(v) => updateMetadata("vocalStyle", v)}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {VOCAL_STYLES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Instruments */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-zinc-400">Instrument Suggestions</Label>
                    <div className="flex flex-wrap gap-2">
                      {song.metadata.instruments.map((inst, i) => (
                        <Badge key={i} variant="secondary" className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-none px-2 py-0.5 text-[10px]">
                          {inst}
                          <button 
                            className="ml-1.5 hover:text-red-400"
                            onClick={() => updateMetadata("instruments", song.metadata.instruments.filter((_, idx) => idx !== i))}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-5 px-2 text-[10px] text-zinc-500 hover:text-zinc-300"
                        onClick={() => {
                          const inst = prompt("Enter instrument:");
                          if (inst) updateMetadata("instruments", [...song.metadata.instruments, inst]);
                        }}
                      >
                        + Add
                      </Button>
                    </div>
                  </div>

                  {/* Notes for AI */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-zinc-400">Notes for AI Generation</Label>
                    <Textarea 
                      value={song.metadata.notesForAI}
                      onChange={(e) => updateMetadata("notesForAI", e.target.value)}
                      placeholder="Special instructions for the AI..."
                      className="bg-zinc-900 border-zinc-800 min-h-[120px] text-xs leading-relaxed text-zinc-400"
                    />
                  </div>
                </div>
              </ScrollArea>

              <div className="p-6 border-t border-zinc-800 bg-zinc-950">
                <Button 
                  className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-bold h-12 shadow-xl"
                  onClick={exportSong}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Copy Sony AI Format
                </Button>
              </div>
            </aside>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
}
