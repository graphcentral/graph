import { Client } from "@notionhq/client"
import { Handler } from "@netlify/functions"
import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.resolve(__dirname, `..`, `..`, `..`, `.env`) })

const handler: Handler = async (event, context) => {
  console.log(process.env)
  const notion = new Client({
    auth: process.env.NOTION_TOKEN,
  })
  ;(async () => {
    const listUsersResponse = await notion.users.list({})
    console.log(listUsersResponse)
  })()
  return {
    statusCode: 200,
    body: JSON.stringify({ message: `Hello World` }),
  }
}

export { handler }
