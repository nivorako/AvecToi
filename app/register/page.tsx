import RegisterForm from "./RegisterForm";

export default async function RegisterPage({
    searchParams,
}: {
    searchParams?: Promise<{ next?: string; email?: string }>;
}) {
    const sp = searchParams ? await searchParams : undefined;

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6">
            <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h1 className="text-xl font-semibold">Créer un compte</h1>
                <div className="mt-6">
                    <RegisterForm nextUrl={sp?.next} initialEmail={sp?.email} />
                </div>
            </div>
        </div>
    );
}
