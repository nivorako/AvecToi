import LoginForm from "./LoginForm";

import Link from "next/link";

export default async function LoginPage({
    searchParams,
}: {
    searchParams?: Promise<{ next?: string }>;
}) {
    const resolvedSearchParams = await searchParams;

    return (
        <div className="flex w-full flex-col items-center justify-center bg-zinc-50 px-6 py-6">
            <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-card">
                <h1 className="text-xl font-semibold">Connexion</h1>
                <div className="mt-6">
                    <LoginForm nextUrl={resolvedSearchParams?.next} />
                </div>

                <div className="mt-4 text-sm text-muted">
                    Pas encore de compte ?{" "}
                    <Link
                        href={
                            resolvedSearchParams?.next
                                ? `/register?next=${encodeURIComponent(resolvedSearchParams.next)}`
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
