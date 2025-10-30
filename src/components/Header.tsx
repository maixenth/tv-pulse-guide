import { Search, Heart, Tv, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ModeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  favoritesCount: number;
}

export const Header = ({ searchQuery, onSearchChange, favoritesCount }: HeaderProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleReloadEPG = async () => {
    setIsUpdating(true);
    toast({
      title: "Mise à jour EPG",
      description: "Téléchargement et mise à jour des données...",
    });

    try {
      const { data, error } = await supabase.functions.invoke('populate-epg-data');
      
      if (error) throw error;

      toast({
        title: "✅ EPG mis à jour",
        description: `${data.channelsCount} chaînes et ${data.programsCount} programmes chargés`,
      });
      
      window.location.reload();
    } catch (error) {
      console.error('Error refreshing EPG:', error);
      toast({
        title: "Erreur",
        description: "Échec de la mise à jour EPG",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-border/50 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-accent to-secondary shadow-lg shadow-primary/30 animate-scale-in">
              <Tv className="w-7 h-7 text-white drop-shadow-lg" />
            </div>
            <h1 className="text-3xl font-bold gradient-text drop-shadow-sm">
              TV Guide
            </h1>
          </div>

          <div className="flex-1 max-w-xl">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <Input
                type="text"
                placeholder="Rechercher un programme, une chaîne..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 glassmorphism focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleReloadEPG}
              disabled={isUpdating}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
              {isUpdating ? 'Mise à jour...' : 'MAJ EPG'}
            </Button>
            <button className="relative p-2 rounded-lg hover:bg-card transition-colors">
              <Heart className="w-6 h-6 text-foreground" />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-primary to-secondary rounded-full text-xs flex items-center justify-center text-white font-semibold">
                  {favoritesCount}
                </span>
              )}
            </button>
            <ModeToggle />
          </div>
        </div>
      </div>
    </header>
  );
};