import type { Metadata } from "next";
import { Archivo, Fraunces, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { getProfile, getSiteMedia } from "@/lib/repositories/content-repository.server";
import { DEFAULT_DOWNLOAD_LABEL } from "@/lib/media/media-form";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const siteUrl = "https://chandrapal.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Chandrapal — AI/ML Engineer · Data Science · Finance",
    template: "%s — Chandrapal",
  },
  description:
    "AI/ML Engineer and Data Science undergraduate building applied systems — from a verified 15.49x model-compression result to agentic AI architectures — while developing a parallel foundation in finance and FinTech.",
  openGraph: {
    title: "Chandrapal — AI/ML Engineer · Data Science · Finance",
    description:
      "AI/ML Engineer and Data Science undergraduate building applied systems — from a verified 15.49x model-compression result to agentic AI architectures — while developing a parallel foundation in finance and FinTech.",
    url: siteUrl,
    siteName: "Chandrapal",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chandrapal — AI/ML Engineer · Data Science · Finance",
    description:
      "AI/ML Engineer and Data Science undergraduate building applied systems — from a verified 15.49x model-compression result to agentic AI architectures — while developing a parallel foundation in finance and FinTech.",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read inside the component, not at module scope. Module-scope access runs
  // once at import time, which a repository that awaits a database cannot do —
  // moving it here is what makes this layout substitutable later.
  const { personal: profile } = await getProfile();

  // Resolved here rather than inside Nav: Nav is a Client Component, and the
  // media repository must never reach the browser bundle. Same reason the
  // profile's two links are passed down as strings.
  const media = await getSiteMedia();
  const resume =
    media.resume === null
      ? null
      : {
          url: media.resume.url,
          filename: media.resume.filename,
          label: media.resume.downloadLabel ?? DEFAULT_DOWNLOAD_LABEL,
        };

  // Only fields already present in personal (content/resume-data.ts, via the
  // profile repository) are included — no jobTitle, since the source data has
  // no discrete job-title field, only descriptive prose.
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    url: siteUrl,
    sameAs: [profile.github, profile.linkedin],
  };

  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${archivo.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground"
        >
          Skip to content
        </a>
        <Nav github={profile.github} linkedin={profile.linkedin} resume={resume} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
