"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward, Settings, ChevronLeft } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";

interface VideoPlayerProps {
  mediaItemId: string;
  streamUrl: string;
  title: string;
  startPosition?: number;
  duration?: number;
  subtitlesUrl?: string;
}

export function VideoPlayer({ mediaItemId, streamUrl, title, startPosition = 0, duration: initialDuration = 0 }: VideoPlayerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const progressSaveTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startPosition);
  const [duration, setDuration] = useState(initialDuration);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const saveProgress = useCallback(async (position: number, dur: number, completed: boolean) => {
    try {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaItemId, position, duration: dur, completed }),
      });
    } catch {}
  }, [mediaItemId]);

  useEffect(() => {
    progressSaveTimerRef.current = setInterval(() => {
      if (videoRef.current && playing) {
        const pos = videoRef.current.currentTime;
        const dur = videoRef.current.duration;
        saveProgress(pos, dur, dur > 0 && pos / dur >= 0.9);
      }
    }, 15000) as unknown as ReturnType<typeof setTimeout>;
    return () => { if (progressSaveTimerRef.current) clearInterval(progressSaveTimerRef.current as unknown as ReturnType<typeof setInterval>); };
  }, [playing, saveProgress]);

  useEffect(() => {
    if (videoRef.current && startPosition > 0) videoRef.current.currentTime = startPosition;
  }, [startPosition]);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (playing) controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, [playing]);

  useEffect(() => { return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current); }; }, []);

  function togglePlay() {
    if (!videoRef.current) return;
    playing ? videoRef.current.pause() : videoRef.current.play();
  }

  function handleTimeUpdate() {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    const buf = videoRef.current.buffered;
    if (buf.length > 0) setBuffered(buf.end(buf.length - 1));
  }

  function handleLoadedMetadata() {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
    setLoading(false);
    if (startPosition > 0) videoRef.current.currentTime = startPosition;
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!videoRef.current) return;
    const vol = parseFloat(e.target.value);
    videoRef.current.volume = vol;
    setVolume(vol);
    setMuted(vol === 0);
  }

  function toggleMute() {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  }

  function skip(seconds: number) {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds));
  }

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) { containerRef.current.requestFullscreen(); setFullscreen(true); }
    else { document.exitFullscreen(); setFullscreen(false); }
  }

  function setRate(rate: number) {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
  }

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-black overflow-hidden" onMouseMove={resetControlsTimer} onClick={togglePlay}>
      <video ref={videoRef} className="w-full h-full object-contain" src={streamUrl}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setLoading(true)} onCanPlay={() => setLoading(false)}
        onEnded={() => { setPlaying(false); if (duration > 0) saveProgress(duration, duration, true); }}
        onError={() => setError("Unable to load video. Check your Put.io connection.")}
        crossOrigin="anonymous"
      />

      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 border-2 border-white/20 border-t-accent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
          <p className="text-white font-medium mb-2">Playback Error</p>
          <p className="text-muted text-sm text-center max-w-xs">{error}</p>
        </div>
      )}

      <div className={cn("absolute inset-0 flex flex-col justify-between transition-opacity duration-300 pointer-events-none", showControls ? "opacity-100" : "opacity-0")} onClick={(e) => e.stopPropagation()}>
        <div className="player-controls p-4 pointer-events-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); router.back(); }}
              className="text-white/80 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="text-white font-medium text-sm truncate">{title}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-8 pointer-events-auto">
          <button onClick={() => skip(-10)} className="text-white/80 hover:text-white transition-colors"><SkipBack className="w-8 h-8" /></button>
          <button onClick={togglePlay} className="w-16 h-16 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors">
            {playing ? <Pause className="w-8 h-8 text-white fill-white" /> : <Play className="w-8 h-8 text-white fill-white ml-1" />}
          </button>
          <button onClick={() => skip(30)} className="text-white/80 hover:text-white transition-colors"><SkipForward className="w-8 h-8" /></button>
        </div>

        <div className="player-controls p-4 space-y-3 pointer-events-auto">
          <div className="relative">
            <div className="h-1 bg-white/20 rounded-full relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: `${bufferedPct}%` }} />
              <div className="absolute inset-y-0 left-0 bg-accent rounded-full" style={{ width: `${progressPct}%` }} />
            </div>
            <input type="range" min={0} max={duration || 100} value={currentTime} onChange={handleSeek} className="absolute inset-0 w-full opacity-0 cursor-pointer h-5 -top-2" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={togglePlay} className="text-white hover:text-white/80 transition-colors">
                {playing ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
              </button>
              <button onClick={() => skip(-10)} className="text-white/70 hover:text-white transition-colors text-xs font-medium">-10</button>
              <button onClick={() => skip(30)} className="text-white/70 hover:text-white transition-colors text-xs font-medium">+30</button>
              <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="text-white hover:text-white/80 transition-colors">
                  {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={handleVolumeChange} className="w-20 h-1 cursor-pointer hidden sm:block" />
              </div>
              <span className="text-white/70 text-xs font-mono">{formatDuration(currentTime)} / {formatDuration(duration)}</span>
            </div>
            <div className="flex items-center gap-3 relative">
              <button onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }} className="text-white/70 hover:text-white transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              {showSettings && (
                <div className="absolute bottom-10 right-8 bg-surface border border-white/10 rounded-lg p-2 min-w-32 shadow-xl z-50">
                  <p className="text-xs text-muted px-2 py-1 font-medium">Playback Speed</p>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button key={rate} onClick={() => setRate(rate)} className={cn("w-full text-left px-2 py-1.5 text-sm rounded hover:bg-white/5 transition-colors", playbackRate === rate ? "text-accent" : "text-white")}>
                      {rate === 1 ? "Normal" : `${rate}×`}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={toggleFullscreen} className="text-white/70 hover:text-white transition-colors">
                {fullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
