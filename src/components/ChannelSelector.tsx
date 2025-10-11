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
      <Tv2 className="w-5 h-5 text-muted-foreground" />
      <Select value={selectedChannel} onValueChange={onChannelChange}>
        <SelectTrigger className="w-[200px] bg-card border-border">
          <SelectValue placeholder="Toutes les chaînes" />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
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
