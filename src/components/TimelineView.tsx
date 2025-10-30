import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Program, categoryColors } from '@/types/program';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TimelineViewProps {
  programs: Program[];
  onProgramClick: (program: Program) => void;
}

const PIXELS_PER_MINUTE = 2.5; // 150px per hour / 60 minutes

export const TimelineView = ({ programs, onProgramClick }: TimelineViewProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const timeToMinutes = useCallback((time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }, []);

  const packProgramsIntoTracks = useCallback((channelPrograms: Program[]) => {
    const sortedPrograms = [...channelPrograms].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    const tracks: Program[][] = [];

    sortedPrograms.forEach(program => {
      let placed = false;
      for (const track of tracks) {
        const lastProgramInTrack = track[track.length - 1];
        if (timeToMinutes(program.startTime) >= timeToMinutes(lastProgramInTrack.endTime)) {
          track.push(program);
          placed = true;
          break;
        }
      }
      if (!placed) {
        tracks.push([program]);
      }
    });
    return tracks;
  }, [timeToMinutes]);

  const channelsWithTracks = useMemo(() => {
    const grouped = programs.reduce((acc, program) => {
      if (!acc[program.channel]) {
        acc[program.channel] = [];
      }
      acc[program.channel].push(program);
      return acc;
    }, {} as Record<string, Program[]>);

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([channelName, channelPrograms]) => ({
        name: channelName,
        tracks: packProgramsIntoTracks(channelPrograms),
      }));
  }, [programs, packProgramsIntoTracks]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const nowInMinutes = now.getHours() * 60 + now.getMinutes();

  useEffect(() => {
    if (scrollContainerRef.current) {
      const scrollTargetInMinutes = Math.max(0, nowInMinutes - 60);
      const scrollTargetInPixels = scrollTargetInMinutes * PIXELS_PER_MINUTE;
      scrollContainerRef.current.scrollLeft = scrollTargetInPixels;
    }
  }, [nowInMinutes]);

  return (
    <div ref={scrollContainerRef} className="bg-card p-4 rounded-lg shadow-lg overflow-auto relative" style={{ height: 'calc(100vh - 420px)' }}>
      <div style={{ width: `${150 + hours.length * 150}px` }}>
        {/* Time Axis */}
        <div className="grid sticky top-0 bg-card z-20" style={{ gridTemplateColumns: `150px repeat(24, 150px)` }}>
          <div className="border-r border-b border-border p-2 font-bold">Chaîne</div>
          {hours.map(hour => (
            <div key={hour} className="border-r border-b border-border p-2 text-center font-semibold">
              {`${hour.toString().padStart(2, '0')}:00`}
            </div>
          ))}
        </div>

        {/* Channel Rows & Programs */}
        <div className="relative">
          {/* Current Time Line */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
            style={{ left: `${150 + nowInMinutes * PIXELS_PER_MINUTE}px` }}
          ></div>

          {channelsWithTracks.map(({ name, tracks }) => (
            <div key={name} className="relative flex border-b border-border">
              <div className="w-[150px] flex-shrink-0 p-2 font-bold sticky left-0 bg-card z-10 border-r border-border">
                {name}
              </div>
              <div className="relative flex-grow" style={{ height: `${tracks.length * 40}px` }}>
                {tracks.map((track, trackIndex) => (
                  <div key={trackIndex} className="absolute w-full" style={{ top: `${trackIndex * 40}px`, height: '40px' }}>
                    {track.map(program => {
                      const left = timeToMinutes(program.startTime) * PIXELS_PER_MINUTE;
                      const width = program.duration * PIXELS_PER_MINUTE;
                      const categoryColor = categoryColors[program.category] || 'from-gray-500 to-gray-600';

                      return (
                        <TooltipProvider key={program.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`absolute top-1 bottom-1 flex items-center justify-center p-1 rounded ${categoryColors[program.category] || 'bg-gray-600'} text-white text-xs font-semibold overflow-hidden shadow-sm cursor-pointer`}
                                style={{ left: `${left}px`, width: `${width}px` }}
                                onClick={() => onProgramClick(program)}
                              >
                                <span className="truncate px-1">{program.title}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-bold">{program.title}</p>
                              <p>{program.startTime} - {program.endTime} ({program.duration} min)</p>
                              <p className="text-muted-foreground">{program.category}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
