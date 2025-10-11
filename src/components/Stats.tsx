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
      <Card className="p-4 bg-gradient-to-br from-card to-card/50 border-border backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-secondary">
            <Tv2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Chaînes disponibles</p>
            <p className="text-2xl font-bold text-foreground">{totalChannels}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-gradient-to-br from-card to-card/50 border-border backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
            <Radio className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">En direct</p>
            <p className="text-2xl font-bold text-foreground">{livePrograms}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-gradient-to-br from-card to-card/50 border-border backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Programmes disponibles</p>
            <p className="text-2xl font-bold text-foreground">{totalPrograms}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
