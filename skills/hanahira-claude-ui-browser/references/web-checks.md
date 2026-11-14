# Checking a site in the browser

A look-up for checking a web app through Claude in Chrome or the built-in browser: walking a change end to end, forms, pages that load slowly or change under me, and reaching a dev server from the person's browser. The session's own browser skill (`chrome-browser` or `built-in-browser`) holds the tool rules; this is the method.

## Walking a change end to end

1. Name what done looks like before opening the page: the element, the text, the state after the action.
2. Open the real entry point (the URL a user would use), not a deep link that skips the step that broke.
3. Read the page as text first; take a screenshot only to check layout, colour or position.
4. Do the action, then read the page again and look for the proof: the new row, the toast, the changed URL, the cleared error.
5. Check one neighbour that could have broken: the list the item appears in, the page before it, the signed-out view.
6. Report what was seen, with the URL and the exact text that proves it.

## Forms

- Fill with `form_input`, then read the field values back before submitting.
- A form that only saves a draft or a test record is fine; one that sends, pays, books, publishes or deletes needs the user's named go-ahead (core rule 2).
- Use the site's test mode, a sandbox account or obviously fake data when testing my own app.
- After submitting, read the response page and the network request: a 2xx with an error message in the body is still a failure.

## Pages that change under me

- Wait for the thing, not for time: read the page again until the element or text appears, a few tries, rather than a fixed sleep.
- Single-page apps change the content without a navigation; read again after each action instead of trusting the previous read.
- A spinner that never ends: check the network requests for the call that is pending or failed, and the console for the error.
- An element that will not take a click: it may be covered (a banner, a modal, a cookie bar), off screen, or disabled. Read the page around it before trying again.

## Debugging with the browser

- Console: read it with a `pattern` for the app's own prefix to skip noise; the first error usually explains the rest.
- Network: find the failing request, then read its status, its response body and the request it sent. A 401 or 403 points at auth, a 404 at the URL, a 5xx at the server's log, and CORS errors at the server's headers.
- Reproduce the failing request outside the browser (`curl` with the same method, headers and body) when the server side needs fixing.
- Never paste secrets, cookies or tokens read from the page into the chat or a tool argument.

## Reaching a dev server from the person's browser

The browser runs on the person's computer. When Claude runs on an SSH host or in the cloud:

- `http://localhost:3000` in the browser is the person's machine, not the host. A server I started on the host is not there.
- Ways to make it reachable, in order of preference: a preview or staging URL the project already has; a port forward the person runs on their machine (`ssh -L 3000:localhost:3000 host`) so their `localhost:3000` reaches the host; a tunnel service the team already uses. Opening a port on the host's firewall is an outward step under rule 2.
- Bind the dev server to `127.0.0.1` when it is reached through an SSH forward; `0.0.0.0` exposes it to the whole network.
- Generated HTML that only needs to be looked at goes in an artifact, not a local file the browser cannot open.

## Recording and evidence

- Record a GIF for a multi-step flow the person will review or share, with a few frames before and after each action and a name that says what it shows.
- For a visual change, a before and after screenshot at the same size says more than a description.
- Keep evidence to what the task needs; do not capture pages with personal data unless the task is about them.
