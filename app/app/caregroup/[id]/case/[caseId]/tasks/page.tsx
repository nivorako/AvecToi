import { requireUser } from "@/lib/requireUser";
import { payloadREST } from "@/lib/payloadRest";
import { revalidatePath } from "next/cache";

import TaskItemRow from "@/components/task/TaskItemRow";
import AddCaseTaskPanel from "@/components/case/AddCaseTaskPanel";

type CaseDoc = {
    id: string;
    type?: string;
    title?: string;
    careGroup?: string | { id: string };
}

type Membership = {
  id: string;
  role?: "owner" | "family" | "professional" | "patient";
};

type Task = {
    id: string;
    title: string;
    status: "todo" | "in_progress" | "done";
    urgency: "low" | "high";
    caseType: "medical" | "custom";
    responsable?: string;
    dueDate?: string;
    careGroup?: string | { id: string };
    patient?: string | { id: string };
    case?: string | { id: string };
    assignedTo?: string | { id: string; name?: string };
    subtasks?: Array<{
        id?: string;
        title: string;
        description?: string;
        dueDate?: string;
        assignedTo?: string | { id: string };
        completed: boolean;
    }>;
};

export default async function TasksPage({params}: {params: Promise <{id: string; caseId: string}>}) {

    const user = await requireUser();

    const {id, caseId} = await params;

    // Faire un GET /api/cases/${caseId}?depth=0
    const caseDoc = await payloadREST<CaseDoc>(
        `/api/cases/${encodeURIComponent(caseId)}?depth=0`,
    );

    // récupérer caregroupID
    const caregroupID = typeof caseDoc?.careGroup === "string"
        ? caseDoc.careGroup
        : caseDoc?.careGroup?.id;

    // récupérer le type du dossier
    const isMedical = caseDoc?.type === "medical";

    // récupérer membership
    const membership = caregroupID ? await payloadREST<{docs : Membership[] }>(
        `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(caregroupID)}&limit=1&depth=0`,
    ).then((r) => r.docs[0]) : undefined;

    // calculer les permissions
    const canCreateTask = membership?.role === "owner" || membership?.role === "family" || membership?.role === "professional";

    //récupérer tasks
    const tasks = await payloadREST<{ docs: Task[] }>(
        `/api/tasks?where[case][equals]=${encodeURIComponent(caseId)}&limit=50&depth=1`,
    );

    // séparer les listes : toDoTasks donetasks et inProgressTasks
    const toDoTasks = tasks.docs.filter((task) => task.status !== "done" && task.status !== "in_progress");
    const doneTasks = tasks.docs.filter((task) => task.status === "done");
    const inProgressTasks = tasks.docs.filter((task) => task.status === "in_progress");

    // trier la liste par date d'échéance
    toDoTasks.sort((a, b) => new Date(a.dueDate || "").getTime() - new Date(b.dueDate || "").getTime());
    doneTasks.sort((a, b) => new Date(a.dueDate || "").getTime() - new Date(b.dueDate || "").getTime());
    inProgressTasks.sort((a, b) => new Date(a.dueDate || "").getTime() - new Date(b.dueDate || "").getTime());
    
    // récupérer membres du caregroup
    const careGroupMembers = caregroupID
        ? await payloadREST<{ docs: Array<{ user?: string | { id: string; name?: string } }> }>(
            `/api/memberships?where[careGroup][equals]=${encodeURIComponent(caregroupID)}&limit=100&depth=1`,
        )
        : { docs: [] };

    const users = careGroupMembers.docs
        .map((m) => m.user)
        .filter((u): u is { id: string; name?: string } => u !== null && typeof u === "object");

    // Définir createTask(formData: FormData)
    async function createTask(formData: FormData) {
        "use server";

        // relit et valide les champs
        const title = formData.get("title")?.toString().trim();
        const assignedTo = formData.get("assignedTo")?.toString() || undefined;
        const dueDateRaw = formData.get("dueDate")?.toString();
        const formCaseId = formData.get("case")?.toString();
        const formCareGroupId = formData.get("careGroup")?.toString();
        const formCaseType = formData.get("caseType")?.toString();

        // Vérifie canCreateTask
        if (!canCreateTask) {
            throw new Error("Vous n'avez pas la permission de créer une tâche");
        }

        if (formCaseId !== caseId) {
            throw new Error("Le caseId ne correspond pas");
        }
        
        if (formCareGroupId !== caregroupID) {
            throw new Error("Le careGroup ne correspond pas");
        }
        
        if (formCaseType !== (isMedical ? "medical" : "custom")) {
            throw new Error("Le type de dossier ne correspond pas");
        }

        // 4. Conversion du champ date
        const dueDate = dueDateRaw ? new Date(dueDateRaw).toISOString() : undefined;

        // 5. Création via Payload REST
        await payloadREST("/api/tasks", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                title,
                case: caseId,
                careGroup: caregroupID,
                caseType: isMedical ? "medical" : "custom",
                status: "todo",
                urgency: "low",
                assignedTo: assignedTo || undefined,
                dueDate,
            }),
        });

        // 6. Revalider la page pour rafraîchir les données
        revalidatePath(`/app/caregroup/${caregroupID}/case/${caseId}/tasks`);

    }

    return (
        <div  className="container mx-auto py-8 flex flex-col justify-between gap-10">
            
            {/* Résumé de la page */}
            <div className="rounded-2xl bg-primary/10 p-4 flex flex-col gap-3 mb-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-primary">Dossier : {caseDoc.title ?? "Dossier"}</h1>
                </div>
                <div className="flex flex-col flex-wrap gap-2 text-sm">
                    {tasks.docs.filter(t => t.urgency === "high" && t.status !== "done").length > 0 && (
                        <span className="rounded-full  px-3 py-1 text-red-600">
                            <strong>{tasks.docs.filter(t => t.urgency === "high" && t.status !== "done").length}</strong> urgentes
                        </span>
                    )}
                    
                    <span className="rounded-full px-3 py-1 text-blue-700">
                        <strong>{inProgressTasks.length}</strong> en cours
                    </span>

                    <span className="rounded-full px-3 py-1">
                        <strong>{toDoTasks.length}</strong> à faire
                    </span>
                    
                </div>
            </div>

            {/* liste des taches */}
            <div className="flex flex-col gap-6">
                <h2 className="text-2xl text-center font-semibold">Liste des tâches</h2>

                {/* taches a faire */}
                 <div>
                    <h2 className="text-xl font-semibold">A faire</h2>
                    <div>
                    {toDoTasks.length === 0 ? (
                        <p>Aucune tâche à faire</p>
                    ) : (
                        toDoTasks.map((task) => (
                            <TaskItemRow 
                                key={task.id}
                                taskID={task.id}
                                title={task.title}
                                careGroupId={id}
                                caseId={caseId}
                                urgency={task.urgency}
                                dueDate={task.dueDate}
                                assignedTo={typeof task.assignedTo === "object" 
                                    ? (task.assignedTo?.name || task.assignedTo?.id) 
                                    : task.assignedTo}
                            />
                                
                        ))
                    )}
                    </div>
                 </div>

                    {/* taches en cours */}
                <div>
                    <h2 className="text-xl font-semibold">En cours</h2>
                    <div>
                        {inProgressTasks.length === 0 ? (
                            <p>Aucune tâche en cours</p>
                        ) : (
                            inProgressTasks.map((task) => (
                                <TaskItemRow
                                    key={task.id}
                                    taskID={task.id}
                                    title={task.title}
                                    careGroupId={id}
                                    caseId={caseId}
                                    urgency={task.urgency}
                                    dueDate={task.dueDate}
                                    assignedTo={typeof task.assignedTo === "object" 
                                        ? (task.assignedTo?.name || task.assignedTo?.id) 
                                        : task.assignedTo}
                                />
                            ))
                        )}
                    </div>
                </div>

                 {/* taches términées */}
                 <div>
                    <h2 className="text-xl font-semibold">Terminées</h2>
                    <div>
                        {doneTasks.length === 0 ? (
                            <p>Aucune tâche terminée</p>
                        ) : (
                            doneTasks.map((task) => (
                                <TaskItemRow 
                                    key={task.id}
                                    taskID={task.id}
                                    title={task.title}
                                    careGroupId={id}
                                    caseId={caseId}
                                    urgency={task.urgency}
                                    dueDate={task.dueDate}
                                    assignedTo={typeof task.assignedTo === "object" 
                                        ? (task.assignedTo?.name || task.assignedTo?.id) 
                                        : task.assignedTo}
                                />
                                    
                                
                            )) 
                        )}
                    </div>
                 </div>
            </div>

            {canCreateTask && (
                <AddCaseTaskPanel
                    careGroupId={caregroupID ?? ""}
                    caseId={caseId}
                    caseType={isMedical ? "medical" : "custom"}
                    action={createTask}
                    users={users}
                />
            )}
        </div>
    );
}
