interface LifeDesignerLogoProps {
  className?: string;
  showText?: boolean;
}

export default function LifeDesignerLogo({ className = "h-16 w-16", showText = false }: LifeDesignerLogoProps) {
  return (
    <div className="flex items-center gap-3">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        fill="none"
        className={className}
      >
        <style>
          {`
            @keyframes pulse1 { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
            @keyframes pulse2 { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
            @keyframes pulse3 { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
            @keyframes pulse4 { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
            @keyframes pulse5 { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

            .circle1 { animation: pulse1 3s ease-in-out infinite; animation-delay: 0s; }
            .circle2 { animation: pulse2 3s ease-in-out infinite; animation-delay: 0.2s; }
            .circle3 { animation: pulse3 3s ease-in-out infinite; animation-delay: 0.4s; }
            .circle4 { animation: pulse4 3s ease-in-out infinite; animation-delay: 0.6s; }
            .circle5 { animation: pulse5 3s ease-in-out infinite; animation-delay: 0.8s; }
          `}
        </style>

        <circle
          className="circle1"
          cx="50"
          cy="50"
          r="8"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
        <circle
          className="circle2"
          cx="50"
          cy="50"
          r="18"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
        <circle
          className="circle3"
          cx="50"
          cy="50"
          r="28"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
        <circle
          className="circle4"
          cx="50"
          cy="50"
          r="38"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
        <circle
          className="circle5"
          cx="50"
          cy="50"
          r="46"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
      </svg>
      {showText && (
        <span className="text-3xl font-bold text-black dark:text-white">
          Life Designer
        </span>
      )}
    </div>
  );
}
