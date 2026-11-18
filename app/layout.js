import './globals.css';

export const metadata = {
  title: "COSAR ONE — L'œil qui veille",
  description: 'Back office COSAR GROUP — Exigence. Présence. Confiance.',
  robots: 'noindex, nofollow',
  icons: {
    icon: '/shield-sidebar.png',
    apple: '/shield.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
