'use client';

interface ZodiacIconProps {
  index: number; // 0-11 (12 zodiac signs)
  size?: number;
  className?: string;
  isActive?: boolean;
}

export function ZodiacIcon({ index, size = 40, className = '', isActive = false }: ZodiacIconProps) {
  // Calculate sprite position (4 columns x 3 rows)
  const col = index % 4;
  const row = Math.floor(index / 4);

  // Image dimensions (actual icon size in sprite)
  const iconWidth = 200; // approximate width of each icon in sprite
  const iconHeight = 200; // approximate height of each icon in sprite

  return (
    <div
      className={`${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundImage: 'url(/zodiac-icons.png)',
        backgroundSize: `${iconWidth * 4}px ${iconHeight * 3}px`,
        backgroundPosition: `-${col * iconWidth}px -${row * iconHeight}px`,
        backgroundRepeat: 'no-repeat',
        opacity: isActive ? 1 : 0.3,
        transition: 'opacity 0.3s, filter 0.3s',
        filter: isActive ? 'none' : 'grayscale(0.5)',
      }}
    />
  );
}

// Zodiac sign mapping (you can customize this based on your needs)
export const zodiacSigns = [
  'Aries',      // 0
  'Taurus',     // 1
  'Gemini',     // 2
  'Cancer',     // 3
  'Cancer',     // 4 (duplicate in sprite)
  'Leo',        // 5
  'Virgo',      // 6
  'Libra',      // 7
  'Libra',      // 8 (duplicate in sprite)
  'Scorpio',    // 9
  'Sagittarius',// 10
  'Capricorn',  // 11
];
