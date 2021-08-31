import { InteractionResponseType } from "discord-interactions";

export function handlePing(): Response {
    const response = {
        type: InteractionResponseType.PONG
    };
    return new Response(JSON.stringify(response), { headers: { 'content-type': 'application/json' } });
};