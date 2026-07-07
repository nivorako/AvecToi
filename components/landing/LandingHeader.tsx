"use client";

import Image from "next/image";
import Link from "next/link";
import LinkButton from "@/components/ui/LinkButton";
import { useState } from "react";

export function LandingHeader() {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
            <div className="px-6 py-3 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <Image
                        src="/icons/icon-192.png"
                        alt="Avec Toi"
                        width={32}
                        height={32}
                        className="rounded-md"
                    />
                    <span className="text-lg font-bold text-foreground">Avec Toi</span>
                </Link>

                {/* Nav desktop */}
                <nav className="hidden sm:flex items-center gap-6 text-sm text-muted">
                    <Link href="#features" className="hover:text-foreground transition">Fonctionnalités</Link>
                    <Link href="#faq" className="hover:text-foreground transition">FAQ</Link>
                    <Link href="/login" className="hover:text-foreground transition">Connexion</Link>
                    <LinkButton href="/register" className="btn-primary px-4 py-2 text-sm">
                        Commencer
                    </LinkButton>
                </nav>

                {/* Mobile : CTA visible + hamburger */}
                <div className="flex sm:hidden items-center gap-3">
                    <LinkButton href="/register">
                        Commencer
                    </LinkButton>  
                    <button
                        type="button"
                        aria-label="Menu"
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen((v) => !v)}
                        className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 transition"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
                            {menuOpen ? (
                                <>
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </>
                            ) : (
                                <>
                                    <line x1="4" y1="7" x2="20" y2="7" />
                                    <line x1="4" y1="12" x2="20" y2="12" />
                                    <line x1="4" y1="17" x2="20" y2="17" />
                                </>
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            {/* Menu mobile déroulant */}
            {menuOpen && (
                <nav className="sm:hidden border-t border-gray-100 px-6 py-4 flex flex-col gap-4 text-sm text-muted bg-white">
                    <Link href="#features" onClick={() => setMenuOpen(false)} className="hover:text-foreground transition">Fonctionnalités</Link>
                    <Link href="#faq" onClick={() => setMenuOpen(false)} className="hover:text-foreground transition">FAQ</Link>
                    <Link href="/login" onClick={() => setMenuOpen(false)} className="hover:text-foreground transition">Connexion</Link>
                </nav>
            )}
        </header>
    );
}