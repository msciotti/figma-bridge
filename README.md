# FigmaBridge

FigmaBridge posts comments on Figma files into Discord using Discord webhooks and CloudFlare workers. 

At Discord, we use Discord for work, which means that checking other places for notifications is a pain to remember. We have many channels inside our Engineer and Design server for our different squads, and we wanted to build a way to get team-specific Figma notifcations sent into Discord.

By using Discord webhooks, we can route messages about Figma comments into different text channels depending on the file that was commented on. So we end up getting something like this:

![An image showing a message from a bot](https://cdn.discordapp.com/attachments/345626669114982402/882398223174598686/unknown.png)

## Step 1 - Make a Discord app

1. Log into the [Discord Developer Portal](https://discord.com/developers)
2. Create a new application
3. Make note of the following info on the page: `APPLICATION ID` and `PUBLIC KEY`
4. Click on "Bot" in the sidebar
5. Create a bot
6. Make note of the following info on the page: `TOKEN`
7. Create a URL: `https://discord.com/api/oauth2/authorize?client_id=<MY_APPLICATION_ID>&permissions=536870912&scope=bot%20applications.commands`
8. Click it, and add the bot to your Discord server

## Step 2 - Set up the Repo


### Wrangler

[Cloudflare's Wrangler](https://github.com/cloudflare/wrangler) is an awesome tool for managing workers locally. Follow the instructions for setting up the CLI tool. Then:

1. Clone the repo
2. `wrangler init`

You'll see a `wrangler.toml` file in the repo that has the info needed to publish to Cloudflare:

```toml
name = "figma-bridge"
type = "javascript"
zone_id = ""
account_id = ""
route = ""
workers_dev = true

[build]
command = "npm install && npm run build"
[build.upload]
format = "service-worker"

[vars]
DISCORD_BOT_TOKEN	= ""
DISCORD_FIGMA_PASSCODE = ""
DISCORD_PUBLIC_KEY = ""

[[kv_namespaces]]
binding = ""
id = ""
```

3. Copy your `zone_id` and `account_id` from your CloudFlare login page and paste them here
4. Copy your bot token and public key into the corresponding variables
5. Your passcode can be whatever you want. Pick a string; we'll use it later
6. Create a KV Namespace in Cloudflare by going to Cloudflare --> Workers --> KV (at the top)
7. `binding` is whatever you named the namespace; `id` is its id

At this point, you should be able to run `wrangler dev` and have the stack boot locally. By default, it runs on `localhost:8787`. When developing, I use `ngrok http 8787` to get an external URL for Figma and Discord, which I then replace with the `*.workers.dev` url once deployed.

## Step 3 - Figma Webhooks

Figma's [Webhooks V2](https://www.figma.com/developers/api#webhooks_v2) are also currently in an open beta. That means their API works could change, but as we all know in the world of tech, open beta basically means done. At least, that's what I tell my boss so I don't have to change code anymore.

For this part, you'll need the help of the owner of your Figma team. I'm unsure if there are more granular permissions on teams that allow you to create webhooks, but let's bother our Owner to be safe.

1. Start a video call with your Figma Team owner so you can walk them through the buttons. I recommend Discord. Did you know [Discord Nitro](https://discord.com/nitro) lets you share your screen at up to 4K/60FPS because obviously you as a designer have a super nice monitor? Crazy huh?
2. Have your Team Owner visit: [https://www.figma.com/developers/api#webhooks-v2-post-endpoint](https://www.figma.com/developers/api#webhooks-v2-post-endpoint)
3. We're gonna make use of the little API explorer on the right to make our requests. Have them hit "Get personal access token"
4. Ask them to give you the token

> From what I can tell, this token never expires. The token must belong to an admin on your organization (and you have to be on the enterprise plan)

Now we're going to register a webhook handler to our Figma team.

```
curl --location --request POST 'https://api.figma.com/v2/webhooks' \
--header 'X-FIGMA-TOKEN: ADMIN_FIGMA_TOKEN' \
--header 'Content-Type: application/json' \
--data-raw '{
    "event_type": "FILE_COMMENT",
    "team_id": "855187521158624103",
    "endpoint": "https://my-ngrok-url/figma",
    "passcode":"my-figma-password"
}'
```

`endpoint` is your ngrok url (or however you want to stand up a webserver) and `passcode` is whatever you registered in your `wrangler.toml` file.

We're done with the Figma API for now. You can read more about it [here](https://www.figma.com/developers/api#webhooks_v2).

## Step 4 - Back to Discord

Now that we've got an ngrok url, we want to make sure that we handle Discord interactions properly. Go back to your application in Discord and add

```
https://my-ngrok-url.com/interactions
```

Or whatever url you are using, into the `INTERACTIONS ENDPOINT URL` field, then hit save.

## Step 5 - One  Slash Command

Finally, we need to be able to register files to corresponding channels in Discord. To do that, we can use a slash command. Make this request to create the slash command in Discord:

```
curl --location --request POST 'https://discord.com/api/v9/applications/MY_APPLICATION_ID/commands' \
--header 'Authorization: Bot MY_BOT_TOKEN' \
--header 'Content-Type: application/json' \
--data-raw '{
    "name": "register-file",
    "type": 1,
    "description": "Registers a file to a channel where comments will be sent to",
    "options": [
        {
            "name": "file",
            "description": "Link to the figma file",
            "type": 3,
            "required": true
        },
        {
            "name": "channel_id",
            "description": "The channel to send comments to",
            "type": 7,
            "required": true
        }
    ]
}'
```

This will create a slash command called `/register-file` in Discord.

> Global commands take an hour to propogate, so be patient! You can also create [Guild Commands](https://discord.com/developers/docs/interactions/application-commands#create-guild-application-command) which appear instantly.

## Step 6 - Production Deployment

Once you're satisfied with the local stack, you can deploy to prod using

```
wrangler publish
```

That will generate a `*.workers.dev` url which you can replace your ngrok urls with.