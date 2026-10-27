
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
        console.error(error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
