import { beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";

const requireUserMock = jest.fn<() => Promise<{ id: string }>>();
const payloadRESTMock = jest.fn<(path: string) => Promise<unknown>>();
const notFoundMock = jest.fn<() => never>();

let TaskPage: typeof import("@/app/app/caregroup/[id]/case/[caseId]/task/[taskId]/page").default;

beforeAll(async () => {
    jest.unstable_mockModule("@/lib/requireUser", () => ({
        requireUser: requireUserMock,
    }));
    jest.unstable_mockModule("@/lib/payloadRest", () => ({
        payloadREST: payloadRESTMock,
    }));
    jest.unstable_mockModule("next/navigation", () => ({
        notFound: notFoundMock,
    }));
    jest.unstable_mockModule("@/components/task/TaskDescriptionEditor", () => ({
        default: () => null,
    }));
    jest.unstable_mockModule("@/components/ui/Card", () => ({
        Card: () => null,
        CardContent: () => null,
        CardHeader: () => null,
    }));
    jest.unstable_mockModule("@/components/task/TaskAttachmentsUploader", () => ({
        TaskAttachmentsUploader: () => null,
    }));
    jest.unstable_mockModule("@/components/task/AddTaskAttachmentPanel", () => ({
        default: () => null,
    }));
    jest.unstable_mockModule("@/components/task/TaskAttachmentRow", () => ({
        TaskAttachmentRow: () => null,
    }));
    jest.unstable_mockModule("@/components/task/TaskMetadataBar", () => ({
        default: () => null,
    }));

    ({ default: TaskPage } = await import(
        "@/app/app/caregroup/[id]/case/[caseId]/task/[taskId]/page"
    ));
});

beforeEach(() => {
    jest.clearAllMocks();
    requireUserMock.mockResolvedValue({ id: "user-1" });
    notFoundMock.mockImplementation(() => {
        throw new Error("NEXT_NOT_FOUND");
    });
});

function findAttachmentRowProps(node: unknown): Record<string, unknown> | undefined {
    if (Array.isArray(node)) {
        for (const child of node) {
            const found = findAttachmentRowProps(child);
            if (found) return found;
        }
        return undefined;
    }

    if (!node || typeof node !== "object") return undefined;

    const props = (node as { props?: Record<string, unknown> }).props;
    if (!props) return undefined;
    if ("attachmentID" in props && "canManage" in props) return props;

    return findAttachmentRowProps(props.children);
}

describe("task page", () => {
    test("returns not found when the task does not belong to the case from the URL", async () => {
        payloadRESTMock.mockResolvedValueOnce({
            docs: [
                {
                    id: "task-1",
                    title: "Task",
                    description: "",
                    status: "todo",
                    createdAt: "2026-01-01T00:00:00.000Z",
                    updatedAt: "2026-01-01T00:00:00.000Z",
                    case: "actual-case",
                    careGroup: "group-1",
                },
            ],
        });

        await expect(
            TaskPage({
                params: Promise.resolve({
                    id: "group-1",
                    caseId: "url-case",
                    taskId: "task-1",
                }),
            }),
        ).rejects.toThrow("NEXT_NOT_FOUND");

        expect(notFoundMock).toHaveBeenCalledTimes(1);
        expect(payloadRESTMock).toHaveBeenCalledTimes(1);
        expect(payloadRESTMock).toHaveBeenCalledWith(
            "/api/tasks?where[id][equals]=task-1&limit=1&depth=2&populate=case",
        );
    });

    test("lets a professional manage attachments on an active medical task", async () => {
        payloadRESTMock
            .mockResolvedValueOnce({
                docs: [
                    {
                        id: "task-1",
                        title: "Task",
                        description: "",
                        status: "todo",
                        createdAt: "2026-01-01T00:00:00.000Z",
                        updatedAt: "2026-01-01T00:00:00.000Z",
                        case: "case-1",
                        careGroup: "group-1",
                    },
                ],
            })
            .mockResolvedValueOnce({
                docs: [
                    {
                        id: "attachment-1",
                        url: "/document.txt",
                        filename: "document.txt",
                        mimeType: "text/plain",
                        filesize: 8,
                        createdAt: "2026-01-01T00:00:00.000Z",
                        updatedAt: "2026-01-01T00:00:00.000Z",
                    },
                ],
            })
            .mockResolvedValueOnce({
                id: "case-1",
                title: "Medical case",
                type: "medical",
                status: "active",
                careGroup: "group-1",
            })
            .mockResolvedValueOnce({
                docs: [{ id: "membership-1", role: "professional" }],
            });

        const result = await TaskPage({
            params: Promise.resolve({
                id: "group-1",
                caseId: "case-1",
                taskId: "task-1",
            }),
        });

        expect(findAttachmentRowProps(result)).toMatchObject({
            attachmentID: "attachment-1",
            canManage: true,
        });
    });
});
