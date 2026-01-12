interface TargetIconProps {
  className?: string;
}

export default function TargetIcon({ className = "h-6 w-6" }: TargetIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* 5 концентричних кіл */}
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}
