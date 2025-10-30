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
  console.log('ProgramCard props:', { program });
  const [imageError, setImageError] = useState(false);

  const categoryColor = categoryColors[program.category] || 'from-gray-500 to-gray-600';

  return (
    <Card 
      className="group cursor-pointer overflow-hidden relative border-border bg-card/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-col justify-end h-[280px]"
      onClick={() => onClick(program)}
    >
      {/* Background Image */}
      {!imageError && program.image ? (
        <img
          src={program.image}
          alt={`${program.channel} logo`}
          className="absolute inset-0 w-full h-full object-contain object-center p-8 opacity-40 blur-sm group-hover:opacity-50 transition-opacity duration-300"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className={`absolute inset-0 w-full h-full bg-gradient-to-br ${categoryColor} opacity-20`}></div>
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent"></div>

      {/* Content */}
      <div className="relative p-4 text-white space-y-2 z-10">
        <div className="flex justify-between items-start">
          <Badge className={`bg-gradient-to-r ${categoryColor} text-white border-none shadow-lg`}>
            {program.category}
          </Badge>
          {program.isLive && (
            <Badge className="bg-red-500 animate-pulse border-none shadow-lg">
              ● EN DIRECT
            </Badge>
          )}
        </div>

        <h3 className="font-bold text-xl line-clamp-2 text-white group-hover:text-primary transition-colors">
          {program.title}
        </h3>

        <div className="flex items-center gap-2 text-sm opacity-80">
          <Tv2 className="w-4 h-4" />
          <span>{program.channel}</span>
        </div>

        <div className="flex items-center gap-2 text-sm opacity-80">
          <Clock className="w-4 h-4" />
          <span>{program.date}</span>
          <span className="opacity-50">•</span>
          <span>{program.startTime} - {program.endTime}</span>
          <span className="opacity-50">•</span>
          <span>{program.duration} min</span>
        </div>
      </div>

      {/* Favorite Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(program.id);
        }}
        className="absolute top-2 right-2 p-2 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors z-20"
        aria-label="Ajouter aux favoris"
      >
        <Heart 
          className={`w-5 h-5 transition-all ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}`}
        />
      </button>
    </Card>
  );
};
