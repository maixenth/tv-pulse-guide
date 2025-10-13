import { Search, Heart, Tv, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
<<<<<<< HEAD
import { ModeToggle } from '@/components/theme-toggle';
=======
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
>>>>>>> 28f7540cea0c6752b27c4597b1f1c0e7b07dc221

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
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary">
              <Tv className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              TV Guide
            </h1>
          </div>

          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher un programme, une chaîne..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 bg-card border-border focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
<<<<<<< HEAD
=======
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

>>>>>>> 28f7540cea0c6752b27c4597b1f1c0e7b07dc221
            <button className="relative p-2 rounded-lg hover:bg-card transition-colors">
              <Heart className="w-6 h-6 text-foreground" />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-primary to-secondary rounded-full text-xs flex items-center justify-center text-white font-semibold">
                  {favoritesCount}
                </span>
              )}
            </button>
<<<<<<< HEAD
            <ModeToggle />
=======
>>>>>>> 28f7540cea0c6752b27c4597b1f1c0e7b07dc221
          </div>
        </div>
      </div>
    </header>
  );
};
