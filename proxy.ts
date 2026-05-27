import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
    const url = request.nextUrl.clone();
    const pathname = request.nextUrl.pathname;

    // Redirect old /app/caregroups/* paths to /app/caregroup/*
    if (pathname.startsWith("/app/caregroups/")) {
        const newPathname = pathname.replace(
            "/app/caregroups/",
            "/app/caregroup/",
        );
        // Also redirect /history to /tasks
        const finalPathname = newPathname.replace(/\/history$/, "/tasks");
        url.pathname = finalPathname;
        return NextResponse.redirect(url);
    }

    // Redirect /app/caregroup/[id]/history to /app/caregroup/[id]/tasks
    if (pathname.match(/^\/app\/caregroup\/[^/]+\/history$/)) {
        const newPathname = pathname.replace(/\/history$/, "/tasks");
        url.pathname = newPathname;
        return NextResponse.redirect(url);
    }

    // Redirect old /app/cases/* paths to /app/caregroup/[id]/case/[caseId]
    // This is more complex as we need to fetch the case to get the caregroup ID
    // For now, we'll redirect to the home page with a note
    if (pathname.startsWith("/app/cases/")) {
        url.pathname = "/app";
        return NextResponse.redirect(url);
    }

    // Redirect old /app/tasks/* paths to /app/caregroup/[id]/case/[caseId]/task/[taskId]
    // This is also complex, redirect to home for now
    if (pathname.startsWith("/app/tasks/")) {
        url.pathname = "/app";
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/app/:path*"],
};
