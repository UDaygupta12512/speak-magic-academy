import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  BookOpen,
  ChevronLeft,
  Mic,
  AudioLines
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { stories } from "@/data/stories";
import { useTextToSpeech } from "@/hooks/useVoice";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStoryProgress, type StoryPlayMode } from "@/hooks/useStoryProgress";

type PlayMode = StoryPlayMode;

const StoryPlayer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [playMode, setPlayMode] = useState<PlayMode>("voice");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [currentParagraph, setCurrentParagraph] = useState(0);
  const [showResume, setShowResume] = useState(false);
  
  const tts = useTextToSpeech({ rate: 0.85, pitch: 1.1 });

  const story = stories.find(s => s.id === id) || stories[0];

  const { saved, save } = useStoryProgress(story.id);
  const restoredRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);

  // ── Restore saved position (page, narration seconds, mode) once ──
  useEffect(() => {
    if (restoredRef.current || !saved) return;
    restoredRef.current = true;
    setPlayMode(saved.play_mode);
    setCurrentParagraph(saved.paragraph_index);
    if (saved.audio_position > 0) {
      pendingSeekRef.current = saved.audio_position;
      setCurrentTime(saved.audio_position);
      if (audioRef.current && audioRef.current.readyState > 0) {
        audioRef.current.currentTime = saved.audio_position;
        pendingSeekRef.current = null;
      }
    }
    if (saved.paragraph_index > 0 || saved.audio_position > 0) {
      setShowResume(true);
    }
  }, [saved]);

  // ── Persist position whenever it meaningfully changes ──
  useEffect(() => {
    if (!restoredRef.current && !saved) restoredRef.current = true;
    save({
      paragraph_index: currentParagraph,
      audio_position: playMode === "audio" ? currentTime : 0,
      play_mode: playMode,
      completed: currentParagraph >= story.paragraphs.length - 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentParagraph, playMode, Math.floor(currentTime)]);


  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      setDuration(audio.duration);
      // Apply a restored narration position once the media is seekable.
      if (pendingSeekRef.current !== null) {
        audio.currentTime = pendingSeekRef.current;
        pendingSeekRef.current = null;
      }
    };
    const handleEnded = () => setIsPlaying(false);


    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  // Update current paragraph based on time (audio mode)
  useEffect(() => {
    if (playMode !== "audio" || !story.timestamps) return;
    const index = story.timestamps.findIndex((t, i) => {
      const nextTime = story.timestamps?.[i + 1] ?? duration;
      return currentTime >= t && currentTime < nextTime;
    });
    if (index !== -1 && index !== currentParagraph) {
      setCurrentParagraph(index);
    }
  }, [currentTime, story.timestamps, duration, currentParagraph, playMode]);

  // Sync TTS current index with paragraph (voice mode)
  useEffect(() => {
    if (playMode === "voice" && tts.currentIndex !== -1) {
      setCurrentParagraph(tts.currentIndex);
    }
  }, [tts.currentIndex, playMode]);

  const togglePlay = () => {
    if (playMode === "voice") {
      if (tts.isSpeaking) {
        if (tts.isPaused) {
          tts.resume();
        } else {
          tts.pause();
        }
      } else {
        tts.speakSequence(story.paragraphs, currentParagraph);
      }
      setIsPlaying(!tts.isPaused && tts.isSpeaking ? false : true);
    } else {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
      }
    }
  };

  // Sync isPlaying with TTS state
  useEffect(() => {
    if (playMode === "voice") {
      setIsPlaying(tts.isSpeaking && !tts.isPaused);
    }
  }, [tts.isSpeaking, tts.isPaused, playMode]);

  const handleSeek = (value: number[]) => {
    if (playMode === "audio" && audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume || 0.8;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const skipForward = () => {
    if (playMode === "voice") {
      // Skip to next paragraph
      const nextIndex = Math.min(currentParagraph + 1, story.paragraphs.length - 1);
      tts.stop();
      setCurrentParagraph(nextIndex);
      if (isPlaying) {
        tts.speakSequence(story.paragraphs, nextIndex);
      }
    } else if (audioRef.current) {
      audioRef.current.currentTime = Math.min(currentTime + 10, duration);
    }
  };

  const skipBackward = () => {
    if (playMode === "voice") {
      // Skip to previous paragraph
      const prevIndex = Math.max(currentParagraph - 1, 0);
      tts.stop();
      setCurrentParagraph(prevIndex);
      if (isPlaying) {
        tts.speakSequence(story.paragraphs, prevIndex);
      }
    } else if (audioRef.current) {
      audioRef.current.currentTime = Math.max(currentTime - 10, 0);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const jumpToParagraph = (index: number) => {
    if (playMode === "voice") {
      tts.stop();
      setCurrentParagraph(index);
      tts.speakSequence(story.paragraphs, index);
    } else if (audioRef.current && story.timestamps?.[index] !== undefined) {
      audioRef.current.currentTime = story.timestamps[index];
      setCurrentTime(story.timestamps[index]);
      setCurrentParagraph(index);
    }
  };

  const handleModeChange = (mode: string) => {
    // Stop current playback
    if (playMode === "voice") {
      tts.stop();
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setPlayMode(mode as PlayMode);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/stories")}
            className="shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-foreground truncate">{story.title}</h1>
          </div>
        </div>
      </div>

      {/* Cover Image */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative aspect-square max-w-xs mx-auto rounded-3xl overflow-hidden shadow-xl"
        >
          <img loading="lazy" decoding="async"
            src={story.image}
            alt={story.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          
          {/* Animated playing indicator */}
          <AnimatePresence>
            {isPlaying && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-4 left-4 flex items-end gap-1"
              >
                {[1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-white rounded-full"
                    animate={{
                      height: [8, 20, 8],
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Story Info */}
        <div className="text-center mt-4 mb-4">
          <h2 className="text-xl font-bold text-foreground">{story.title}</h2>
          <p className="text-muted-foreground text-sm mt-1">{story.description}</p>
        </div>

        {/* Resume banner */}
        {showResume && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3"
          >
            <p className="text-sm text-foreground">
              Resume from paragraph {currentParagraph + 1}
              {playMode === "audio" && saved?.audio_position
                ? ` · ${formatTime(saved.audio_position)}`
                : ""}
            </p>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => {
                  setShowResume(false);
                  if (playMode === "voice") {
                    tts.speakSequence(story.paragraphs, currentParagraph);
                  } else {
                    audioRef.current?.play();
                    setIsPlaying(true);
                  }
                }}
              >
                Resume
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowResume(false);
                  setCurrentParagraph(0);
                  setCurrentTime(0);
                  if (audioRef.current) audioRef.current.currentTime = 0;
                }}
              >
                Start over
              </Button>
            </div>
          </motion.div>
        )}


        {/* Play Mode Toggle */}
        <div className="flex justify-center mb-4">
          <Tabs value={playMode} onValueChange={handleModeChange}>
            <TabsList className="grid w-64 grid-cols-2">
              <TabsTrigger value="voice" className="flex items-center gap-2">
                <AudioLines className="w-4 h-4" />
                Read Aloud
              </TabsTrigger>
              <TabsTrigger value="audio" className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Audio File
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Progress Bar - only show for audio mode */}
        {playMode === "audio" && (
          <div className="space-y-2">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Voice mode progress indicator */}
        {playMode === "voice" && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>Paragraph {currentParagraph + 1} of {story.paragraphs.length}</span>
          </div>
        )}

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={skipBackward}
            className="w-12 h-12"
          >
            <SkipBack className="w-6 h-6" />
          </Button>
          
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 fill-current" />
              ) : (
                <Play className="w-8 h-8 fill-current ml-1" />
              )}
            </Button>
          </motion.div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={skipForward}
            className="w-12 h-12"
          >
            <SkipForward className="w-6 h-6" />
          </Button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="shrink-0"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            className="w-32"
          />
        </div>

        {/* Story Text with Highlighting */}
        <div className="mt-8 pb-8">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Story Text
          </h3>
          <div className="space-y-3">
            {story.paragraphs.map((paragraph, index) => (
              <motion.button
                key={index}
                onClick={() => jumpToParagraph(index)}
                className={`block w-full text-left p-3 rounded-xl transition-all ${
                  currentParagraph === index
                    ? "bg-primary/10 border-l-4 border-primary"
                    : "bg-muted/50 hover:bg-muted"
                }`}
                animate={{
                  scale: currentParagraph === index ? 1.01 : 1,
                }}
              >
                <p
                  className={`text-sm leading-relaxed ${
                    currentParagraph === index
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {paragraph}
                </p>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} src={story.audioUrl} preload="metadata" />
    </div>
  );
};

export default StoryPlayer;
