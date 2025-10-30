import { Program, categoryColors } from '@/types/program';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Clock, Tv2 } from 'lucide-react';
import { useState } from 'react';

interface ProgramCardProps {
  program: Program;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onClick: (program: Program) => void;
}

export const ProgramCard = ({ 
  program, 
  isFavorite, 
  onToggleFavorite,
  onClick 
}: ProgramCardProps) => {
  const [imageError, setImageError] = useState(false);

  return (
    <Card 
      className="group cursor-pointer overflow-hidden border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
      onClick={() => onClick(program)}
    >
      <div className="relative aspect-video overflow-hidden">
        {!imageError ? (
          <img
            src={program.image}
            alt={program.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center">
            <Tv2 className="w-16 h-16 text-muted-foreground/50" />
          </div>
        )}
        
        <div className="absolute top-2 left-2">
          <Badge className={`bg-gradient-to-r ${categoryColors[program.category]}`}>
            {program.category}
          </Badge>
        </div>
        
        {program.isLive && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-red-500 animate-pulse">
              ● EN DIRECT
            </Badge>
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(program.id);
          }}
          className="absolute bottom-2 right-2 p-2 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
        >
          <Heart 
            className={`w-5 h-5 transition-colors ${
              isFavorite ? 'fill-red-500 text-red-500' : 'text-white'
            }`} 
          />
        </button>
      </div>

      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-lg line-clamp-1 text-foreground group-hover:text-primary transition-colors">
            {program.title}
          </h3>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Tv2 className="w-4 h-4" />
          <span>{program.channel}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{program.date}</span>
          <span>•</span>
          <span>{program.startTime} - {program.endTime}</span>
          <span>•</span>
          <span>{program.duration} min</span>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {program.description}
        </p>
      </div>
    </Card>
  );
};
