import { requireUser } from "@/lib/requireUser";

export default async function TaskPage() {
    await requireUser();

    return <div />;
}
