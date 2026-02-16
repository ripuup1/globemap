import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Exo_2, Inter } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Exo 2 - Modern futuristic font for UI elements
const exo2 = Exo_2({
  variable: "--font-exo2",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

// Inter - Professional news typography
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

// Mobile viewport configuration
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f0f9ff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

// SEO and metadata for Google indexing
export const metadata: Metadata = {
  title: "Vox Terra | Global News Visualization",
  description: "Experience world news like never before. Vox Terra is a premium 3D interactive globe showing real-time global events, breaking news, conflicts, and stories from every corner of Earth.",
  keywords: [
    "global news", 
    "world news", 
    "news map", 
    "interactive globe", 
    "breaking news",
    "world events",
    "news visualization",
    "real-time news",
    "international news",
    "3D news map",
    "vox terra",
    "globe news"
  ],
  authors: [{ name: "Tyler" }],
  creator: "Tyler",
  publisher: "Vox Terra",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Vox Terra',
    title: 'Vox Terra | Global News Visualization',
    description: 'Experience world news like never before with our interactive 3D globe showing real-time global events.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vox Terra | Global News Visualization',
    description: 'Experience world news like never before with our interactive 3D globe.',
  },
  category: 'news',
  classification: 'News & Media',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Mobile-specific meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        
        {/* Structured data for Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Vox Terra",
              "description": "Interactive 3D globe showing real-time global news and events",
              "url": "https://vox-terra.vercel.app",
              "applicationCategory": "NewsApplication",
              "operatingSystem": "Any",
              "browserRequirements": "Requires JavaScript",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              }
            })
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${exo2.variable} ${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
