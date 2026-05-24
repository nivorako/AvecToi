import { requireUser } from "@/lib/requireUser";
import CareGroupBanner from "@/components/caregroup/CareGroupBanner";
import { payloadREST, getCurrentUser } from "@/lib/payloadRest";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

type Task = {
    id: string;
    title: string;
    careGroup?: string | { id: string };
    description: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    case?: string | { id: string; title: string };
    assignedTo?: string | { id: string; title: string };
    responsable?: string;
};

export default async function TaskPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    await requireUser();
    // Récupérer tasks pour obtenir le careGroupId
    const tasks = await payloadREST<{ docs: Task[] }>(
        `/api/tasks?where[id][equals]=${encodeURIComponent(id)}&limit=1&depth=2&populate=case`,
    );
    const task = tasks.docs[0];
    console.log("task.careGroup", task?.careGroup);
    // Extraire le careGroupId (peut être une string ou un objet avec id)
    const careGroupId =
        typeof task?.careGroup === "string"
            ? task.careGroup
            : task?.careGroup?.id;
    if (!careGroupId) {
        return <div>Task not found or not associated with a caregroup</div>;
    }

    // récupérer les informations de la task
    const caseID = typeof task?.case === "string" ? task.case : task?.case?.id;
    const caseData = caseID
        ? await payloadREST<{ id: string; title: string }>(
              `/api/cases/${caseID}`,
          )
        : null;
    const caseTitle = caseData?.title || "Unknown case";
    console.log("user :", await getCurrentUser());
    return (
        <>
            {careGroupId ? <CareGroupBanner careGroupId={careGroupId} /> : null}

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <p>Dossier1 {caseTitle}</p>
                <h1>{task?.title}</h1>
                <Card>
                    <CardHeader title="Informations" />
                    <CardContent>
                        <p>responsable</p>
                        <p>Priorité</p>
                        <p>statut + changement de statut</p>
                        <p>date de création</p>
                        <p>date limite</p>
                        <p>documents liés</p>
                        <p>Evenement liés (rendez-vous, rappels, etc.)</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader title="Description" />
                    <CardContent>
                        <p>description détaillée</p>
                        <p>Bouton modifier description</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader title="Sous-taches" />
                    <CardContent>
                        <p>liste des sous-taches</p>
                        <p>Statut de chaque étape</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader title="Documents" />
                    <CardContent>
                        <p>
                            Documents attachés ( photo + PDF + justificatif +
                            ...)
                        </p>
                        <p>+ bouton pour ajouter effacer document</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader title="Commentaires" />
                    <CardContent>
                        <p>liste des commentaires</p>
                        <p>Auteur + date + contenu</p>
                        <p>+ bouton pour ajouter un commentaire</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader title="Actions rapides" />
                    <CardContent>
                        <p>fil de commentaires</p>
                        <p>Auteur + date + contenu</p>
                        <p>+ bouton pour ajouter un commentaire</p>
                        <p>Upload rapide ( photo ou doc)</p>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
