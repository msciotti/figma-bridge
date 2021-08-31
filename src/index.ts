import { InteractionType } from "discord-interactions";
import { Router } from 'itty-router';
import { verifyKeyMiddleware, verifyFigmaMiddleware } from './helpers/Middleware';
import { handleApplicationCommand } from './handlers/CommandHandler';
import { handlePing } from './handlers/PingHandler';
import { handleMessageComponent } from "./handlers/MessageComponentHandler";
import * as Constants from './Constants';

const router = Router();

/*
  Figma Webhooks v2 seems to have a bug sending duplicate events
  Retries does not increment, but the event is sent to the server twice
  This cache keeps track of the last comment_id received per file_key
  And checks for a duplicte event before sending
*/
type FIGMA_EVENT_CACHE = {
  [key: string]: boolean
};

let FIGMA_CACHE: FIGMA_EVENT_CACHE = {};

router.get('/', () => {
  return new Response('Hello world!');
})

router.post('/interactions', verifyKeyMiddleware, async (req: Request) => {
  let response;
  const json = await req.json();

  switch (json.type) {
    case InteractionType.PING:
      return handlePing();

    case InteractionType.APPLICATION_COMMAND:
      return await handleApplicationCommand(json);

    case InteractionType.MESSAGE_COMPONENT:
      return handleMessageComponent();

    default:
      response = {
        type: 4,
        data: { flags: 64, content: 'Something went wrong' }
      };
      return new Response(JSON.stringify(response), { status: 200, headers: { 'content-type': 'application/json' } });
  }
})



router.post('/figma', verifyFigmaMiddleware, async (req: Request) => {
  const data = await req.json();
  const { triggered_by, file_name, file_key, comment, timestamp, comment_id } = data;
  const { handle } = triggered_by;
  const { text } = comment[0];

  if (FIGMA_CACHE[comment_id]) {
    // We send 200 so that Figma doesn't try and retry
    return new Response('Please stop sending duplicate events', { status: 200 });
  }

  FIGMA_CACHE[comment_id] = true;

  // @ts-ignore
  const webhookEndpoint = await FigmaBridge.get(file_key);
  if (webhookEndpoint == null) {
    return new Response('', { status: 404 });
  }

  const result = await fetch(webhookEndpoint, {
    body: JSON.stringify({
      "embeds": [
        {
          "color": 15307264,
          "author": {
            "name": handle
          },
          "title": `Comment in ${file_name}`,
          "description": text,
          "timestamp": timestamp,
          "footer": {
            "icon_url": Constants.FIGMA_FOOTER_URL,
            "text": "FigmaBridge"
          }
        }
      ],
      "components": [
        {
          "type": 1,
          "components": [
            {
              "type": 2,
              "style": 5,
              "url": `${Constants.FIGMA_URL}${file_key}?node-id=0:1#${comment_id}`,
              "label": "View comment"
            }
          ]
        }],
        "avatar_url": Constants.FIGMA_FOOTER_URL
    }),
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  });

  if (result.status === 204) {
    return new Response('Comment sent to Discord', { status: 200 });
  }
  else {
    return new Response('Something went wrong', { status: 400 });
  }
})

addEventListener('fetch', (event) => {
  event.respondWith(router.handle(event.request))
})
