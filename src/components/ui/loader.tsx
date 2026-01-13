import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24'
};

export function Loader({ size = 'md', className = '' }: LoaderProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100" 
      fill="none" 
      className={`${sizeClasses[size]} text-primary ${className}`}
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

          .circle1 {
            animation: shrinkToCenter 4s linear infinite;
            animation-delay: -3.2s;
            transform-origin: center;
          }
          .circle2 {
            animation: shrinkToCenter 4s linear infinite;
            animation-delay: -2.4s;
            transform-origin: center;
          }
          .circle3 {
            animation: shrinkToCenter 4s linear infinite;
            animation-delay: -1.6s;
            transform-origin: center;
          }
          .circle4 {
            animation: shrinkToCenter 4s linear infinite;
            animation-delay: -0.8s;
            transform-origin: center;
          }
          .circle5 {
            animation: shrinkToCenter 4s linear infinite;
            animation-delay: 0s;
            transform-origin: center;
          }
        `}
      </style>
      <circle className="circle1" cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="3" fill="none" />
      <circle className="circle2" cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="3" fill="none" />
      <circle className="circle3" cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="3" fill="none" />
      <circle className="circle4" cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="3" fill="none" />
      <circle className="circle5" cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="3" fill="none" />
    </svg>
  );
}

// Loading page component
export function LoadingPage({ message = 'Завантаження...' }: { message?: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader size="lg" className="mx-auto mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </main>
  );
}

// Inline loader component
export function LoadingInline({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <Loader size="md" className="mx-auto mb-2" />
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}
