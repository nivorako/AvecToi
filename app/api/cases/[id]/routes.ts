import { getPayload } from "payload";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import config from "@/payload.config";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const payload = await getPayload({ config });

        //initialises Payload côté serveur
        const cookieStore = await cookies();
        const token = cookieStore.get("payload-token")?.value;
        if (!token) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }
        //vérifies l’utilisateur via cookies
        const headers = new Headers();
        headers.set("Authorization", `JWT ${token}`);

        const { user } = await payload.auth({ headers });
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }
        //charges le case via Payload
        //renvoies la réponse JSON
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
