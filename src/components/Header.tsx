import { Search, Heart, Tv, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  favoritesCount: number;
  onReloadEPG?: () => void;
}

export const Header = ({ searchQuery, onSearchChange, favoritesCount, onReloadEPG }: HeaderProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleReloadEPG = async () => {
    if (!onReloadEPG) return;
    
    setIsUpdating(true);
    toast({
      title: "Rechargement EPG",
      description: "Téléchargement et parsing en cours...",
    });

    try {
      // Clear cache to force fresh download
      localStorage.removeItem('epg-cache');
      await onReloadEPG();
      
      toast({
        title: "Succès",
        description: "EPG rechargé avec succès !",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Échec du rechargement EPG",
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
            {onReloadEPG && (
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
            )}

            <button className="relative p-2 rounded-lg hover:bg-card transition-colors">
              <Heart className="w-6 h-6 text-foreground" />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-primary to-secondary rounded-full text-xs flex items-center justify-center text-white font-semibold">
                  {favoritesCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
