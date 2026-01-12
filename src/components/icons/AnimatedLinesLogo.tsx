interface AnimatedLinesLogoProps {
  className?: string;
  direction?: 'inward' | 'outward'; // 'inward' = до центру, 'outward' = від центру
}

export default function AnimatedLinesLogo({ className = "h-8 w-8", direction = 'inward' }: AnimatedLinesLogoProps) {
  const animationName = direction === 'inward' ? 'shrinkToCenter' : 'expandFromCenter';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      className={className}
    >
      <style>
        {`
          @keyframes shrinkToCenter {
            0% {
              transform: scale(1);
              opacity: 0;
              stroke-width: 3;
            }
            10% {
              opacity: 1;
            }
            85% {
              opacity: 1;
              stroke-width: 3;
            }
            95% {
              transform: scale(0.05);
              opacity: 1;
              stroke-width: 12;
            }
            100% {
              transform: scale(0);
              opacity: 0;
              stroke-width: 12;
            }
          }

          @keyframes expandFromCenter {
            0% {
              transform: scale(0);
              opacity: 0;
            }
            10% {
              opacity: 1;
            }
            90% {
              opacity: 1;
            }
            100% {
              transform: scale(1);
              opacity: 0;
            }
          }

          .circle1 {
            animation: ${animationName} 4s linear infinite;
            animation-delay: -3.2s;
            transform-origin: center;
          }
          .circle2 {
            animation: ${animationName} 4s linear infinite;
            animation-delay: -2.4s;
            transform-origin: center;
          }
          .circle3 {
            animation: ${animationName} 4s linear infinite;
            animation-delay: -1.6s;
            transform-origin: center;
          }
          .circle4 {
            animation: ${animationName} 4s linear infinite;
            animation-delay: -0.8s;
            transform-origin: center;
          }
          .circle5 {
            animation: ${animationName} 4s linear infinite;
            animation-delay: 0s;
            transform-origin: center;
          }
        `}
      </style>

      <circle
        className="circle1"
        cx="50"
        cy="50"
        r="46"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
      />
      <circle
        className="circle2"
        cx="50"
        cy="50"
        r="46"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
      />
      <circle
        className="circle3"
        cx="50"
        cy="50"
        r="46"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
      />
      <circle
        className="circle4"
        cx="50"
        cy="50"
        r="46"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
      />
      <circle
        className="circle5"
        cx="50"
        cy="50"
        r="46"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
      />
    </svg>
  );
}
