import { prisma } from "../config/db.js"
// get all workspaces
export const getAllWorkspaces = async(req,res) => {
  try {
    const { userId } = await req.auth()
    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId
          }
        }
      },
      include: {
        members:{include:{user:true}},
        projects: {
          include: {
            tasks: {
              include: {
                assignee: true,
                comments: {
                  include:{user:true}
                }
              }
            }
          },
        },
        owner:true
        
      },
      
    })
    res.json({workspaces})
  } catch(error) {
    res.status(500).json({ error: error.message });
  }
}


//// add member to workspace
