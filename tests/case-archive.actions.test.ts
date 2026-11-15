import { beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";

const requireUserMock = jest.fn<() => Promise<{ id: string }>>();
const payloadRESTMock = jest.fn<
    (path: string, init?: RequestInit) => Promise<unknown>
>();
const revalidatePathMock = jest.fn<(path: string) => void>();
const redirectMock = jest.fn<(path: string) => void>();

let archiveCase: typeof import("@/app/app/caregroup/[id]/case/action").archiveCase;
let restoreCase: typeof import("@/app/app/caregroup/[id]/case/action").restoreCase;

beforeAll(async () => {
    jest.unstable_mockModule("@/lib/requireUser", () => ({
        requireUser: requireUserMock,
    }));
    jest.unstable_mockModule("@/lib/payloadRest", () => ({
        payloadREST: payloadRESTMock,
    }));
    jest.unstable_mockModule("next/cache", () => ({
        revalidatePath: revalidatePathMock,
    }));
    jest.unstable_mockModule("next/navigation", () => ({
        redirect: redirectMock,
    }));

    ({ archiveCase, restoreCase } = await import(
        "@/app/app/caregroup/[id]/case/action"
    ));
});

beforeEach(() => {
    jest.clearAllMocks();
    requireUserMock.mockResolvedValue({ id: "admin-1" });
    payloadRESTMock.mockImplementation(async (path) => {
        if (path.startsWith("/api/memberships?")) {
            return { docs: [{ role: "admin" }] };
        }
        return {};
    });
});

function caseFormData() {
    const formData = new FormData();
    formData.set("case", "case-1");
    formData.set("careGroup", "group-1");
    return formData;
}

describe("case archive server actions", () => {
    test("an administrator archives a case and refreshes the active list", async () => {
        await archiveCase(caseFormData());

        expect(payloadRESTMock).toHaveBeenNthCalledWith(
            2,
            "/api/cases/case-1",
            {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ status: "archived" }),
            },
        );
        expect(revalidatePathMock).toHaveBeenCalledWith(
            "/app/caregroup/group-1/cases",
        );
        expect(redirectMock).toHaveBeenCalledWith(
            "/app/caregroup/group-1/cases",
        );
    });

    test("an administrator restores a case and refreshes the active list", async () => {
        await restoreCase(caseFormData());

        expect(payloadRESTMock).toHaveBeenNthCalledWith(
            2,
            "/api/cases/case-1",
            {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ status: "active" }),
            },
        );
        expect(revalidatePathMock).toHaveBeenCalledWith(
            "/app/caregroup/group-1/cases",
        );
        expect(redirectMock).toHaveBeenCalledWith(
            "/app/caregroup/group-1/cases",
        );
    });

    test("a family member cannot restore a case", async () => {
        payloadRESTMock.mockResolvedValueOnce({ docs: [{ role: "family" }] });

        await restoreCase(caseFormData());

        expect(payloadRESTMock).toHaveBeenCalledTimes(1);
        expect(revalidatePathMock).not.toHaveBeenCalled();
        expect(redirectMock).not.toHaveBeenCalled();
    });
});
