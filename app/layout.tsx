import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@payloadcms/next/css";
import "../styles/globals.css";

import type { ReactNode } from "react";

import { RootLayout as PayloadRootLayout } from "@payloadcms/next/layouts";

import { payloadConfigPromise } from "@/lib/payloadConfig";
import { payloadServerFunction } from "@/lib/payloadServerFunction";
import { importMap } from "./(payload)/admin/importMap.js";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    metadataBase: new URL("https://avec-toi-hazel.vercel.app/"),
    title: {
        default: "Avec Toi",
        template: "%s | Avec Toi",
    },
    description:
        "Avec Toi simplifie le suivi et la coordination des parcours de soins entre les proches et les professionnels de santé.",
    keywords: ["suivi de soins", "coordination", "aidants", "proches", "santé","Alzheimer"],
    authors: [{ name: "Avec Toi" }],
    robots: {
        index: true,
        follow: true,
    },
    openGraph: {
        type: "website",
        locale: "fr_FR",
        url: "/",
        siteName: "Avec Toi",
        title: "Avec Toi",
        description:
        "Avec Toi simplifie le suivi et la coordination des parcours de soins entre les proches et les professionnels de santé.",
    },
    twitter: {
        card: "summary_large_image",
        title: "Avec Toi",
        description:
        "Avec Toi simplifie le suivi et la coordination des parcours de soins entre les proches et les professionnels de santé.",
    },
    alternates: {
        canonical: "/",
    },
    manifest: "/manifest.webmanifest",
    colorScheme: "light",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: ReactNode;
}>) {
    // App root layout:
    // - global CSS + fonts
    // - wraps the app with Payload's Next.js RootLayout (admin + server functions wiring)
    return (
        <PayloadRootLayout
            config={payloadConfigPromise}
            htmlProps={{
                lang: "fr",
                className: `${geistSans.variable} ${geistMono.variable} h-full antialiased`,
                suppressHydrationWarning: true,
            }}
            importMap={importMap}
            serverFunction={payloadServerFunction}
        >
            {children}
        </PayloadRootLayout>
    );
}
