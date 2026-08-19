"use client";

import { Logo } from "../ui/Logo/Logo";
import Link from "next/link";
import LinkButton from "@/components/ui/LinkButton/LinkButton";
import { useState } from "react";

export function LandingHeader() {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 bg-white border-b border-border">
            <div className="px-6 py-3 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <Logo
                        src="/icons/icon-192.png"
                        alt="Avec Toi"
                        width={64}
                        height={64}
                        className="rounded-md mix-blend-multiply"
                    />
                    <span className="text-lg font-bold text-foreground">Avec Toi</span>
                </Link>

                {/* Nav desktop */}
                <nav className="hidden sm:flex items-center gap-6 text-sm text-muted">
                    <Link href="#" className="hover:text-foreground transition">Fonctionnalités</Link>
                    <Link href="#" className="hover:text-foreground transition">Sécurité</Link>
                    <Link href="/login" className="hover:text-foreground transition">Connexion</Link>
                    <LinkButton href="/register" className="btn-primary px-4 py-2 text-sm">
                        Creer un careGroup
                    </LinkButton>
                </nav>

                {/* Mobile : CTA visible + hamburger */}
                <div className="flex sm:hidden items-center gap-3">
                    <LinkButton href="/register">
                        Créer un careGroup
                    </LinkButton>  
                    <button
                        type="button"
                        aria-label="Menu"
                        aria-expanded={menuOpen}
                        aria-controls="mobile-menu"
                        onClick={() => setMenuOpen((v) => !v)}
                        className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-border transition"
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
                <nav 
                    className="sm:hidden border-t border-border px-6 py-4 flex flex-col gap-4 text-sm text-muted bg-white"
                    id="mobile-menu"
                >
                    <Link href="#" onClick={() => setMenuOpen(false)} className="hover:text-foreground transition">Fonctionnalités</Link>
                    <Link href="#" onClick={() => setMenuOpen(false)} className="hover:text-foreground transition">Sécurité</Link>
                    <Link href="/login" onClick={() => setMenuOpen(false)} className="hover:text-foreground transition">Connexion</Link>
                </nav>
            )}
        </header>
    );
}