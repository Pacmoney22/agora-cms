import React, { useState, useRef, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { Play, Pause, Volume2, Download } from 'lucide-react';

export interface AudioPlayerProps {
  src: string;
  title: string;
  artist?: string | null;
  coverImage?: string | null;
  showWaveform?: boolean;
  showDownload?: boolean;
  showPlaybackSpeed?: boolean;
  style?: 'standard' | 'minimal' | 'card';
  className?: string;
}

const PLAYBACK_SPEEDS = [0.5, 1, 1.5, 2];

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  title,
  artist = null,
  coverImage = null,
  showWaveform = false,
  showDownload = false,
  showPlaybackSpeed = false,
  style = 'standard',
  className,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (!isDragging) setCurrentTime(audio.currentTime);
    };
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isDragging]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      const bar = progressRef.current;
      if (!audio || !bar) return;

      const rect = bar.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newTime = fraction * duration;
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [duration],
  );

  const handleProgressDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      handleProgressClick(e);
    },
    [isDragging, handleProgressClick],
  );

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value);
      setVolume(newVolume);
      if (audioRef.current) {
        audioRef.current.volume = newVolume;
      }
    },
    [],
  );

  const cyclePlaybackSpeed = useCallback(() => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    const newSpeed = PLAYBACK_SPEEDS[nextIndex]!;
    setPlaybackSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  }, [playbackSpeed]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Generate simple waveform visualization bars
  const waveformBars = showWaveform
    ? Array.from({ length: 40 }, (_, i) => {
        const height = 20 + Math.sin(i * 0.7) * 15 + Math.cos(i * 1.3) * 10;
        const isActive = (i / 40) * 100 <= progress;
        return { height: Math.max(8, height), isActive };
      })
    : [];

  const renderProgressBar = () => {
    if (showWaveform) {
      return (
        <div
          ref={progressRef}
          className="flex h-10 cursor-pointer items-end gap-px"
          onClick={handleProgressClick}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onMouseMove={handleProgressDrag}
          onMouseLeave={() => setIsDragging(false)}
          role="slider"
          aria-label="Audio progress"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
          aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
          tabIndex={0}
        >
          {waveformBars.map((bar, i) => (
            <div
              key={i}
              className={clsx(
                'flex-1 rounded-sm transition-colors',
                bar.isActive ? 'bg-blue-500' : 'bg-gray-300',
              )}
              style={{ height: `${bar.height}%` }}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        ref={progressRef}
        className="group relative h-1.5 cursor-pointer rounded-full bg-gray-200"
        onClick={handleProgressClick}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseMove={handleProgressDrag}
        onMouseLeave={() => setIsDragging(false)}
        role="slider"
        aria-label="Audio progress"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
        tabIndex={0}
      >
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-blue-500 opacity-0 shadow transition-opacity group-hover:opacity-100"
          style={{ left: `${progress}%`, marginLeft: '-7px' }}
        />
      </div>
    );
  };

  const renderControls = () => (
    <div className="flex items-center gap-3">
      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        className={clsx(
          'flex shrink-0 items-center justify-center rounded-full transition-colors',
          style === 'minimal'
            ? 'h-8 w-8 bg-gray-100 hover:bg-gray-200'
            : 'h-10 w-10 bg-blue-500 text-white hover:bg-blue-600',
        )}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className={style === 'minimal' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        ) : (
          <Play
            className={clsx(
              style === 'minimal' ? 'h-3.5 w-3.5' : 'h-4 w-4',
              'ml-0.5',
            )}
          />
        )}
      </button>

      {/* Progress + Time */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {renderProgressBar()}
        <div className="flex justify-between text-xs text-gray-500">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume */}
      <div
        className="relative"
        onMouseEnter={() => setShowVolumeSlider(true)}
        onMouseLeave={() => setShowVolumeSlider(false)}
      >
        <button
          className="rounded p-1 text-gray-500 transition-colors hover:text-gray-700"
          aria-label="Volume"
        >
          <Volume2 className="h-4 w-4" />
        </button>
        {showVolumeSlider && (
          <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg bg-white p-2 shadow-lg">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="h-20 w-1.5 appearance-none"
              style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
              aria-label="Volume level"
            />
          </div>
        )}
      </div>

      {/* Playback Speed */}
      {showPlaybackSpeed && (
        <button
          onClick={cyclePlaybackSpeed}
          className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          aria-label={`Playback speed: ${playbackSpeed}x`}
        >
          {playbackSpeed}x
        </button>
      )}

      {/* Download */}
      {showDownload && (
        <a
          href={src}
          download
          className="shrink-0 rounded p-1 text-gray-500 transition-colors hover:text-gray-700"
          aria-label="Download audio"
        >
          <Download className="h-4 w-4" />
        </a>
      )}
    </div>
  );

  if (style === 'minimal') {
    return (
      <div className={clsx('w-full', className)}>
        <audio ref={audioRef} src={src} preload="metadata" />
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="ml-0.5 h-3.5 w-3.5" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-gray-900">
              {title}
            </div>
            {renderProgressBar()}
          </div>
          <span className="shrink-0 text-xs text-gray-500">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    );
  }

  if (style === 'card') {
    return (
      <div
        className={clsx(
          'w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm',
          className,
        )}
      >
        <audio ref={audioRef} src={src} preload="metadata" />
        {coverImage && (
          <div className="relative aspect-square w-full max-w-xs mx-auto overflow-hidden bg-gray-100">
            <img
              src={coverImage}
              alt={`${title} cover`}
              className="h-full w-full object-cover"
            />
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity hover:opacity-100"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
                {isPlaying ? (
                  <Pause className="h-6 w-6 text-gray-900" />
                ) : (
                  <Play className="ml-1 h-6 w-6 text-gray-900" />
                )}
              </div>
            </button>
          </div>
        )}
        <div className="p-4">
          <div className="mb-1 text-base font-semibold text-gray-900">{title}</div>
          {artist && (
            <div className="mb-3 text-sm text-gray-500">{artist}</div>
          )}
          {renderControls()}
        </div>
      </div>
    );
  }

  // Standard style
  return (
    <div
      className={clsx(
        'w-full rounded-lg border border-gray-200 bg-white p-4',
        className,
      )}
    >
      <audio ref={audioRef} src={src} preload="metadata" />
      <div className="flex gap-4">
        {coverImage && (
          <img
            src={coverImage}
            alt={`${title} cover`}
            className="h-14 w-14 shrink-0 rounded-lg object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 truncate text-sm font-semibold text-gray-900">
            {title}
          </div>
          {artist && (
            <div className="mb-2 truncate text-xs text-gray-500">{artist}</div>
          )}
          {renderControls()}
        </div>
      </div>
    </div>
  );
};
