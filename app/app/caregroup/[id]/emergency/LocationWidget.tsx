"use client";

import { useEffect, useState } from "react";

type LocationState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "granted"; lat: number; lng: number; updatedAt: Date }
    | { status: "denied" }
    | { status: "error"; message: string };

export default function LocationWidget() {
    const [location, setLocation] = useState<LocationState>({ status: "idle" });

    function requestLocation() {
        setLocation({ status: "loading" });
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocation({
                    status: "granted",
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    updatedAt: new Date(),
                });
            },
            () => {
                setLocation({ status: "denied" });
            },
            { enableHighAccuracy: true, timeout: 10000 },
        );
    }

    useEffect(() => {
        requestLocation();
    }, []);

    const mapsUrl =
        location.status === "granted"
            ? `https://www.google.com/maps?q=${location.lat},${location.lng}`
            : null;

    return (
        <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <span className="text-xl">📍</span>
                <span className="text-sm font-semibold">Position actuelle</span>
            </div>

            {location.status === "idle" || location.status === "loading" ? (
                <div className="text-sm text-muted">Localisation en cours...</div>
            ) : location.status === "denied" ? (
                <div className="flex flex-col gap-2">
                    <div className="text-sm text-muted">Accès refusé. Active la localisation dans les paramètres.</div>
                    <button
                        type="button"
                        onClick={requestLocation}
                        className="self-start rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
                    >
                        Réessayer
                    </button>
                </div>
            ) : location.status === "error" ? (
                <div className="text-sm text-red-500">{location.message}</div>
            ) : (
                <>
                    <div className="rounded-xl overflow-hidden border border-border">
                        <a
                            href={mapsUrl!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-32 w-full items-center justify-center bg-muted/20 hover:bg-muted/30 transition-colors"
                        >
                            <div className="flex flex-col items-center gap-2 text-primary">
                                <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                                    <circle cx="12" cy="9" r="2.5" />
                                </svg>
                                <span className="text-xs font-medium">Ouvrir dans Google Maps</span>
                            </div>
                        </a>
                    </div>

                    <div className="text-xs text-muted">
                        Adresse approximative : {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                    </div>

                    <div className="text-xs text-muted">
                        Dernière mise à jour : {location.updatedAt.toLocaleTimeString("fr-FR")}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-xs text-green-600 font-medium">Téléphone actif / localisation partagée</span>
                    </div>
                </>
            )}
        </div>
    );
}