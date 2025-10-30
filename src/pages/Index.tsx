import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';

// UI Components
import { Header } from '@/components/Header';
import { CategoryFilter } from '@/components/CategoryFilter';
import { ProgramCard } from '@/components/ProgramCard';
import { ProgramDialog } from '@/components/ProgramDialog';
import { ChannelSelector } from '@/components/ChannelSelector';
import { DateFilter } from '@/components/DateFilter';
import { Stats } from '@/components/Stats';

// EPG Service and Types
import { fetchTvGuide } from '@/services/epgService';
import { Channel, Programme as EpgProgramme, XmlText } from '@/types';

// Custom Program types for our application
import { Program, ProgramCategory } from '@/types/program';

// Helper to extract text from XML parser's output
const getText = (xmlText: XmlText): string => {
  if (typeof xmlText === 'string') return xmlText;
  if (xmlText && typeof xmlText === 'object' && '#text' in xmlText) return xmlText['#text'];
  return '';
};

// Helper to parse EPG's specific date format (YYYYMMDDHHMMSS)
const parseEpgDate = (dateString: string): Date => {
  const year = parseInt(dateString.substring(0, 4), 10);
  const month = parseInt(dateString.substring(4, 6), 10) - 1; // Month is 0-indexed
  const day = parseInt(dateString.substring(6, 8), 10);
  const hour = parseInt(dateString.substring(8, 10), 10);
  const minute = parseInt(dateString.substring(10, 12), 10);
  const second = parseInt(dateString.substring(12, 14), 10);
  return new Date(year, month, day, hour, minute, second);
};

// Map EPG categories to our app categories
const mapEPGCategory = (epgCategory: string): ProgramCategory => {
  if (!epgCategory) return 'Divertissement';
  const cat = epgCategory.toLowerCase();
  if (cat.includes('sport')) return 'Sport';
  if (cat.includes('film') || cat.includes('movie') || cat.includes('cinéma')) return 'Cinéma';
  if (cat.includes('série') || cat.includes('series')) return 'Séries';
  if (cat.includes('news') || cat.includes('info') || cat.includes('actualité')) return 'Actualités';
  if (cat.includes('enfant') || cat.includes('jeunesse') || cat.includes('kids')) return 'Enfants';
  if (cat.includes('documentaire') || cat.includes('documentary')) return 'Documentaires';
  return 'Divertissement';
};

const Index = () => {
  // State for UI controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProgramCategory | 'Tous'>('Tous');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // State for program dialog
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // State for data fetching
  const [channels, setChannels] = useState<Channel[]>([]);
  const [epgPrograms, setEpgPrograms] = useState<EpgProgramme[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const guide = await fetchTvGuide();
        setChannels(guide.tv.channel || []);
        setEpgPrograms(guide.tv.programme || []);
        toast.success(`${guide.tv.channel.length} chaînes et ${guide.tv.programme.length} programmes chargés !`);
      } catch (error) {
        toast.error('Erreur lors du chargement du guide TV.');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const availableChannels = useMemo(() => {
    return channels.map(ch => getText(ch['display-name'])).sort();
  }, [channels]);

  const categories: ProgramCategory[] = [
    'Sport',
    'Cinéma',
    'Séries',
    'Actualités',
    'Divertissement',
    'Documentaires',
    'Enfants',
  ];

  // Convert EPG programs to our Program format
  const programs: Program[] = useMemo(() => {
    const channelMap = new Map(channels.map(ch => [ch['@_id'], ch]));

    return epgPrograms.map((epgProgram, index) => {
      const channelId = epgProgram['@_channel'];
      const channel = channelMap.get(channelId);
      const now = new Date();
      const startDate = parseEpgDate(epgProgram['@_start']);
      const endDate = parseEpgDate(epgProgram['@_stop']);

      return {
        id: `${channelId}-${epgProgram['@_start']}-${index}`,
        title: getText(epgProgram.title),
        channel: channel ? getText(channel['display-name']) : 'Inconnu',
        category: mapEPGCategory(getText(epgProgram.desc)), // Using desc for category as it's often more descriptive
        date: startDate.toLocaleDateString('fr-FR'),
        startTime: startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        endTime: endDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        description: getText(epgProgram.desc),
        image: channel?.icon?.['@_src'] || '',
        isLive: now >= startDate && now <= endDate,
        duration: Math.round((endDate.getTime() - startDate.getTime()) / 60000),
      };
    });
  }, [epgPrograms, channels]);

  const filteredPrograms = useMemo(() => {
    return programs.filter((program) => {
      const matchesCategory =
        selectedCategory === 'Tous' || program.category === selectedCategory;
      
      const matchesChannel =
        selectedChannel === 'all' || program.channel === selectedChannel;
      
      const matchesSearch =
        searchQuery === '' ||
        program.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        program.channel.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesChannel && matchesSearch;
    });
  }, [programs, searchQuery, selectedCategory, selectedChannel]);

  const liveProgramsCount = useMemo(() => {
    return programs.filter(p => p.isLive).length;
  }, [programs]);

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
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="ml-4 text-lg text-muted-foreground">Chargement du guide des programmes...</p>
          </div>
        ) : (
          <>
            <Stats 
              totalChannels={availableChannels.length}
              totalPrograms={programs.length}
              livePrograms={liveProgramsCount}
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
