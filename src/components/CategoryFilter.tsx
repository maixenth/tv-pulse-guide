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
    <div className="sticky top-[73px] z-40 backdrop-blur-xl bg-background/80 border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Badge
            variant={selectedCategory === 'Tous' ? 'default' : 'outline'}
            className={`cursor-pointer whitespace-nowrap px-4 py-2 transition-all ${
              selectedCategory === 'Tous' 
                ? 'bg-gradient-to-r from-primary to-secondary hover:opacity-90' 
                : 'hover:bg-card'
            }`}
            onClick={() => onCategoryChange('Tous')}
          >
            Tous
          </Badge>
          {categories.map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              className={`cursor-pointer whitespace-nowrap px-4 py-2 transition-all ${
                selectedCategory === category
                  ? `bg-gradient-to-r ${categoryColors[category]} hover:opacity-90`
                  : 'hover:bg-card'
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
