import { Tv2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ChannelSelectorProps {
  channels: string[];
  selectedChannel: string;
  onChannelChange: (channel: string) => void;
}

export const ChannelSelector = ({ 
  channels, 
  selectedChannel, 
  onChannelChange 
}: ChannelSelectorProps) => {
  return (
    <div className="flex items-center gap-2">
      <Tv2 className="w-5 h-5 text-primary" />
      <Select value={selectedChannel} onValueChange={onChannelChange}>
        <SelectTrigger className="w-[200px] glassmorphism hover:border-primary/50 transition-all">
          <SelectValue placeholder="Toutes les chaînes" />
        </SelectTrigger>
        <SelectContent className="glassmorphism border-border/50 max-h-[300px] overflow-y-auto">
          <SelectItem value="all">Toutes les chaînes</SelectItem>
          {channels.map((channel) => (
            <SelectItem key={channel} value={channel}>
              {channel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
