import { Program, categoryGradientColors } from '@/types/program';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Clock, Tv2, Users } from 'lucide-react';

interface ProgramDialogProps {
  program: Program | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProgramDialog = ({ program, open, onOpenChange }: ProgramDialogProps) => {
  if (!program) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg -mt-6 -mx-6 mb-4">
          <img
            src={program.image}
            alt={program.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
          
          <div className="absolute bottom-4 left-4 right-4">
            <Badge className={`bg-gradient-to-r ${categoryGradientColors[program.category]} mb-2`}>
              {program.category}
            </Badge>
            {program.isLive && (
              <Badge className="bg-red-500 animate-pulse ml-2">
                ● EN DIRECT
              </Badge>
            )}
          </div>
        </div>

        <DialogHeader>
          <DialogTitle className="text-2xl text-foreground">{program.title}</DialogTitle>
          <DialogDescription className="space-y-3 pt-2">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Tv2 className="w-4 h-4" />
                <span>{program.channel}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{program.startTime} - {program.endTime}</span>
              </div>
              <span>•</span>
              <span>{program.duration} min</span>
            </div>

            {program.actors && program.actors.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <Users className="w-4 h-4 mt-0.5" />
                <span>{program.actors.join(', ')}</span>
              </div>
            )}

            <p className="text-base text-foreground/90 leading-relaxed pt-2">
              {program.description}
            </p>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
