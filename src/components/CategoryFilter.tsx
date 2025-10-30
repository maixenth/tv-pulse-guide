import { ProgramCategory, categoryColors } from '@/types/program';
import { Badge } from '@/components/ui/badge';

interface CategoryFilterProps {
  categories: ProgramCategory[];
  selectedCategory: ProgramCategory | 'Tous';
  onCategoryChange: (category: ProgramCategory | 'Tous') => void;
}

export const CategoryFilter = ({ 
  categories, 
  selectedCategory, 
  onCategoryChange 
}: CategoryFilterProps) => {
  return (
    <div className="sticky top-[73px] z-40 backdrop-blur-xl bg-background/90 border-b border-border/50 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Badge
            variant={selectedCategory === 'Tous' ? 'default' : 'outline'}
            className={`cursor-pointer whitespace-nowrap px-5 py-2.5 transition-all font-semibold text-sm ${
              selectedCategory === 'Tous' 
                ? 'bg-gradient-to-r from-primary via-accent to-secondary shadow-lg shadow-primary/30 hover:shadow-primary/50 scale-105' 
                : 'hover:bg-card hover:border-primary/50 hover:scale-105'
            }`}
            onClick={() => onCategoryChange('Tous')}
          >
            Tous
          </Badge>
          {categories.map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              className={`cursor-pointer whitespace-nowrap px-5 py-2.5 transition-all font-semibold text-sm ${
                selectedCategory === category
                  ? `bg-gradient-to-r ${categoryColors[category]} shadow-lg hover:shadow-xl scale-105`
                  : 'hover:bg-card hover:border-primary/50 hover:scale-105'
              }`}
              onClick={() => onCategoryChange(category)}
            >
              {category}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};
