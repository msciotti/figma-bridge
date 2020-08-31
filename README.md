# FigmaBridge

FigmaBridge posts comments on Figma files into Discord using Discord webhooks and CloudFlare workers. At Discord, we use Discord for work, which means that checking other places for notifications is a pain to remember. We have many channels inside our Engineer and Design server for our different squads, and we wanted to build a way to get team-specific Figma notifcations sent into Discord.

By using Discord webhooks, we can route messages about Figma comments into different text channels depending on the file that was commented on. So we end up getting something like this:

![](https://cdn.discordapp.com/attachments/645027906669510667/749875979463426068/unknown.png)

## What You'll Need

* The ID of your Figma team. You can find it by going to your team settings on the web and looking at the URL:

```
https://www.figma.com/files/6758372436982508222/team/855187521158624999/Product-Design/members
```

In this case, `855187521158624999` is our Team ID

* A [CloudFlare](https://cloudflare.com) account—the free version works great!
* The help of the Owner of your Figma team. They have special permissions
* Webhook permissions on your Discord server of choice

## Setting up CloudFlare Workers

CloudFlare is a provider of many different services, from domain protection to firewall rules for your site and a whole lot more. What we're interested in is their beta service called [CloudFlare Workers](https://workers.cloudflare.com/).

CloudFlare workers are serverless applications that run in CloudFlare, similar to Amazon's AWS Lambda. It's basically a fancy, easy to use, and most importantly _free_ webserver that can accept HTTP requests and execute code.

The reason we need CloudFlare workers is due to a limitation in Figma's API environment. Later, we'll add a Webhook to our Figma team, and per [their documentation](https://www.figma.com/developers/api#webhooks-v2-post-endpoint):

```
endpoint	String
The HTTP endpoint that will receive a POST request when the event triggers. Max length 100 characters.
```

We can only have an endpoint 100 characters in length. Discord webhooks are a bit longer than that, so we need to standup a CloudFlare worker to proxy the requests to Discord. Discord also takes a special kind of formatting for nice-looking embeds, so we'll need to massage the data a bit as well to make it look nice.

### Shut Up and Give Me the Checklist

1. Log in to [CloudFlare](https://cloudflare.com)
2. Once you go through the onboarding, click "Workers" at the top
3. Click "Manage Workers"
4. Agree to use the free plan and pick a subdomain name
5. Create a new worker
6. Rename it to a URL name you like
7. Save that URL for later

We'll be back here shortly, but for now, on to Figma!

## Figma Webhooks

Figma's [Webhooks V2](https://www.figma.com/developers/api#webhooks_v2) are also currently in an open beta. That means their API works could change, but as we all know in the world of tech, open beta basically means done. At least, that's what I tell my boss so I don't have to change code anymore.

For this part, you'll need the help of the owner of your Figma team. I'm unsure if there are more granular permissions on teams that allow you to create webhooks, but let's bother our Owner to be safe.

1. Start a video call with your Figma Team owner so you can walk them through the buttons. I recommend Discord. Did you know [Discord Nitro](https://discord.com/nitro) lets you share your screen at up to 4K/60FPS because obviously you as a designer have a super nice monitor? Crazy huh?
2. Have your Team Owner visit: [https://www.figma.com/developers/api#webhooks-v2-post-endpoint](https://www.figma.com/developers/api#webhooks-v2-post-endpoint)
3. We're gonna make use of the little API explorer on the right to make our requests. Have them hit "Get personal access token"
4. Fill out the fields with your team id, passcode you want to validate against, and URL of your CloudFlare worker that you saved
5. In the event_type field, enter `FILE_COMMENT`

All in all, it'll look something like this:

![](https://cdn.discordapp.com/attachments/645027906669510667/749873401660702890/unknown.png)

You'll get a response back with info about the Webhook you created:

```json
{
  "id": "999",
  "team_id": "882114673651313999",
  "event_type": "FILE_COMMENT",
  "client_id": null,
  "endpoint": "https://figmabot.test.workers.dev",
  "passcode": "myPasscode",
  "status": "ACTIVE",
  "description": null,
  "protocol_version": "2"
}
```

Have your Team Owner send you this info. You won't really need it for anything other than maybe debugging. You can use the `id` and `team_id` with the [GET webhook requests](https://www.figma.com/developers/api#webhooks-v2-requests-endpoint) endpoint to see all the requests that have come through our little program.

Off to Discord!

## Discord Setup

In Discord, we'll want to make a webhook that will send the Figma message into Discord for us. You can make a webhook by:

1. Hover over the text channel you want to post to
2. Click the gear
3. Click "Integrations"
4. Click "Webhooks"
5. Create a new webhook
6. Name it whatever you'd like and give it an icon. If you're planning on making a bunch of webhooks to split out notifications by internal teams, you probably want to make it descriptive, like "Growth Team" or "Bot Squad"
7. Copy the webhook URL and save it for later

![](https://cdn.discordapp.com/attachments/645027906669510667/749878998846406657/unknown.png)

OK, finally back to CloudFlare!

## The Code

So now, every time a comment is left on a file that belongs to this team, our CloudFlare worker will receive a `POST` request with info about the comment. That info does us no good being sent into the void, so let's write some code to do something with it.

If we go back to our CloudFlare Worker, we can hit the `[{} Quick Edit]` button to edit the code that runs when our worker receives a request. You'll see a bunch of stuff in this view, but we just care about the "Script" pane.

Copy the code found in the `FigmaBridge.js` file in this repo and paste it in your script window. You'll want to edit the [`FILE_TO_WEBHOOK_MAP` object](https://github.com/msciotti/FigmaBridge/blob/master/FigmaBridge.js#L45) to suit your needs. 

For each key/value pair in the object, the `key` is the `file_key` of the Figma file. You can find it by visiting the Figma URL of your file in a browser:

```
https://www.figma.com/file/DGPTIUzgnwZoTJmukb9999/aaa?node-id=0%3A1
```

In this case, `DGPTIUzgnwZoTJmukb9999`is our `file_key`. For the `value`, we want to take the Discord webhook URL we saved earlier and remove `https://discord.com/api/webhooks/`. You'll be left with a long number and an alphanumeric string separated by a slash; that's the ID and token of the webhook. Your object should look something like this:

```js
// This is a fake token
const FILE_TO_WEBHOOK_MAP = {
    'DGPTIUzgnwZoTJmukb9999': '749841570202910999/1pF_Z2SAAAAAygEw3_dFe2tL4O_HpmgZZZZZZZZ1fY9_6KGWRRvyfn_51RVDnBQQQQQQQ'
}
```

Now, every time a comment is left on file `DGPTIUzgnwZoTJmukb9999`, our CloudFlare Worker will send a webhook request to the channel we set up earlier. If you want to send notifications from more files—or send them to different Discord channels—you can do so by creating other Discord webhooks and repeating the process, adding more key/value pairs to the `FILE_TO_WEBHOOK_MAP` object:

```js
const FILE_TO_WEBHOOK_MAP = {
    'DGPTIUzgnwZoTJmukb9999': '749841570202910999/1pF_Z2SAAAAAygEw3_dFe2tL4O_HpmgZZZZZZZZ1fY9_6KGWRRvyfn_51RVDnBQQQQQQQ',
    '123124aidjwaid':'749841570202914444/1pF_Z2SAAAAAygEw3_dFe2tL4O_HpmgZZZZZZZZ1fY9_6KGWRRvyfn_51RVDnBJJJJJJJJ'
}
```

Now click "Save and Deploy" on your CloudFlare worker, and start writing some comments!