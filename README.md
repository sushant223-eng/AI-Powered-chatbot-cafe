# Morrow & Mint Café

A responsive café website with a menu/order experience, reservation interaction, and a chatbot that forwards messages to your n8n webhook.

## Run it

1. Open a terminal in this folder.
2. Run `npm start`.
3. Visit `http://localhost:3000`.

No packages need to be installed; the server uses Node's built-in modules and `fetch` (Node 18+).

## Chatbot connection

The chat widget sends requests to the local server at `/api/chat`. The server forwards the following JSON to n8n:

```json
{
  "message": "What are your opening hours?",
  "source": "morrow-and-mint-website",
  "timestamp": "2026-09-05T...Z"
}
```

It is already configured with the supplied webhook. To use another production n8n webhook without editing code, set `N8N_WEBHOOK_URL` before starting the server.

For the widget to show a reply, configure the last n8n node as **Respond to Webhook** and return JSON containing `reply`, `message`, `output`, `text`, or `response`, for example:

```json
{ "reply": "We are open Monday–Friday from 7:30 AM to 9 PM." }
```

The supplied URL contains `webhook-test`, so n8n must be in test/listening mode while you test. Once your workflow is live, replace it with its production `/webhook/...` URL.
