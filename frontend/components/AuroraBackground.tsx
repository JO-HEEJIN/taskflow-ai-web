'use client';

interface AuroraBackgroundProps {
  children?: React.ReactNode;
  blur?: boolean;
  overlayOpacity?: number; // 0 to 1
}

export function AuroraBackground({
  children,
  blur = true,
  overlayOpacity = 0.6
}: AuroraBackgroundProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Aurora Background Image */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/aurora-bg.jpg)',
            filter: blur ? 'blur(8px)' : 'none',
            transform: 'scale(1.1)', // Prevent blur edges
          }}
        />

        {/* Semi-transparent black overlay */}
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
