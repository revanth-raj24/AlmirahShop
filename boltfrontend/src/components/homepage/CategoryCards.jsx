import { useNavigate } from 'react-router-dom';
import { Shirt, Sparkles, Watch, Footprints, Snowflake } from 'lucide-react';

/**
 * CategoryCards Component
 * Displays category navigation cards with icons
 * Categories: Mens, Womens, Accessories, Footwear, Seasonal
 */
const categories = [
  {
    id: 'men',
    name: "Men's",
    icon: Shirt,
    link: '/?category=men',
    description: 'Premium menswear',
    gradient: 'from-blue-50 to-blue-100',
    hoverGradient: 'hover:from-blue-100 hover:to-blue-200'
  },
  {
    id: 'women',
    name: "Women's",
    icon: Sparkles,
    link: '/?category=women',
    description: 'Elegant womenswear',
    gradient: 'from-pink-50 to-pink-100',
    hoverGradient: 'hover:from-pink-100 hover:to-pink-200'
  },
  {
    id: 'accessories',
    name: 'Accessories',
    icon: Watch,
    link: '/?category=accessories',
    description: 'Style essentials',
    gradient: 'from-purple-50 to-purple-100',
    hoverGradient: 'hover:from-purple-100 hover:to-purple-200'
  },
  {
    id: 'footwear',
    name: 'Footwear',
    icon: Footprints,
    link: '/?category=footwear',
    description: 'Step in style',
    gradient: 'from-amber-50 to-amber-100',
    hoverGradient: 'hover:from-amber-100 hover:to-amber-200'
  },
  {
    id: 'seasonal',
    name: 'Seasonal',
    icon: Snowflake,
    link: '/?category=seasonal',
    description: 'Seasonal collections',
    gradient: 'from-cyan-50 to-cyan-100',
    hoverGradient: 'hover:from-cyan-100 hover:to-cyan-200'
  }
];

export default function CategoryCards() {
  const navigate = useNavigate();

  const handleCategoryClick = (link) => {
    navigate(link);
  };

  return (
    <section 
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
      aria-label="Product categories"
    >
      <div className="text-center mb-12">
        <h2 className="font-serif text-4xl md:text-5xl text-neutral-900 mb-4">
          Shop by Category
        </h2>
        <p className="text-neutral-600 text-lg max-w-2xl mx-auto">
          Explore our curated collections designed for every style and occasion
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        {categories.map((category) => {
          const IconComponent = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.link)}
              className={`group relative overflow-hidden rounded-lg bg-gradient-to-br ${category.gradient} ${category.hoverGradient} p-6 md:p-8 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl`}
              aria-label={`Browse ${category.name} category`}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-white/50 rounded-full group-hover:bg-white/80 transition-colors duration-300">
                  <IconComponent className="w-8 h-8 md:w-10 md:h-10 text-neutral-900" />
                </div>
                <div>
                  <h3 className="font-serif text-lg md:text-xl text-neutral-900 font-semibold mb-1">
                    {category.name}
                  </h3>
                  <p className="text-sm text-neutral-700 font-light">
                    {category.description}
                  </p>
                </div>
              </div>
              
              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300"></div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

