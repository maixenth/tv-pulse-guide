import { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/Header';
import { CategoryFilter } from '@/components/CategoryFilter';
import { ProgramCard } from '@/components/ProgramCard';
import { ProgramDialog } from '@/components/ProgramDialog';
import { ChannelSelector } from '@/components/ChannelSelector';
import { DateFilter } from '@/components/DateFilter';
import { Stats } from '@/components/Stats';
import { mockPrograms, channels } from '@/data/mockPrograms';
import { Program, ProgramCategory } from '@/types/program';
import { useIPTVChannels } from '@/hooks/useIPTVChannels';
import { toast } from 'sonner';

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProgramCategory | 'Tous'>('Tous');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch real IPTV channels
  const { data: iptvData, isLoading, error } = useIPTVChannels();

  useEffect(() => {
    if (error) {
      toast.error('Erreur lors du chargement des chaînes TV', {
        description: 'Utilisation des données de démonstration'
      });
    } else if (iptvData) {
      toast.success(`${iptvData.totalChannels} chaînes TV chargées !`, {
        description: 'Données en temps réel disponibles'
      });
    }
  }, [iptvData, error]);

  // Get unique channels list from IPTV data
  const availableChannels = useMemo(() => {
    if (iptvData?.channels) {
      const uniqueChannels = Array.from(new Set(iptvData.channels.map(ch => ch.name))).sort();
      return uniqueChannels;
    }
    return channels;
  }, [iptvData]);

  const categories: ProgramCategory[] = [
    'Sport',
    'Cinéma',
    'Séries',
    'Actualités',
    'Divertissement',
    'Documentaires',
    'Enfants',
  ];

  const filteredPrograms = useMemo(() => {
    return mockPrograms.filter((program) => {
      const matchesCategory =
        selectedCategory === 'Tous' || program.category === selectedCategory;
      
      const matchesChannel =
        selectedChannel === 'all' || program.channel === selectedChannel;
      
      const matchesSearch =
        searchQuery === '' ||
        program.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        program.channel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        program.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesChannel && matchesSearch;
    });
  }, [searchQuery, selectedCategory, selectedChannel]);

  const livePrograms = useMemo(() => {
    return filteredPrograms.filter(p => p.isLive).length;
  }, [filteredPrograms]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
      } else {
        newFavorites.add(id);
      }
      return newFavorites;
    });
  };

  const handleProgramClick = (program: Program) => {
    setSelectedProgram(program);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        favoritesCount={favorites.size}
      />

      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      <main className="container mx-auto px-4 py-8">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="ml-4 text-lg text-muted-foreground">Chargement des chaînes TV en direct...</p>
          </div>
        )}

        {!isLoading && (
          <>
            <Stats 
              totalChannels={availableChannels.length}
              totalPrograms={mockPrograms.length}
              livePrograms={livePrograms}
            />

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <ChannelSelector
            channels={availableChannels}
            selectedChannel={selectedChannel}
            onChannelChange={setSelectedChannel}
          />
          <DateFilter
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </div>

        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            {selectedCategory === 'Tous' ? 'Programmes disponibles' : selectedCategory}
            {selectedChannel !== 'all' && ` - ${selectedChannel}`}
          </h2>
          <p className="text-muted-foreground">
            {filteredPrograms.length} programme{filteredPrograms.length > 1 ? 's' : ''} trouvé
            {filteredPrograms.length > 1 ? 's' : ''}
          </p>
        </div>

        {filteredPrograms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-xl text-muted-foreground mb-2">Aucun programme trouvé</p>
            <p className="text-sm text-muted-foreground">
              Essayez de modifier vos filtres ou votre recherche
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPrograms.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                isFavorite={favorites.has(program.id)}
                onToggleFavorite={toggleFavorite}
                onClick={handleProgramClick}
              />
            ))}
          </div>
        )}
          </>
        )}
      </main>

      <ProgramDialog
        program={selectedProgram}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
};

export default Index;
