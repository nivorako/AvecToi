export const UPLOAD_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo

// Small margin for multipart boundaries and the other form fields
// (case/task id, description) around the file part.
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

export const UPLOAD_ALLOWED_MIME_TYPES = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
]);

export const UPLOAD_ACCEPT_ATTRIBUTE =
    ".pdf,.jpg,.jpeg,.png,.webp,.docx";

/**
 * Early rejection based on the Content-Length header, before the
 * multipart body is parsed into memory via req.formData().
 */
export function validateUploadRequestSize(req: Request): Response | null {
    const contentLength = Number(req.headers.get("content-length") ?? 0);

    if (contentLength > UPLOAD_MAX_SIZE_BYTES + MULTIPART_OVERHEAD_BYTES) {
        return Response.json(
            { message: "Fichier trop volumineux (10 Mo max)." },
            { status: 413 },
        );
    }

    return null;
}

/**
 * Validates the parsed File before its content is buffered.
 * Note: file.type comes from the client and can be forged — this is
 * a first line of defense, not a content-type guarantee.
 */
export function validateUploadFile(file: File): Response | null {
    if (!UPLOAD_ALLOWED_MIME_TYPES.has(file.type)) {
        return Response.json(
            { message: "Type de fichier non autorisé." },
            { status: 415 },
        );
    }

    if (file.size > UPLOAD_MAX_SIZE_BYTES) {
        return Response.json(
            { message: "Fichier trop volumineux (10 Mo max)." },
            { status: 413 },
        );
    }

    return null;
}
