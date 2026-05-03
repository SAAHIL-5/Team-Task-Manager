import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";
import sendEmail from "../configs/nodemailer.js";

// Create Inngest client
export const inngest = new Inngest({ id: "team-task-manager" });

/**
 * 🔹 USER FUNCTIONS
 */

// Create User
const syncUserCreation = inngest.createFunction(
  {
    id: "sync-user-created",
    triggers: [{ event: "clerk/user.created" }],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.user.upsert({
      where: { id: data.id },
      update: {},
      create: {
        id: data.id,
        email: data?.email_addresses?.[0]?.email_address || "",
        name: `${data?.first_name || ""} ${data?.last_name || ""}`.trim(),
        image: data?.image_url || "",
      },
    });
  }
);

// Delete User
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

// Update User
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

/**
 * 🔹 WORKSPACE (ORGANIZATION) FUNCTIONS
 */

// Create Workspace
const syncWorkspaceCreation = inngest.createFunction(
  {
    id: "sync-workspace-created",
    triggers: [{ event: "clerk/organization.created" }],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.workspace.upsert({
      where: { id: data.id },
      update: {},
      create: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        ownerId: data.created_by,
        image_url: data.image_url || "",
      },
    });

    // Add creator as ADMIN
    await prisma.workspaceMember.upsert({
      where: {
        userId_workspaceId: {
          userId: data.created_by,
          workspaceId: data.id,
        },
      },
      update: {},
      create: {
        userId: data.created_by,
        workspaceId: data.id,
        role: "ADMIN",
      },
    });
  }
);

// Update Workspace
const syncWorkspaceUpdation = inngest.createFunction(
  {
    id: "sync-workspace-updated",
    triggers: [{ event: "clerk/organization.updated" }],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.workspace.updateMany({
      where: { id: data.id },
      data: {
        name: data.name,
        slug: data.slug,
        image_url: data.image_url || "",
      },
    });
  }
);

// Delete Workspace
const syncWorkspaceDeletion = inngest.createFunction(
  {
    id: "delete-workspace",
    triggers: [{ event: "clerk/organization.deleted" }],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.workspace.deleteMany({
      where: { id: data.id },
    });
  }
);

// Add Workspace Member
const syncWorkspaceMemberCreation = inngest.createFunction(
  {
    id: "sync-workspace-member",
    triggers: [{ event: "clerk/organizationInvitation.accepted" }],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.workspaceMember.upsert({
      where: {
        userId_workspaceId: {
          userId: data.user_id,
          workspaceId: data.organization_id,
        },
      },
      update: {},
      create: {
        userId: data.user_id,
        workspaceId: data.organization_id,
        role: String(data.role_name || "member").toUpperCase(),
      },
    });
  }
);

// Inngest Function to Send Email on Task Creation
const sendTaskAssignmentEmail = inngest.createFunction(
  {
    id: "send-task-assignment-mail",
    triggers: [{ event: "app/task.assigned" }],
  },
  async ({ event, step }) => {
    const { taskId, origin } = event.data;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignee: true, project: true },
    });

    if (!task) return; 

    await sendEmail({
      to: task.assignee.email,
      subject: `New Task Assignment in ${task.project.name}`,
      body: `<div style="max-width: 600px;">
          <h2>Hi ${task.assignee.name}, 👋</h2>

          <p style="font-size: 16px;">You've been assigned a new task :</p>
          <p style="font-size: 18px; font-weight: bold; color: #007bff;
          margin: 8px 0;">${task.title}</p>

          <div style="border: 1px solid #ddd; padding: 12px 16px;
          border-radius: 6px; margin-bottom: 30px;">
              <p style="margin: 6px 0;"><strong>Description:</strong> ${task.description}</p>
              <p style="margin: 6px 0;"><strong>Due Date:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
          </div>

          <a href="${origin}" style="background-color: #007bff; padding:
          12px 24px; border-radius: 5px; color: #fff; font-weight: 600;
          font-size: 16px; text-decoration: none;">
              View Task
          </a>

          <p style="margin-top: 20px; font-size: 14px; color: #6c757d;">
              Please make sure to review and complete it before the due
              date.
          </p>
          </div>`,
    });

    if (
      new Date(task.due_date).toLocaleDateString() !== new Date().toDateString()
    ) {
      await step.sleepUntil(
        "wait-for-the-due-date",
        new Date(task.due_date)
      );

      await step.run("check-if-task-is-completed", async () => {
        const task = await prisma.task.findUnique({
          where: { id: taskId },
          include: { assignee: true, project: true },
        });

        if (!task) return;

        if (task.status !== "DONE") {
          await step.run("send-task-reminder-mail", async () => {
            await sendEmail({
              to: task.assignee.email,
              subject: `Reminder for ${task.project.name}`,
              body: `<div style="max-width: 600px;">
          <h2>Hi ${task.assignee.name}, 👋</h2>

          <p style="font-size: 16px;">You have a task due in ${task.project.name}:</p>
          <p style="font-size: 18px; font-weight: bold; color: #007bff;
          margin: 8px 0;">${task.title}</p>

          <div style="border: 1px solid #ddd; padding: 12px 16px;
          border-radius: 6px; margin-bottom: 30px;">
              <p style="margin: 6px 0;"><strong>Description:</strong> ${task.description}</p>
              <p style="margin: 6px 0;"><strong>Due Date:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
          </div>

          <a href="${origin}" style="background-color: #007bff; padding:
          12px 24px; border-radius: 5px; color: #fff; font-weight: 600;
          font-size: 16px; text-decoration: none;">
              View Task
          </a>

          <p style="margin-top: 20px; font-size: 14px; color: #6c757d;">
              Please make sure to review and complete it before the due
              date.
          </p>
          </div>`,
            });
          });
        }
      });
    }
  }
);

/**
 * 🔹 EXPORT ALL FUNCTIONS
 */
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  syncWorkspaceCreation,
  syncWorkspaceUpdation,
  syncWorkspaceDeletion,
  syncWorkspaceMemberCreation,
  sendTaskAssignmentEmail
];