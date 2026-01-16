import './globals.css';
import { Analytics } from '@vercel/analytics/react';

export const metadata = {
  title: 'United Black World - The Journal',
  description: 'A Revolutionary Digital Archive for hosting and sharing revolutionary resources',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
