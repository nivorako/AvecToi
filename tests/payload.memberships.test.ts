import { afterAll, afterEach, beforeAll, describe, expect, it } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
    type PayloadTestClient,
    startPayload,
    stopPayload,
    cleanCollections,
    createUser,
    createCareGroupAsAdmin,
    addMembership,
    createInvitation,
} from "./helpers/payload";

describe("Payload — Memberships & Invitations", () => {
    let mongod: MongoMemoryServer;
    let payload: PayloadTestClient;

    beforeAll(async () => {
        ({ mongod, payload } = await startPayload());
    });

    afterAll(async () => {
        await stopPayload({ mongod, payload });
    });

    afterEach(async () => {
        await cleanCollections(payload);
    });

    it("denies creating memberships unless acting user is admin of that caregroup", async () => {
        const admin = await createUser(payload, {
            email: "admin-acl@example.com",
            password: "password",
            name: "Admin",
        });

        const family = await createUser(payload, {
            email: "family-acl@example.com",
            password: "password",
            name: "Family",
        });

        const pro = await createUser(payload, {
            email: "pro-acl@example.com",
            password: "password",
            name: "Pro",
        });

        const careGroup = await createCareGroupAsAdmin(payload, {
            admin,
            name: "CG",
        });

        await addMembership(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            userID: family.id,
            role: "family",
        });

        await expect(
            addMembership(payload, {
                actingUser: family,
                careGroupID: careGroup.id,
                userID: pro.id,
                role: "professional",
            }),
        ).rejects.toBeTruthy();
    });

    it("lets admin create an invitation and lets invited email read it", async () => {
        const admin = await createUser(payload, {
            email: "admin-invite@example.com",
            password: "password",
            name: "Admin",
        });

        const invited = await createUser(payload, {
            email: "invited@example.com",
            password: "password",
            name: "Invited",
        });

        const other = await createUser(payload, {
            email: "other@example.com",
            password: "password",
            name: "Other",
        });

        const careGroup = await createCareGroupAsAdmin(payload, {
            admin,
            name: "CG",
        });

        const invitation = await createInvitation(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            email: invited.email,
            role: "family",
        });

        const invitedRead = await payload.find({
            collection: "invitations",
            depth: 0,
            limit: 10,
            pagination: false,
            user: invited,
            overrideAccess: false,
            where: { id: { equals: invitation.id } },
        });

        expect(invitedRead.docs).toHaveLength(1);

        const otherRead = await payload.find({
            collection: "invitations",
            depth: 0,
            limit: 10,
            pagination: false,
            user: other,
            overrideAccess: false,
            where: { id: { equals: invitation.id } },
        });

        expect(otherRead.docs).toHaveLength(0);
    });

    it("lets family create invitations without read or cancel access", async () => {
        const admin = await createUser(payload, {
            email: "admin-family-invite@example.com",
            password: "password",
            name: "Admin",
        });
        const family = await createUser(payload, {
            email: "family-create-invite@example.com",
            password: "password",
            name: "Family",
        });
        const professional = await createUser(payload, {
            email: "professional-create-invite@example.com",
            password: "password",
            name: "Professional",
        });
        const patient = await createUser(payload, {
            email: "patient-create-invite@example.com",
            password: "password",
            name: "Patient",
        });
        const careGroup = await createCareGroupAsAdmin(payload, {
            admin,
            name: "CG",
        });

        await addMembership(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            userID: family.id,
            role: "family",
        });
        await addMembership(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            userID: professional.id,
            role: "professional",
        });
        await addMembership(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            userID: patient.id,
            role: "patient",
        });

        const invitation = await createInvitation(payload, {
            actingUser: family,
            careGroupID: careGroup.id,
            email: "family-invited@example.com",
            role: "family",
        });

        const familyRead = await payload.find({
            collection: "invitations",
            depth: 0,
            pagination: false,
            user: family,
            overrideAccess: false,
            where: { id: { equals: invitation.id } },
        });
        expect(familyRead.docs).toHaveLength(0);

        await expect(
            payload.delete({
                collection: "invitations",
                id: invitation.id,
                user: family,
                overrideAccess: false,
                depth: 0,
            }),
        ).rejects.toBeTruthy();

        for (const actingUser of [professional, patient]) {
            await expect(
                createInvitation(payload, {
                    actingUser,
                    careGroupID: careGroup.id,
                    email: `${actingUser.name.toLowerCase()}-invited@example.com`,
                    role: "family",
                }),
            ).rejects.toBeTruthy();
        }

        // Une invitation de rôle patient est réservée à un admin.
        await expect(
            createInvitation(payload, {
                actingUser: family,
                careGroupID: careGroup.id,
                email: "patient-invited@example.com",
                role: "patient",
            }),
        ).rejects.toBeTruthy();
    });

    it("denies deleting invitations for everyone; an admin can only revoke them", async () => {
        const admin = await createUser(payload, {
            email: "admin-invite-delete@example.com",
            password: "password",
            name: "Admin",
        });

        const family = await createUser(payload, {
            email: "family-invite-delete@example.com",
            password: "password",
            name: "Family",
        });

        const careGroup = await createCareGroupAsAdmin(payload, {
            admin,
            name: "CG",
        });

        await addMembership(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            userID: family.id,
            role: "family",
        });

        const invitation = await createInvitation(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            email: "someone@example.com",
            role: "family",
        });

        // On révoque, on n'efface pas : la suppression est refusée pour tous.
        for (const actingUser of [family, admin]) {
            await expect(
                payload.delete({
                    collection: "invitations",
                    id: invitation.id,
                    user: actingUser,
                    overrideAccess: false,
                    depth: 0,
                }),
            ).rejects.toBeTruthy();
        }

        const revoked = await payload.update({
            collection: "invitations",
            id: invitation.id,
            data: { status: "revoked" },
            user: admin,
            overrideAccess: false,
            depth: 0,
        });

        expect(revoked.status).toBe("revoked");

        const readBack = await payload.find({
            collection: "invitations",
            depth: 0,
            limit: 10,
            pagination: false,
            user: admin,
            overrideAccess: false,
            where: { id: { equals: invitation.id } },
        });

        expect(readBack.docs).toHaveLength(1);
        expect(readBack.docs[0].status).toBe("revoked");
    });
});
