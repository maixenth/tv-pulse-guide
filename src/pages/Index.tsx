import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { CategoryFilter } from '@/components/CategoryFilter';
import { ProgramCard } from '@/components/ProgramCard';
import { ProgramDialog } from '@/components/ProgramDialog';
import { mockPrograms } from '@/data/mockPrograms';
import { Program, ProgramCategory } from '@/types/program';

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProgramCategory | 'Tous'>('Tous');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
      const matchesSearch =
        searchQuery === '' ||
        program.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        program.channel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        program.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

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
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            {selectedCategory === 'Tous' ? 'Programmes en ce moment' : selectedCategory}
          </h2>
          <p className="text-muted-foreground">
            {filteredPrograms.length} programme{filteredPrograms.length > 1 ? 's' : ''} disponible
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
