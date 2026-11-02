
import { getPayloadInstance } from "@/lib/payloadConfig";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(
     _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const payload = await getPayloadInstance();
        const { id } = await params;
        
        // initialises Payload côté serveur

        const token = (await cookies()).get("avectoi-token")?.value;
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
         const dossier = await payload.findByID({
            collection: "cases",
            id,
            depth: 1,
            user,
            overrideAccess: false,
        });
 
        return NextResponse.json(dossier);
    } catch (error) {
        
        const status =
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        typeof error.status === "number"
            ? error.status
            : 500;

        if (status === 404) {
            return NextResponse.json(
                { error: "Not Found" },
                { status: 404 },
            );
        }
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }, 
        );
    }
};


export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const payload = await getPayloadInstance();
        const { id } = await params;

        // Vérification de l'authentification
        const token = (await cookies()).get("avectoi-token")?.value;

        if (!token) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const headers = new Headers();
        headers.set("Authorization", `JWT ${token}`);

        const { user } = await payload.auth({ headers });

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        // Récupération des données demandées
        const data = await request.json();

        // Mise à jour avec les contrôles d'accès Payload
        const dossier = await payload.update({
            collection: "cases",
            id,
            data,
            user,
            overrideAccess: false,
        });

        return NextResponse.json(dossier);

    } catch (error) {
        const status =
            typeof error === "object" &&
            error !== null &&
            "status" in error &&
            typeof error.status === "number"
                ? error.status
                : 500;

        if (status === 404) {
            return NextResponse.json(
                { error: "Not Found" },
                { status: 404 },
            );
        }

        if (status === 403) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 },
            );
        }

        console.error("PATCH /api/cases error:", error);

        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}

