/* Example Figma webhook for FIGMA_COMMENT event

{
    "comment": [
        {
            "text": "Do you think we could make this pop a little bit more?"
        }
    ],
    "retries": 0,
    "file_key": "DGPTIUzgnwZoTJmukb9999",
    "mentions": [],
    "order_id": "",
    "passcode": "myPasscode",
    "file_name": "aaa",
    "parent_id": "38805422",
    "timestamp": "2020-08-31T05:21:04Z",
    "comment_id": "38809122",
    "created_at": "2020-08-31T05:21:04Z",
    "event_type": "FILE_COMMENT",
    "webhook_id": "101",
    "resolved_at": "",
    "triggered_by": {
        "id": "664606760033829999",
        "handle": "Mason Sciotti"
    },
    "protocol_version": "2"
}

*/

/* Constants */

const DISCORD_URL = 'https://discord.com/api/webhooks/';
const FIGMA_URL = 'https://www.figma.com/file/';

/* Webhook Mapping

    * Discord uses one central Figma team for all our product design files
    * This key-value object maps between Figma file keys and Discord webhook id/token combos
    * This lets us direct comments on certain files to certain channels in Discord
    * If a registered file key comes in, we execute the matched webhook
    
*/

const FILE_TO_WEBHOOK_MAP = {
    'example': 'id/token'
}

addEventListener('fetch', event => {
    event.respondWith(handleFigmaRequest(event.request))
})

/**
 * Respond to the request
 * @param {Request} request
 */
async function handleFigmaRequest(request) {
    let formData = await request.json()

    /*
        * Passcodes let us validate the origin of the request
        * If it doesn't include our passcode that we set, deny the request
        * Don't wanna get spammed!
    */
    const passcode = formData['passcode'];
    if (passcode !== 'myPasscode') {
        return new Response("Could not validate origin", {
            headers: { "Content-Type": "application/json" },
            status: 500
        });
    }

    const author = formData['triggered_by']['handle'];
    const fileName = formData['file_name'] !== '' ? formData['file_name'] : 'Untitled';
    const fileKey = formData['file_key'];
    const comment = formData['comment'][0]['text'];
    const timestamp = formData['timestamp'];

    /*
        * We want to make sure we're not tring to send request for unmapped files
        * We return 200 here because otherwise Figma will attempt to retry the request
    */
    if (FILE_TO_WEBHOOK_MAP[fileKey] == null) {
        return new Response("File not registered", {
            headers: { "Content-Type": "application/json" },
            status: 200
        });
    }

    const data = {
        body: JSON.stringify({
            "embeds": [
                {
                    "color": 15307264,
                    "author": {
                        "name": author
                    },
                    "title": `Comment in ${fileName}`,
                    "url": `${FIGMA_URL}${fileKey}/${fileName}`,
                    "description": comment,
                    "timestamp": timestamp,
                    "footer": {
                        "icon_url": "https://images.ctfassets.net/1khq4uysbvty/4n5xwN1WkUWseGeAQ8UO8o/e2dfda5b63be2e3ad6d2c2abc69fed51/Frame_2.png",
                        "text": "FigmaBridge"
                    }
                }
            ]
        }),
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }
    };

    const endpoint = `${DISCORD_URL}${FILE_TO_WEBHOOK_MAP[fileKey]}`;

    let result = await fetch(endpoint, data);
    result = await result.json();
    console.log(result);

    return new Response(JSON.stringify(result), data);
}