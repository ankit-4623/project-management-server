import express from 'express'
import { addTask, deleteTask, updateTask } from '../controllers/taskControllers.js';
const taskRouter = express.Router()


taskRouter.post("/", addTask);
taskRouter.put("/:id", updateTask);
taskRouter.delete("/", deleteTask);

export default taskRouter