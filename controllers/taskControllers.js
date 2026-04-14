import { prisma } from "../config/db.js";
import { inngest } from "../inngest/index.js";

//create task
export const addTask = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const {
      title,
      description,
      type,
      projectId,
      status,
      priority,
      assigneeId,
      due_date,
    } = req.body;
    const origin = req.get("origin");

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    } else if (project.team_lead !== userId) {
      return res
        .status(403)
        .json({ message: "You are not the team lead of this project" });
    } else if (
      assigneeId &&
      !project.members.find((mem) => mem.userId === assigneeId)
    ) {
      return res
        .status(403)
        .json({ message: "You are not a member of this project" });
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        title,
        description,
        priority,
        assigneeId,
        type,
        status,
        due_date: new Date(due_date),
      },
    });

    const taskwithAssignee = await prisma.task.findUnique({
      where: { id: task.id },
      include: {
        assignee: true,
      },
    });

    await inngest.send({
      name: "app/task.assigned",
      data: { taskId: task.id, origin },
    });

    res
      .status(201)
      .json({ message: "Task created successfully", task: taskwithAssignee });
  } catch (error) {
    res
      .status(500)
      .json({ message: "error in CreateTask", error: error.message });
  }
};

// update task
export const updateTask = async (req, res) => {
  try {
    const { userId } = await req.auth();

    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { project: true },
    });

    if (!task)         return res.status(404).json({ message: "Task not found" });
    if (!task.project) return res.status(404).json({ message: "Project not found" });

    if (task.project.team_lead !== userId) {
      return res.status(403).json({ message: "You are not the team lead of this project" });
    }

    const ALLOWED_FIELDS = ["title", "description", "priority", "assigneeId", "status"];
    const changes = {};

    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined && req.body[field] !== task[field]) {
        changes[field] = req.body[field];
      }
    }

    if (req.body.due_date !== undefined) {
      const incoming = new Date(req.body.due_date);
      if (isNaN(incoming.getTime())) {
        return res.status(400).json({ message: "Invalid due_date format" });
      }
      const existing = task.due_date ? new Date(task.due_date) : null;
      if (!existing || incoming.getTime() !== existing.getTime()) {
        changes.due_date = incoming;
      }
    }

    if (Object.keys(changes).length === 0) {
      return res.status(200).json({ message: "No changes detected", task });
    }

    const updatedTask = await prisma.task.update({
      where: { id: task.id },
      data: changes,
    });

    return res.status(200).json({ message: "Task updated successfully", task: updatedTask });

  } catch (error) {
    console.error("[updateTask]", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// delete task
export const deleteTask = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { tasksIds } = req.body;
    const task = await prisma.task.findMany({
      where: { id: { in: tasksIds } },
    });
    if (task.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }
    const project = await prisma.project.findUnique({
      where: { id: task[0].projectId },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    } else if (project.team_lead !== userId) {
      return res
        .status(403)
        .json({ message: "You are not the team lead of this project" });
    }
    await prisma.task.delete({
      where: { id: { in: tasksIds } },
    });
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "error in deleteTask",
      error: error.message,
    });
  }
};
