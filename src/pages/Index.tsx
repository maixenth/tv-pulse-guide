import { useState, useMemo, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { toast } from 'sonner';

// UI Components
import { Header } from '@/components/Header';
import { CategoryFilter } from '@/components/CategoryFilter';
import { ProgramCard } from '@/components/ProgramCard';
import { ProgramDialog } from '@/components/ProgramDialog';
import { ChannelSelector } from '@/components/ChannelSelector';
import { DateFilter } from '@/components/DateFilter';
import { Stats } from '@/components/Stats';
import { TimelineView } from '@/components/TimelineView';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

// EPG Service
import { Program, ProgramCategory } from '@/types/program';
import { supabase } from '@/integrations/supabase/client';

const VirtualizedGrid = ({ programs, favorites, onToggleFavorite, onProgramClick }) => {
  const parentRef = useRef(null);

  const getColumnCount = () => {
    if (typeof window === 'undefined') return 1;
    if (window.innerWidth >= 1920) return 6;  // 6 colonnes sur très grands écrans
    if (window.innerWidth >= 1536) return 5;  // 5 colonnes sur grands écrans
    if (window.innerWidth >= 1280) return 4;  // 4 colonnes sur écrans larges
    if (window.innerWidth >= 1024) return 3;  // 3 colonnes sur tablettes
    if (window.innerWidth >= 640) return 2;   // 2 colonnes sur petits écrans
    return 1;                                  // 1 colonne sur mobile
  };

  const [columnCount, setColumnCount] = useState(getColumnCount());

  useEffect(() => {
    const handleResize = () => setColumnCount(getColumnCount());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const rowCount = Math.ceil(programs.length / columnCount);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 296, // h-[280px] + gap-4 (1rem = 16px)
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: 'calc(100vh - 250px)', overflow: 'auto' }}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columnCount;
          const endIndex = Math.min(startIndex + columnCount, programs.length);
          const rowPrograms = programs.slice(startIndex, endIndex);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4">
                {rowPrograms.map(program => (
                  <ProgramCard
                    key={program.id}
                    program={program}
                    isFavorite={favorites.has(program.id)}
                    onToggleFavorite={onToggleFavorite}
                    onClick={onProgramClick}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Index = () => {
  // State for UI controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Tous' | Program['category']>('Tous');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');

  // State for program dialog
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // State for data fetching
  const [allPrograms, setAllPrograms] = useState<Program[]>([]);
  const [allChannels, setAllChannels] = useState<{ id: string; name: string; logo: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      console.log('Chargement des chaînes depuis Supabase...');
      setIsLoading(true);
      try {
        // Charger les chaînes
        const { data: channelsData, error: channelsError } = await supabase
          .from('channels')
          .select('id, name, logo')
          .order('name');

        if (channelsError) throw channelsError;

        // Charger les programmes
        const { data: programsData, error: programsError } = await supabase
          .from('programs')
          .select('*')
          .order('start_time');

        if (programsError) throw programsError;

        // Transformer les programmes au format attendu
        const transformedPrograms: Program[] = (programsData || []).map(prog => {
          const startDate = new Date(prog.start_time);
          const endDate = new Date(prog.end_time);
          const channelInfo = channelsData?.find(ch => ch.id === prog.channel_id);

          return {
            id: prog.id,
            title: prog.title,
            channel: channelInfo?.name || prog.channel_id,
            category: (prog.category || 'Divertissement') as ProgramCategory,
            date: startDate.toLocaleDateString('fr-FR'),
            startTime: startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            endTime: endDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            description: prog.description || '',
            image: channelInfo?.logo || null,
            duration: Math.round((endDate.getTime() - startDate.getTime()) / 60000),
            isLive: prog.is_live || false,
            actors: [],
          };
        });

        setAllPrograms(transformedPrograms);
        setAllChannels(channelsData || []);
        toast.success(`${channelsData?.length || 0} chaînes et ${transformedPrograms.length} programmes chargés !`);
      } catch (error) {
        toast.error('Erreur lors du chargement des données.');
        console.error('Erreur:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const availableChannels = useMemo(() => {
    return allChannels.map(ch => ch.name).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [allChannels]);

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
    const formattedSelectedDate = selectedDate.toLocaleDateString('fr-FR');

    return allPrograms.filter((program) => {
      const matchesDate = program.date === formattedSelectedDate;

      const matchesCategory =
        selectedCategory === 'Tous' || program.category === selectedCategory;
      
      const matchesChannel =
        selectedChannel === 'all' || program.channel === selectedChannel;
      
      const matchesSearch =
        searchQuery === '' ||
        program.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        program.channel.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesDate && matchesCategory && matchesChannel && matchesSearch;
    });
  }, [allPrograms, searchQuery, selectedCategory, selectedChannel, selectedDate]);

  const liveProgramsCount = useMemo(() => {
    return 0; // Simplified for now
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
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

      <main className="container mx-auto px-6 py-8 max-w-[2000px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="ml-4 text-lg text-muted-foreground">Chargement du guide des programmes...</p>
          </div>
        ) : (
          <>
            <Stats 
              totalChannels={availableChannels.length}
              totalPrograms={allPrograms.length}
              livePrograms={liveProgramsCount}
            />

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
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
              <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as any)}>
                <ToggleGroupItem value="grid">Grille</ToggleGroupItem>
                <ToggleGroupItem value="timeline">Timeline</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="mb-6">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                {selectedCategory === 'Tous' ? 'Programmes TV' : selectedCategory}
                {selectedChannel !== 'all' && ` - ${selectedChannel}`}
              </h2>
              <p className="text-muted-foreground">
                {filteredPrograms.length} programme{filteredPrograms.length > 1 ? 's' : ''} trouvé{filteredPrograms.length > 1 ? 's' : ''}
              </p>
            </div>

            {filteredPrograms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-xl text-muted-foreground mb-2">Aucun programme trouvé</p>
                <p className="text-sm text-muted-foreground">Essayez de modifier vos filtres.</p>
              </div>
            ) : (
              viewMode === 'grid' ? (
                <VirtualizedGrid programs={filteredPrograms} favorites={favorites} onToggleFavorite={toggleFavorite} onProgramClick={handleProgramClick} />
              ) : (
                <TimelineView programs={filteredPrograms} onProgramClick={handleProgramClick} />
              )
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
