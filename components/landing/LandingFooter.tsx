import Link from "next/link";

export function LandingFooter() {
    return (
        <footer className="bg-gray-50 border-t border-gray-200 px-6 py-12 text-sm text-gray-500">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between gap-8">
                <div>
                    <p className="font-bold text-gray-800 mb-2">Avec Toi</p>
                    <p className="max-w-xs">
                        Coordination de soins pour les aidants familiaux et les professionnels de santé.
                    </p>
                </div>
                <div className="flex flex-col gap-2">
                    <p className="font-semibold text-gray-700">Liens</p>
                    <Link href="#features" className="hover:text-gray-800 transition">Fonctionnalités</Link>
                    <Link href="#faq" className="hover:text-gray-800 transition">FAQ</Link>
                    <Link href="/login" className="hover:text-gray-800 transition">Connexion</Link>
                    <Link href="/register" className="hover:text-gray-800 transition">Créer un compte</Link>
                </div>
            </div>
            <div className="max-w-5xl mx-auto mt-8 pt-6 border-t border-gray-200 text-center text-xs">
                © {new Date().getFullYear()} Avec Toi. Tous droits réservés.
            </div>
        </footer>
    );
}