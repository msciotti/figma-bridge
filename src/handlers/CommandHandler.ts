import { InteractionResponseFlags, InteractionResponseType } from 'discord-interactions';
import { DISCORD_API_WEBHOOK_URL, DISCORD_API_CHANNEL_URL } from '../Constants';

type Interaction = {
    id: string,
    application_id: string,
    type: number,
    data?: InteractionData,
    guild_id?: string,
    channel_id?: string,
    member?: DiscordMember,
    user?: DiscordUser,
    token: string,
    version: number,
    message: any
};

type InteractionData = {
    id: string,
    name: string,
    type: number,
    resolved?: {
        [key: string]: DiscordMember | DiscordUser | any
    },
    options?: Array<InteractionOption>,
    custom_id?: string,
    component_type?: number,
    values?: any,
    target_id?: string
}

type DiscordUser = {
    id: string,
    username: string,
    discriminator: string,
    avatar: string
}

type DiscordMember = {
    nick?: string,
    permissions?: string,
    roles: Array<string>,
    user: DiscordUser
}

type InteractionOption = {
    name: string,
    type: number,
    value?: any,
    options?: Array<InteractionOption>
}

type InteractionOptionKVP = {
    [key: string]: string
}

function optionsToObject(options: Array<InteractionOption>): InteractionOptionKVP {
    let map = new Map(options.map(key => [key.name, key.value] as [string, string]));
    return Object.fromEntries(map);
}

export async function handleApplicationCommand(interaction: Interaction) : Promise<Response> {
    let response;

    if (interaction.data?.name != 'register-file') {
        response = {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: 'Invalid command'
            }
        };
        return new Response(JSON.stringify(response), { status: 400, headers: { 'Content-type': 'application/json' } });
    }

    const options = optionsToObject(interaction.data.options ?? []);
    const { file, channel_id } = options;
    const fileSplit = file.split('/');

    // @ts-ignore
    const webhookEndpoint = await FigmaBridge.get(fileSplit[4]);
    if (webhookEndpoint != null) {
        response = {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: `That file's comments are already being sent to a channel.`
            }
        }
        return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-type': 'application/json' } });
    }

    const createWebhookData = {
        body: JSON.stringify({
            name: 'FigmaBridge',
        }),
        method: 'POST',
        headers: {
            //@ts-ignore
            'Authorization': DISCORD_BOT_TOKEN,
            "Content-Type": "application/json"
        }
    };

    const res = await fetch(`${DISCORD_API_CHANNEL_URL}/${channel_id}/webhooks`, createWebhookData);
    const resJson = await res.json();
    
    if (res.status != 200) {
        response = {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: 'Failed to register the file. Please try again.'
            }
        };
        return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-type': 'application/json' } });
    }

    //@ts-ignore
    await FigmaBridge.put(fileSplit[4], `${DISCORD_API_WEBHOOK_URL}/${resJson.id}/${resJson.token}`);
    response = {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            content: `Success! Comments for "${fileSplit[5].split('?')[0].replaceAll('-', ' ')}" will be sent to <#${channel_id}>.`
        }
    };
    return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-type': 'application/json' } });
}