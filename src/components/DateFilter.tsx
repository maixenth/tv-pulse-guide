import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DateFilterProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export const DateFilter = ({ selectedDate, onDateChange }: DateFilterProps) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = selectedDate.toDateString() === today.toDateString();
  const isTomorrow = selectedDate.toDateString() === tomorrow.toDateString();
  const isYesterday = selectedDate.toDateString() === yesterday.toDateString();

  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-5 h-5 text-primary" />
      <div className="flex gap-2">
        <Button
          variant={isYesterday ? 'default' : 'outline'}
          size="sm"
          onClick={() => onDateChange(yesterday)}
          className={isYesterday ? 'bg-gradient-to-r from-primary to-secondary shadow-lg shadow-primary/30' : 'hover:border-primary/50'}
        >
          Hier
        </Button>
        <Button
          variant={isToday ? 'default' : 'outline'}
          size="sm"
          onClick={() => onDateChange(today)}
          className={isToday ? 'bg-gradient-to-r from-primary to-secondary shadow-lg shadow-primary/30' : 'hover:border-primary/50'}
        >
          Aujourd'hui
        </Button>
        <Button
          variant={isTomorrow ? 'default' : 'outline'}
          size="sm"
          onClick={() => onDateChange(tomorrow)}
          className={isTomorrow ? 'bg-gradient-to-r from-primary to-secondary shadow-lg shadow-primary/30' : 'hover:border-primary/50'}
        >
          Demain
        </Button>
      </div>
      <span className="text-sm text-muted-foreground ml-2 font-medium">
        {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
      </span>
    </div>
  );
};
