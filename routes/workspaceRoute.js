import express from "express"
import { getAllWorkspaces } from "../controllers/workspaceControllers.js"
const workspaceRouter = express.Router()

workspaceRouter.get('/', getAllWorkspaces)

export default workspaceRouter;