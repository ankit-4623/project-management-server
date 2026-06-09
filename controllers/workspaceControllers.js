import { clerkClient, getAuth } from "@clerk/express";
import { prisma } from "../config/db.js";
// get all workspaces
export const getAllWorkspaces = async (req, res) => {
  try {
    const { userId } = await getAuth(req);
     const user = await clerkClient.users.getUser(userId)
     console.log(user)
    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: { include: { user: true } },
        projects: {
          include: {
            members:{include:{user:true}},
            tasks: {
              include: {
                assignee: true,
                comments: {
                  include: { user: true },
                },
              },
            },
          },
        },
        owner: true,
      },
    });
    res.json({ workspaces });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "error is coming from getAllworkspace",
        error: error.message,
      });
  }
};

//// add member to workspace
export const addWorkspaceMember = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { email, role, workspaceId, message } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (!workspaceId || !role) {
      res.status(400).json({ error: "Workspace ID and role are required" });
      return;
    }

    if (!["ADMIN", "MEMBER"].includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    const workspace = await prisma.workspace.findUnique(
      {
        where: { id: workspaceId },
        include:{members:true}
      }
    )

    if (!workspace) {
      res.status(404).json({ error: "Workspace not found" });
           return;
    }

    if (!workspace.members.find((mem) => mem.userId === userId && mem.role === "ADMIN")) {
       return res.status(403).json({ error: "Only admins can add members" });
    }
    
    if (workspace.members.find((mem) => mem.userId === user.id)) {
      res
            .status(400)
            .json({ error: "User is already a member of this workspace" });
          return;
    }
    
    const member = await prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId,
        message,
        role
      }
    })
     res.status(201).json({member, message: "Member added successfully" });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "error is coming from addWorkspaceMember",
        error: error.message,
      });
  }
};
