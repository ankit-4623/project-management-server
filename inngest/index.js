import { Inngest, step } from "inngest";
import { prisma } from "../config/db.js";

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
    const {data} = event
    await prisma.user.update({
      where: { id: data.id },
      data: {
        email:data.email_addresses[0].email_address,
        image: data?.image_url,
        name: data?.first_name + " " + data?.last_name,
      },
    });
  },
);

const syncUserDeletion = inngest.createFunction(
  { id: "delete-User-from-clerk", triggers: [{ event: "clerk/user.deleted" }] },
  async ({ event, step }) => {
     const {data} = event
    await prisma.user.delete({
      where:{id:data.id}
    })
  }
)


export const functions = [syncUserCreation];
