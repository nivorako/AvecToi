import LoginForm from "./LoginForm";

export default function LoginPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6">
            <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h1 className="text-xl font-semibold">Connexion</h1>
                <div className="mt-6">
                    <LoginForm />
                </div>
            </div>
        </div>
    );
}
