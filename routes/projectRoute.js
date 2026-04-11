import express from "express"
import { addmemberToProject, createProject, updateProject } from "../controllers/projectControllers.js";



const projectRouter = express.Router()
projectRouter.post("/", createProject);
projectRouter.put("/", updateProject);
projectRouter.post("/:projectId/addmembers", addmemberToProject);

export default projectRouter