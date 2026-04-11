import express from "express"
import { addWorkspaceMember, getAllWorkspaces } from "../controllers/workspaceControllers.js"
const workspaceRouter = express.Router()

workspaceRouter.get('/', getAllWorkspaces)
workspaceRouter.post('/add-member',addWorkspaceMember)

export default workspaceRouter;