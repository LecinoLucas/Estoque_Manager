type BrandLogoProps = {
  className?: string;
  alt?: string;
};

export function BrandLogo({ className = "h-12 w-auto object-contain", alt = "Pioneira Colchões" }: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center justify-center ${className}`} aria-label={alt} role="img">
      <svg
        viewBox="0 0 160 100"
        className="h-full w-auto overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="brand-cloud-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8ED1FF" />
            <stop offset="50%" stopColor="#4CA5F5" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="brand-cloud-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#DDF3FF" />
            <stop offset="100%" stopColor="#93C5FD" />
          </linearGradient>
        </defs>

        <path
          d="M47 78c-16 0-29-12-29-27 0-14 11-26 25-27 3-13 16-22 30-22 17 0 31 13 32 30 12 1 22 11 22 24 0 13-11 22-24 22H47z"
          fill="url(#brand-cloud-fill)"
          stroke="url(#brand-cloud-stroke)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 6px 12px rgba(15, 23, 42, 0.28))" }}
        />

        <path
          d="M53 40c2-9 11-15 21-15 11 0 20 8 21 18"
          stroke="rgba(255,255,255,0.65)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </span>
  );
}
