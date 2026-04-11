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
      assignedId,
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
      assignedId &&
      !project.members.find((mem) => mem.userId === assignedId)
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
        assignedId,
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
    });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    const project = await prisma.project.findUnique({
      where: { id: task.projectId },
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

    const updatedTask = await prisma.task.update({
      where: { id: task.id },
      data: {
        title: req.body.title,
        description: req.body.description,
        priority: req.body.priority,
        assignedId: req.body.assignedId,
        status: req.body.status,
        due_date: new Date(req.body.due_date),
      },
    });

    res
      .status(200)
      .json({ message: "Task updated successfully", task: updatedTask });
  } catch (error) {
    res.status(500).json({
      message: "error in updateTask",
      error: error.message,
    });
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
