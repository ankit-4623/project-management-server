import express from "express"
import { configDotenv } from "dotenv"
import { serve } from "inngest/express"
import { clerkMiddleware } from '@clerk/express'
import {inngest,functions} from './inngest/index.js'
import cors from 'cors'

configDotenv()
const app = express()
app.use(express.json())
app.use(clerkMiddleware())

app.use(cors(
  {
    origin:process.env.FRONTEND_URL,
    credentials: true,
  }
));
app.use('/api/inngest',serve({
  client: inngest, 
  functions
}))



const PORT = process.env.PORT

app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`)
})