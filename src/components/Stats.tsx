import { Tv2, Radio, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface StatsProps {
  totalChannels: number;
  totalPrograms: number;
  livePrograms: number;
}

export const Stats = ({ totalChannels, totalPrograms, livePrograms }: StatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card className="p-5 glassmorphism card-hover group animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary via-accent to-secondary shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-all duration-300 group-hover:scale-110">
            <Tv2 className="w-7 h-7 text-white drop-shadow-lg" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Chaînes disponibles</p>
            <p className="text-3xl font-bold gradient-text">{totalChannels}</p>
          </div>
        </div>
      </Card>

      <Card className="p-5 glassmorphism card-hover group animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30 group-hover:shadow-green-500/50 transition-all duration-300 group-hover:scale-110">
            <Radio className="w-7 h-7 text-white drop-shadow-lg" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">En direct</p>
            <p className="text-3xl font-bold gradient-text">{livePrograms}</p>
          </div>
        </div>
      </Card>

      <Card className="p-5 glassmorphism card-hover group animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-all duration-300 group-hover:scale-110">
            <TrendingUp className="w-7 h-7 text-white drop-shadow-lg" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Programmes disponibles</p>
            <p className="text-3xl font-bold gradient-text">{totalPrograms}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
