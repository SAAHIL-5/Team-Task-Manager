import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";

// Create a client
export const inngest = new Inngest({ id: "team-task-manager" });

/**
 * 🔹 Create User (safe)
 */
const syncUserCreation = inngest.createFunction(
  {
    id: "sync-user-created",
    triggers: [{ event: "clerk/user.created" }],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.user.upsert({
      where: { id: data.id },
      update: {}, // no update on create event
      create: {
        id: data.id,
        email: data?.email_addresses?.[0]?.email_address || "",
        name: `${data?.first_name || ""} ${data?.last_name || ""}`.trim(),
        image: data?.image_url || "",
      },
    });
  }
);

/**
 * 🔹 Delete User (safe)
 */
const syncUserDeletion = inngest.createFunction(
  {
    id: "delete-user",
    triggers: [{ event: "clerk/user.deleted" }],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.user.deleteMany({
      where: { id: data.id },
    });
  }
);

/**
 * 🔹 Update User (safe)
 */
const syncUserUpdation = inngest.createFunction(
  {
    id: "sync-user-updated",
    triggers: [{ event: "clerk/user.updated" }],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.user.upsert({
      where: { id: data.id },
      update: {
        email: data?.email_addresses?.[0]?.email_address || "",
        name: `${data?.first_name || ""} ${data?.last_name || ""}`.trim(),
        image: data?.image_url || "",
      },
      create: {
        id: data.id,
        email: data?.email_addresses?.[0]?.email_address || "",
        name: `${data?.first_name || ""} ${data?.last_name || ""}`.trim(),
        image: data?.image_url || "",
      },
    });
  }
);

// Export functions
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
];