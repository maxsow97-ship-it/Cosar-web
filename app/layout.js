import './globals.css';
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: 'COSAR ONE — Back Office',
  description: 'Tableau de bord administrateur COSAR GROUP',
  robots: 'noindex, nofollow',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="bg-slate-50 text-slate-900 antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
