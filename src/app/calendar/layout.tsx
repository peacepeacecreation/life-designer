import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Календар | Life Designer',
  description: 'Плануйте ваше життя з календарем подій',
};

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
