import { useState, useEffect, useRef, useCallback } from "react";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { useUserId } from "@/hooks/useUserId";
import { BookOpen, ImagePlus, Loader2, Plus, Sparkles, WandSparkles, BookText, ChevronLeft, ChevronRight, X, Languages, Save, Trash2, FolderOpen, Check } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { retryUntilCredits } from "@/lib/aiRetry";

type ComicLang = "en" | "hi";

const starterPanels: ComicPanel[] = [
  { title: "Page 1", scene: "A cheerful child named Leo finds a glowing storybook on the classroom shelf. Soft golden light pours from its pages, dust motes dance in sunbeams.", setting: "classroom", caption: "It was an ordinary Monday... until the book glowed.", dialogue: "Whoa! What is this?", narration: "Leo had never seen anything like it. The book pulsed with warm light, calling his name softly." },
  { title: "Page 2", scene: "The book opens by itself and a tiny blue genie spirals out, smiling warmly at Leo. Sparkles swirl around them in the dim classroom.", setting: "magic", caption: "A tiny genie appeared with a smile.", dialogue: "Hello, brave friend!", narration: "The genie bowed with a little flourish. 'I am Zip,' he giggled, 'and I need your help.'" },
];

type ComicPanel = {
  title: string;
  scene: string;
  setting: string;
  caption: string;
  dialogue?: string;
  narration?: string;
  imageUrl?: string;
  isGenerating?: boolean;
};

type SavedComic = {
  id: string;
  hero: string;
  idea: string;
  language: string;
  page_count: number;
  panels: ComicPanel[];
  thumbnail_url: string | null;
  updated_at: string;
};

const PAGE_LAYOUTS = [
  [{ cols: "col-span-2", aspect: "aspect-[16/9]" }, { cols: "col-span-1", aspect: "aspect-square" }, { cols: "col-span-1", aspect: "aspect-square" }],
  [{ cols: "col-span-1", aspect: "aspect-[3/4]" }, { cols: "col-span-1", aspect: "aspect-[3/4]" }, { cols: "col-span-2", aspect: "aspect-[16/9]" }],
  [{ cols: "col-span-2", aspect: "aspect-[16/9]" }, { cols: "col-span-2", aspect: "aspect-[16/9]" }],
];

const ComicBook = () => {
  const { toast } = useToast();
  const userId = useUserId();
  const [hero, setHero] = useState("Genie Explorer");
  const [idea, setIdea] = useState("A magical adventure where the hero learns brave new English words from a talking storybook.");
  const [pageCount, setPageCount] = useState(10);
  const [panels, setPanels] = useState<ComicPanel[]>(starterPanels);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isWritingScript, setIsWritingScript] = useState(false);
  const [bookViewOpen, setBookViewOpen] = useState(false);
  const [bookPage, setBookPage] = useState(0);
  const [language, setLanguage] = useAppLanguage() as unknown as [ComicLang, (l: ComicLang) => void, () => void];
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedComics, setSavedComics] = useState<SavedComic[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedKeyRef = useRef<string>("");

  const totalWords = panels.reduce((sum, p) => sum + (p.scene + " " + (p.narration || "") + " " + (p.dialogue || "")).split(/\s+/).filter(Boolean).length, 0);
  const readingMinutes = Math.max(1, Math.ceil(totalWords / 90));
  const generatedCount = panels.filter((p) => p.imageUrl).length;

  // Load saved library
  const loadLibrary = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("comic_books")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (!error && data) setSavedComics(data as unknown as SavedComic[]);
  }, [userId]);

  useEffect(() => { loadLibrary(); }, [loadLibrary]);

  // Auto-save (debounced) whenever panels/hero/idea/language change after initial load
  useEffect(() => {
    if (!userId) return;
    // Skip while actively generating to avoid churn and duplicate inserts
    if (isGeneratingAll || isWritingScript) return;
    // Skip the initial unedited starter state
    const isStarter = panels.length === 2 && panels[0]?.title === "Page 1" && panels[1]?.title === "Page 2" && !panels[0].imageUrl && !panels[1].imageUrl;
    if (isStarter) return;

    const key = JSON.stringify({ hero, idea, language, panels: panels.map(p => ({ ...p, isGenerating: false })) });
    if (key === lastSavedKeyRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(async () => {
      const cleanPanels = panels.map(p => ({ ...p, isGenerating: false }));
      const thumbnail = cleanPanels.find(p => p.imageUrl)?.imageUrl ?? null;
      const payload = {
        user_id: userId,
        hero, idea, language,
        page_count: cleanPanels.length,
        panels: cleanPanels,
        thumbnail_url: thumbnail,
      };
      try {
        if (savedId) {
          await supabase.from("comic_books").update(payload).eq("id", savedId);
        } else {
          const { data, error } = await supabase.from("comic_books").insert(payload).select("id").single();
          if (!error && data) setSavedId(data.id);
        }
        lastSavedKeyRef.current = key;
        setSaveStatus("saved");
        loadLibrary();
      } catch (e) {
        console.error("auto-save failed", e);
        setSaveStatus("idle");
      }
    }, 1500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [hero, idea, language, panels, userId, savedId, loadLibrary, isGeneratingAll, isWritingScript]);

  // Immediate save right after a generation run finishes (no debounce wait)
  const wasGeneratingRef = useRef(false);
  useEffect(() => {
    const generating = isGeneratingAll || isWritingScript;
    if (wasGeneratingRef.current && !generating && userId) {
      // Force the debounced save to fire now
      if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
      (async () => {
        try {
          setSaveStatus("saving");
          const cleanPanels = panels.map(p => ({ ...p, isGenerating: false }));
          const thumbnail = cleanPanels.find(p => p.imageUrl)?.imageUrl ?? null;
          const payload = { user_id: userId, hero, idea, language, page_count: cleanPanels.length, panels: cleanPanels, thumbnail_url: thumbnail };
          if (savedId) {
            await supabase.from("comic_books").update(payload).eq("id", savedId);
          } else {
            const { data, error } = await supabase.from("comic_books").insert(payload).select("id").single();
            if (!error && data) setSavedId(data.id);
          }
          lastSavedKeyRef.current = JSON.stringify({ hero, idea, language, panels: cleanPanels });
          setSaveStatus("saved");
          loadLibrary();
          toast({ title: language === "hi" ? "कॉमिक सेव हो गई" : "Comic saved", description: language === "hi" ? "आपकी लाइब्रेरी में जोड़ दी गई।" : "Added to your library." });
        } catch (e) {
          console.error("post-generation save failed", e);
          setSaveStatus("idle");
        }
      })();
    }
    wasGeneratingRef.current = generating;
  }, [isGeneratingAll, isWritingScript, userId, hero, idea, language, panels, savedId, loadLibrary, toast]);

  const startNewComic = () => {
    setSavedId(null);
    setPanels(starterPanels);
    lastSavedKeyRef.current = "";
    setSaveStatus("idle");
    toast({ title: language === "hi" ? "नई कॉमिक" : "New comic", description: language === "hi" ? "कहानी का विचार लिखें और 'Write Story' दबाएँ।" : "Type an idea and tap Write Story." });
  };

  const loadComic = (c: SavedComic) => {
    setSavedId(c.id);
    setHero(c.hero);
    setIdea(c.idea);
    setLanguage((c.language as ComicLang) || "en");
    setPanels(c.panels || []);
    setPageCount(c.page_count || (c.panels?.length ?? 10));
    setShowLibrary(false);
    lastSavedKeyRef.current = "";
    setSaveStatus("saved");
    toast({ title: language === "hi" ? "कॉमिक खुली" : "Comic loaded", description: c.hero });
  };

  const deleteComic = async (id: string) => {
    await supabase.from("comic_books").delete().eq("id", id);
    if (savedId === id) { setSavedId(null); }
    loadLibrary();
    toast({ title: language === "hi" ? "हटा दिया" : "Deleted" });
  };

  const addPanel = () => {
    setPanels((cur) => [...cur, {
      title: `Page ${cur.length + 1}`,
      scene: `${hero} faces a new challenge and uses English words to solve it bravely.`,
      setting: "adventure",
      caption: `${hero} keeps going, brave and bright.`,
      dialogue: "I can do this!",
      narration: "With a deep breath, the hero stepped forward into the unknown.",
    }]);
  };

  const writeStory = async () => {
    setIsWritingScript(true);
    try {
      const data = await retryUntilCredits(async () => {
        const { data, error } = await supabase.functions.invoke("comic-script", {
          body: { hero: hero || "Genie Explorer", idea, pageCount, language },
        });
        if (error) throw error;
        if (!data?.panels?.length) throw new Error("No story returned");
        return data;
      }, {
        onStatus: (s) => {
          if (s.phase === "waiting" && s.reason === "credits") {
            toast({
              title: language === "hi" ? "क्रेडिट खत्म — अपने आप दोबारा कोशिश होगी" : "Out of AI credits — will auto-retry",
              description: language === "hi"
                ? `अगली कोशिश ${s.nextRetryInSec} सेकंड में (प्रयास ${s.attempt}).`
                : `Next attempt in ${s.nextRetryInSec}s (try ${s.attempt}). Top up credits to resume instantly.`,
            });
          } else if (s.phase === "waiting" && s.reason === "rate-limit") {
            toast({
              title: language === "hi" ? "बहुत ज़्यादा अनुरोध — दोबारा कोशिश होगी" : "Rate-limited — will auto-retry",
              description: `${s.nextRetryInSec}s`,
            });
          }
        },
      });
      setPanels(data.panels.map((p: ComicPanel) => ({ ...p, imageUrl: undefined, isGenerating: false })));
      toast({ title: language === "hi" ? "कहानी तैयार! ✨" : "Story ready! ✨", description: language === "hi" ? `${data.panels.length} पन्ने लिखे गए। 'Generate All' दबाएँ।` : `${data.panels.length} panels written. Tap Generate All to draw them.` });
    } catch (e) {
      console.error("Story generation failed", e);
      toast({ title: language === "hi" ? "कहानी नहीं बनी" : "Couldn't write the story", description: language === "hi" ? "कुछ देर में दोबारा कोशिश करें।" : "Please try again in a moment.", variant: "destructive" });
    } finally {
      setIsWritingScript(false);
    }
  };

  const generatePanelImage = async (index: number, panelOverride?: ComicPanel) => {
    const panel = panelOverride ?? panels[index];
    const scene = index === 0 ? `${idea} Opening scene: ${panel.scene}` : panel.scene;

    setPanels((cur) => cur.map((p, i) => i === index ? { ...p, isGenerating: true } : p));

    try {
      const { data, error } = await supabase.functions.invoke("comic-image", {
        body: {
          hero: hero || "Genie Explorer",
          storyIdea: idea,
          scene,
          pageNumber: index + 1,
          totalPages: panels.length,
          setting: panel.setting,
        },
      });
      if (error) throw error;
      if (!data?.imageUrl) throw new Error("No image returned");
      setPanels((cur) => cur.map((p, i) => i === index ? { ...p, imageUrl: data.imageUrl, isGenerating: false } : p));
      return true;
    } catch (e) {
      console.error("Comic image failed", e);
      setPanels((cur) => cur.map((p, i) => i === index ? { ...p, isGenerating: false } : p));
      return false;
    }
  };

  const runBatched = async (indices: number[]) => {
    const BATCH = 3;
    let anyFailed = false;
    for (let i = 0; i < indices.length; i += BATCH) {
      const slice = indices.slice(i, i + BATCH);
      const results = await Promise.all(slice.map((idx) => generatePanelImage(idx, panels[idx])));
      if (results.some((r) => !r)) anyFailed = true;
    }
    return !anyFailed;
  };

  const generateFullComic = async () => {
    setIsGeneratingAll(true);
    const indices = panels.map((_, i) => i);
    const ok = await runBatched(indices);
    setIsGeneratingAll(false);
    if (!ok) {
      toast({ title: "Some panels couldn't be drawn", description: "Tap Redraw Missing to retry just those.", variant: "destructive" });
    } else {
      toast({ title: "Comic ready! 📖", description: "Opening book view..." });
      setBookPage(0);
      setBookViewOpen(true);
    }
  };

  const redrawMissing = async () => {
    const missing = panels.map((p, i) => (!p.imageUrl ? i : -1)).filter((i) => i >= 0);
    if (missing.length === 0) {
      toast({ title: "All panels are inked ✨", description: "Nothing to redraw." });
      return;
    }
    setIsGeneratingAll(true);
    const ok = await runBatched(missing);
    setIsGeneratingAll(false);
    toast({
      title: ok ? "Missing panels drawn! 🎨" : "Some panels still failed",
      description: ok ? `${missing.length} panel${missing.length > 1 ? "s" : ""} regenerated.` : "Try again in a moment.",
      variant: ok ? "default" : "destructive",
    });
  };

  const renderPanel = (panel: ComicPanel, panelIndex: number, aspect: string) => (
    <div className="relative w-full">
      <div className={`relative ${aspect} w-full overflow-hidden border-[3px] border-foreground bg-card shadow-[4px_4px_0_0_hsl(var(--foreground))]`}>
        {panel.imageUrl ? (
          <img loading="lazy" decoding="async" src={panel.imageUrl} alt={`Comic panel ${panelIndex + 1}`} className="h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center"
            style={{
              backgroundImage: "radial-gradient(hsl(var(--foreground) / 0.18) 1px, transparent 1px), linear-gradient(135deg, hsl(var(--secondary) / 0.25), hsl(var(--accent) / 0.2))",
              backgroundSize: "8px 8px, 100% 100%",
            }}>
            <div className="text-center px-4">
              <ImagePlus className="h-8 w-8 text-foreground/60 mx-auto mb-2" />
              <p className="text-xs font-extrabold uppercase tracking-wider text-foreground/70">Panel {panelIndex + 1}</p>
            </div>
          </div>
        )}

        {panel.isGenerating && (
          <div className="absolute inset-0 grid place-items-center bg-background/85">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Inking...</span>
            </div>
          </div>
        )}

        <div className="absolute left-0 top-0 bg-foreground text-background px-2 py-0.5 text-[10px] font-extrabold tracking-widest border-r-[3px] border-b-[3px] border-foreground">
          {String(panelIndex + 1).padStart(2, "0")}
        </div>

        {panel.dialogue && (
          <div className="absolute right-2 top-3 max-w-[60%] bg-background border-[2px] border-foreground rounded-2xl px-2.5 py-1.5 shadow-[2px_2px_0_0_hsl(var(--foreground))]">
            <p className="text-[10px] sm:text-[11px] font-bold leading-tight text-foreground line-clamp-3">"{panel.dialogue}"</p>
          </div>
        )}

        {panel.caption && (
          <div className="absolute left-2 bottom-2 right-2 bg-[hsl(48_96%_60%)] border-[2px] border-foreground px-2 py-1 shadow-[2px_2px_0_0_hsl(var(--foreground))]">
            <p className="text-[11px] sm:text-xs font-extrabold leading-tight text-foreground line-clamp-2">{panel.caption}</p>
          </div>
        )}
      </div>
    </div>
  );

  const pages: { panels: ComicPanel[]; startIndex: number; layout: typeof PAGE_LAYOUTS[number] }[] = [];
  let cursor = 0;
  let layoutIdx = 0;
  while (cursor < panels.length) {
    const layout = PAGE_LAYOUTS[layoutIdx % PAGE_LAYOUTS.length];
    const size = layout.length;
    pages.push({ panels: panels.slice(cursor, cursor + size), startIndex: cursor, layout });
    cursor += size;
    layoutIdx += 1;
  }

  const allInked = generatedCount === panels.length && panels.length > 0;

  return (
    <div className="min-h-screen bg-background pb-8">
      <PageHeader title="Comic Book" showBack icon={<BookOpen className="w-5 h-5 text-primary" />} />
      <main className="max-w-4xl mx-auto px-4 py-5 space-y-5">
        <section className="bg-card rounded-2xl shadow-card p-4 space-y-3 border border-border">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <WandSparkles className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-foreground">{language === "hi" ? "कॉमिक बनाएँ" : "Create a Comic"}</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${saveStatus === "saved" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : saveStatus === "saving" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" : "bg-muted text-muted-foreground"}`}>
                {saveStatus === "saving" ? <><Loader2 className="w-2.5 h-2.5 animate-spin inline mr-1" />{language === "hi" ? "सेव हो रहा" : "Saving"}</> : saveStatus === "saved" ? <><Check className="w-2.5 h-2.5 inline mr-1" />{language === "hi" ? "सेव हो गया" : "Saved"}</> : language === "hi" ? "नया" : "Draft"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowLibrary(true)} className="h-8 text-xs gap-1">
                <FolderOpen className="w-3.5 h-3.5" />
                {language === "hi" ? `मेरी कॉमिक्स (${savedComics.length})` : `Library (${savedComics.length})`}
              </Button>
              <Button size="sm" variant="ghost" onClick={startNewComic} className="h-8 text-xs gap-1">
                <Plus className="w-3.5 h-3.5" />
                {language === "hi" ? "नई" : "New"}
              </Button>
              <div className="flex items-center gap-1 bg-muted rounded-full p-1">
                <Languages className="w-3.5 h-3.5 text-muted-foreground ml-2 mr-1" />
                <button
                  type="button"
                  onClick={() => {
                    setLanguage("en");
                    toast({ title: "Switched to English", description: "Tap Write Story to regenerate in English." });
                  }}
                  className={`text-xs font-bold px-3 py-1 rounded-full transition ${language === "en" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
                  aria-pressed={language === "en"}
                >English</button>
                <button
                  type="button"
                  onClick={() => {
                    setLanguage("hi");
                    toast({ title: "हिन्दी पर स्विच किया", description: "नई हिन्दी कहानी के लिए 'Write Story' दबाएँ।" });
                  }}
                  className={`text-xs font-bold px-3 py-1 rounded-full transition ${language === "hi" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
                  aria-pressed={language === "hi"}
                >हिन्दी</button>
              </div>
            </div>
          </div>
          <Input value={hero} onChange={(e) => setHero(e.target.value)} placeholder="Hero name" maxLength={40} />
          <Textarea value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="Describe your story idea... e.g. A pirate kid who learns English to find treasure." maxLength={400} rows={3} />
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-muted-foreground">Pages:</label>
            <Input type="number" min={4} max={16} value={pageCount} onChange={(e) => setPageCount(Math.min(16, Math.max(4, Number(e.target.value) || 10)))} className="w-20" />
            <Button onClick={writeStory} disabled={isWritingScript} variant="secondary" className="gap-2 ml-auto">
              {isWritingScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookText className="w-4 h-4" />}
              Write Story
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={addPanel} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Panel
            </Button>
            <Button onClick={generateFullComic} disabled={isGeneratingAll} className="gap-2">
              {isGeneratingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate All
            </Button>
          </div>
          {panels.some((p) => !p.imageUrl) && generatedCount > 0 && (
            <Button onClick={redrawMissing} disabled={isGeneratingAll} variant="secondary" className="w-full gap-2">
              {isGeneratingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              Redraw Missing Panels ({panels.filter((p) => !p.imageUrl).length})
            </Button>
          )}
          {allInked && (
            <Button onClick={() => { setBookPage(0); setBookViewOpen(true); }} className="w-full gap-2" variant="default">
              <BookOpen className="w-4 h-4" />
              Open Book View
            </Button>
          )}
        </section>

        <section className="bg-card rounded-2xl shadow-card p-4 border border-border">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-foreground">Instant Report</h2>
            </div>
            <span className="text-xs font-bold text-primary bg-primary/10 rounded-full px-3 py-1">Live</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-xl bg-secondary p-3">
              <p className="text-xl font-extrabold text-foreground">{panels.length}</p>
              <p className="text-xs text-muted-foreground">Panels</p>
            </div>
            <div className="rounded-xl bg-secondary p-3">
              <p className="text-xl font-extrabold text-foreground">{totalWords}</p>
              <p className="text-xs text-muted-foreground">Words</p>
            </div>
            <div className="rounded-xl bg-secondary p-3">
              <p className="text-xl font-extrabold text-foreground">{readingMinutes}</p>
              <p className="text-xs text-muted-foreground">Min</p>
            </div>
            <div className="rounded-xl bg-secondary p-3">
              <p className="text-xl font-extrabold text-foreground">{generatedCount}</p>
              <p className="text-xs text-muted-foreground">Inked</p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          {pages.map((page, pageIdx) => (
            <article key={`page-${pageIdx}`} className="bg-[hsl(0_0%_98%)] dark:bg-card border-[4px] border-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))] p-3 sm:p-5">
              <div className="flex items-center justify-between border-b-[3px] border-foreground pb-2 mb-3">
                <span className="text-[10px] sm:text-xs font-black tracking-[0.3em] text-foreground uppercase">{hero || "Hero"} — Issue #1</span>
                <span className="text-[10px] sm:text-xs font-black tracking-[0.3em] bg-foreground text-background px-2 py-0.5">PAGE {pageIdx + 1}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {page.panels.map((panel, localIdx) => {
                  const globalIdx = page.startIndex + localIdx;
                  const cell = page.layout[localIdx];
                  return (
                    <div key={globalIdx} className={cell.cols}>
                      {renderPanel(panel, globalIdx, cell.aspect)}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-[11px] font-bold text-muted-foreground line-clamp-1 flex-1">{panel.scene}</p>
                        <Button size="sm" variant="outline" onClick={() => generatePanelImage(globalIdx)} disabled={panel.isGenerating || isGeneratingAll} className="h-7 px-2 text-[10px] gap-1 shrink-0">
                          {panel.isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
                          {panel.imageUrl ? "Redraw" : "Draw"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </section>
      </main>

      {/* Library modal */}
      {showLibrary && (
        <div className="fixed inset-0 z-50 bg-foreground/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border-[3px] border-foreground">
            <div className="flex items-center justify-between bg-foreground text-background px-4 py-3">
              <span className="font-black tracking-wider uppercase text-sm">{language === "hi" ? "मेरी कॉमिक्स" : "My Comic Library"}</span>
              <button onClick={() => setShowLibrary(false)} aria-label="Close"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-3rem)] space-y-2">
              {savedComics.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">{language === "hi" ? "अभी तक कोई कॉमिक नहीं। बनाएँ!" : "No comics saved yet. Create one!"}</p>
              ) : savedComics.map(c => (
                <div key={c.id} className="flex items-center gap-3 bg-secondary/50 rounded-xl p-3 border border-border">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-foreground/20">
                    {c.thumbnail_url ? <img loading="lazy" decoding="async" src={c.thumbnail_url} alt={c.hero} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center"><BookOpen className="w-5 h-5 text-muted-foreground" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{c.hero}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.idea}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{c.page_count} pages · {c.language === "hi" ? "हिन्दी" : "English"} · {new Date(c.updated_at).toLocaleDateString()}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => loadComic(c)} className="h-8 px-2"><FolderOpen className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteComic(c.id)} className="h-8 px-2 text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Book View Modal */}
      {bookViewOpen && (
        <div className="fixed inset-0 z-50 bg-foreground/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6">
          <div className="relative w-full max-w-5xl bg-[hsl(40_30%_94%)] dark:bg-card rounded-2xl shadow-2xl overflow-hidden border-[3px] border-foreground">
            <div className="flex items-center justify-between bg-foreground text-background px-4 py-2">
              <span className="text-xs font-black tracking-[0.25em] uppercase">{hero} — Page {bookPage + 1} / {panels.length}</span>
              <button onClick={() => setBookViewOpen(false)} className="hover:opacity-80" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 min-h-[70vh] max-h-[80vh]">
              <div className="relative bg-foreground/5 border-r-0 md:border-r-[2px] border-foreground p-4 sm:p-6 flex items-center justify-center">
                {panels[bookPage]?.imageUrl ? (
                  <div className="relative w-full">
                    <img loading="lazy" decoding="async" src={panels[bookPage].imageUrl} alt={`Page ${bookPage + 1}`} className="w-full h-auto max-h-[65vh] object-contain border-[3px] border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))]" />
                    {panels[bookPage].caption && (
                      <div className="absolute left-4 right-4 bottom-4 bg-[hsl(48_96%_60%)] border-[2px] border-foreground px-3 py-2 shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                        <p className="text-sm font-extrabold text-foreground">{panels[bookPage].caption}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <ImagePlus className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No image yet</p>
                  </div>
                )}
              </div>

              <div className="bg-[hsl(40_30%_98%)] dark:bg-background p-6 sm:p-8 overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-baseline gap-2 border-b-2 border-foreground/20 pb-2">
                    <span className="text-3xl font-black text-primary">{String(bookPage + 1).padStart(2, "0")}</span>
                    <h3 className="text-lg font-extrabold text-foreground">{panels[bookPage]?.title}</h3>
                  </div>
                  {panels[bookPage]?.narration && (
                    <p className="text-base leading-relaxed text-foreground font-medium first-letter:text-4xl first-letter:font-black first-letter:float-left first-letter:mr-2 first-letter:text-primary">
                      {panels[bookPage].narration}
                    </p>
                  )}
                  {panels[bookPage]?.dialogue && (
                    <div className="bg-primary/10 border-l-4 border-primary px-4 py-3 rounded-r-lg">
                      <p className="text-sm font-bold text-foreground italic">"{panels[bookPage].dialogue}"</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 font-black">— {hero}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-foreground/10">
                    {panels[bookPage]?.scene}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-foreground/95 text-background px-3 py-2">
              <Button size="sm" variant="ghost" onClick={() => setBookPage((p) => Math.max(0, p - 1))} disabled={bookPage === 0} className="text-background hover:bg-background/20 hover:text-background gap-1">
                <ChevronLeft className="w-4 h-4" /> Prev
              </Button>
              <div className="flex gap-1">
                {panels.map((_, i) => (
                  <button key={i} onClick={() => setBookPage(i)} className={`w-2 h-2 rounded-full transition-all ${i === bookPage ? "bg-background w-6" : "bg-background/40"}`} aria-label={`Page ${i + 1}`} />
                ))}
              </div>
              <Button size="sm" variant="ghost" onClick={() => setBookPage((p) => Math.min(panels.length - 1, p + 1))} disabled={bookPage === panels.length - 1} className="text-background hover:bg-background/20 hover:text-background gap-1">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComicBook;
