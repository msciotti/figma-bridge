export function handleMessageComponent(): Response {
    const response = {
        type: 4,
        data: { flags: 64, content: 'Not implemented' }
    };
    return new Response(JSON.stringify(response), { status: 200, headers: { 'content-type': 'application/json' } });
}