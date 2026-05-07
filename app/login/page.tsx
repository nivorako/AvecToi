import LoginForm from "./LoginForm";

import Link from "next/link";

export default function LoginPage({
    searchParams,
}: {
    searchParams?: { next?: string };
}) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6">
            <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h1 className="text-xl font-semibold">Connexion</h1>
                <div className="mt-6">
                    <LoginForm nextUrl={searchParams?.next} />
                </div>

                <div className="mt-4 text-sm text-muted">
                    Pas encore de compte ?{" "}
                    <Link
                        href={
                            searchParams?.next
                                ? `/register?next=${encodeURIComponent(searchParams.next)}`
                                : "/register"
                        }
                        className="font-medium"
                    >
                        Créer un compte
                    </Link>
                </div>
            </div>
        </div>
    );
}
