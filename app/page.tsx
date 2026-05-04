import { redirect } from "next/navigation";

export default function Home() {
    // Root route: send users to the application area.
    redirect("/app");
}
