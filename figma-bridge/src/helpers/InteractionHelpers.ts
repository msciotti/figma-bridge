import { InteractionResponseFlags, InteractionResponseType, InteractionType } from "discord-interactions";

type InteractionResponse = {
    type: number,
    data?: {
      content?: string,
      embeds?: Array<any>,
      flags?: number
    }
  }

function createInteractionResponse(body: InteractionResponse | string, statusCode: number = 200) {
    return new Response(JSON.stringify(body), {
        status: statusCode,
        headers: {
        'Content-Type': 'application/json'
        }
    })
}

export default createInteractionResponse;