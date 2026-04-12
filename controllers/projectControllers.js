import { prisma } from "../config/db.js";

// create project
export const createProject = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const {
      name,
      description,
      priority,
      status,
      start_date,
      end_date,
      workspaceId,
      team_members,
      team_lead,
      progress,
    } = req.body;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: { include: { user: true } },
      },
    });
    
    const start = new Date(start_date);
    const end = new Date(end_date);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }
    
    if (start >= end) {
      return res.status(400).json({
        error: "Start date must be before end date",
      });
    }

    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }
    if (
      !workspace.members.some(
        (mem) => mem.userId === userId && mem.role === "ADMIN",
      )
    ) {
      return res.status(403).json({
        error:
          "You do not have permission to create a project in this workspace",
      });
    }

    const teamLead = await prisma.user.findUnique({
      where: { email: team_lead },
      select: { id: true },
    });

    const project = await prisma.project.create({
      data: {
        name,
        description,
        priority,
        status,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        workspaceId,
        team_lead: teamLead.id,
        progress,
      },
    });

    if (team_members?.length > 0 && workspace?.members?.length > 0) {
      const emailSet = new Set(team_members);
      const membersToAdd = [];
    
      for (const mem of workspace.members) {
        if (!mem?.user?.email || !mem?.user?.id) continue;
    
        if (emailSet.has(mem.user.email)) {
          membersToAdd.push(mem.user.id);
        }
      }
    
      const uniqueMembers = [...new Set(membersToAdd)];
    
      if (uniqueMembers.length > 0) {
        await prisma.projectMember.createMany({
          data: uniqueMembers.map((userId) => ({
            userId,
            projectId: project.id,
          })),
          skipDuplicates: true,
        });
      }
    }

    const projecwithmem = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        members: { include: { user: true } },
        tasks: {
          include: { assignee: true, comments: { include: { user: true } } },
        },
        owner: true,
      },
    });
    res.status(201).json({
      project: projecwithmem,
      message: "project created successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "error is coming from project creation",
      error: "Failed to create project",
    });
  }
};

// update project
export const updateProject = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const {
      projectId,
      name,
      description,
      priority,
      status,
      start_date,
      end_date,
      workspaceId,
      team_members,
      team_lead,
      progress,
    } = req.body;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: { include: { user: true } },
      },
    });

    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }
    if (
      !workspace.members.some(
        (member) => member.id === userId && member.role === "ADMIN",
      )
    ) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      } else if (project.team_lead !== userId) {
        return res
          .status(403)
          .json({ error: "You do not have permission to update this project" });
      }
    }

    const project = await prisma.project.update({
      where:{id:projectId},
      data: {
        name,
        description,
        priority,
        status,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        workspaceId,
        progress,
      },
    });
    res.json({ project, message: "Project updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update project" });
  }
};

// add member to the project
export const addmemberToProject = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { projectId } = req.params;
    const { email } = req.body;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: { include: { user: true } },
      },
    });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (project.team_lead !== userId) {
      return res
        .status(403)
        .json({
          error: "You do not have permission to add members to this project",
        });
    }
    const existingUser =  project.members.find((mem) => mem.user.email === email)
    if (existingUser) {
      return res.status(400).json({ error: "Member already exists" });
    }
    const user = await prisma.user.findUnique(
      {where:{email}}
    )
    
    if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
  
    await prisma.projectMember.create({
      data: {
        userId: user.id,
        projectId
      }
    })
    
    res.json({ member, message: "Member added successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to add member", error });
  }
};


// delete project