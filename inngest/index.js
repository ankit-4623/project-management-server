import { Inngest, step } from "inngest";
import { prisma } from "../config/db.js";
import { sendMailToUser } from "../config/nodemailer.js";

export const inngest = new Inngest({ id: "projectmng" });

const syncUserCreation = inngest.createFunction(
  { id: "Create-User-from-clerk", triggers: [{ event: "clerk/user.created" }] },
  async ({ event, step }) => {
    const { data } = event;
    await prisma.user.create({
      data: {
        id: data.id,
        email: data.email_addresses[0].email_address,
        image: data?.image_url,
        name: data?.first_name + " " + data?.last_name,
      },
    });
  },
);

const syncUserUpdation = inngest.createFunction(
  { id: "Update-User-from-clerk", triggers: [{ event: "clerk/user.updated" }] },
  async ({ event, step }) => {
    const { data } = event;
    await prisma.user.update({
      where: { id: data.id },
      data: {
        email: data.email_addresses[0].email_address,
        image: data?.image_url,
        name: data?.first_name + " " + data?.last_name,
      },
    });
  },
);

const syncUserDeletion = inngest.createFunction(
  { id: "delete-User-from-clerk", triggers: [{ event: "clerk/user.deleted" }] },
  async ({ event, step }) => {
    const { data } = event;
    await prisma.user.delete({
      where: { id: data.id },
    });
  },
);

const syncWorkspaceCreation = inngest.createFunction(
  {
    id: "workspace-create",
    triggers: { event: "clerk/organization.created" },
  },
  async ({ event, step }) => {
    const { data } = event;
    await prisma.workspace.create({
      data: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        ownerId: data.created_by,
        image_url: data.image_url,
      },
    });

    await prisma.workspaceMember.create({
      data: {
        userId: data.created_by,
        workspaceId: data.id,
        role: "ADMIN",
      },
    });
  },
);

const syncWorkspaceUpdatetion = inngest.createFunction(
  {
    id: "workspace-update",
    triggers: { event: "clerk/organization.updated" },
  },

  async ({ event, step }) => {
    const { data } = event;
    await prisma.workspace.update({
      where: { id: data.id },
      data: {
        name: data.name,
        slug: data.slug,
        image_url: data.image_url,
      },
    });
  },
);

const syncWorkspaceDeletion = inngest.createFunction(
  { id: "workspace-delete", triggers: { event: "clerk/organization.deleted" } },
  async ({ event, step }) => {
    const { data } = event;
    await prisma.workspace.delete({
      where: { id: data.id },
    });
  },
);

const syncWorkspaceMemberCreation = inngest.createFunction(
  {
    id: "created-WorkspaceMember-from-clerk",
    triggers: { event: "clerk/organizationMembership.created" },
  },
  async ({ event, step }) => {
    const { data } = event;

    await prisma.workspaceMember.create({
      data: {
        userId: data.public_user_data?.user_id,
        workspaceId: data.organization?.id,
        role: String(data.role_name).toUpperCase(),
      },
    });
  },
);

const sendTaskAssignmentEmail = inngest.createFunction(
  { id: "send-TaskAssignment-Email", triggers: { event: "app/task.assigned" } },
  async ({ event, step }) => {
    const { data } = event;
    const { taskId, origin } = data;
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignee: true, project: true },
    });
    await sendMailToUser({
      to: task.assignee.email,
      subject: `New Task Assigned: ${task.project.name}`,
      body: `Hi ${task.assignee.name},You have been assigned to a task - ${task.title} in the project - ${task.project.name}.
            <a href="${origin}">view task</a>
            `,
    });

    if (
      new Date(task.due_date).toLocaleDateString() !==
      new Date().toLocaleDateString()
    ) {
      await step.sleepUntil("wait-for-the-due-date", new Date(task.due_date));
      await step.run("check-if-task-still-completed", async () => {
        const task = await prisma.task.findUnique({
          where: { id: taskId },
          include: { assignee: true, project: true },
        });
        if (!task) {
          return;
        }
        if (task.status !== "DONE") {
          await step.run("send-task-reminder-mail", async () => {
            await sendEmail({
              to: task.assignee.email,
              subject: `Task Due Soon: ${task.project.name}`,
              body: `Hi ${task.assignee.name},Your task - ${task.title} is due on ${task.due_date.toLocaleDateString()}.
                      <a href="${origin}}">view task</a>
                      `,
            });
          });
        }
      });
    }
  },
);

export const functions = [
  syncUserCreation,
  syncUserUpdation,
  syncUserDeletion,
  syncWorkspaceCreation,
  syncWorkspaceUpdatetion,
  syncWorkspaceDeletion,
  syncWorkspaceMemberCreation,
  sendTaskAssignmentEmail
];
