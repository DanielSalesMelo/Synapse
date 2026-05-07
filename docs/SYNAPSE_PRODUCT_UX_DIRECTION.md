# Synapse Product And UX Direction

Synapse is not a helpdesk-first product. Synapse is an AI-first, realtime, premium operational intelligence platform for support, IT, automation and secure remote operations.

The helpdesk is only one module inside Synapse. New screens and components must not feel like a legacy ticketing system, ERP, GLPI clone, Bootstrap admin panel or heavy corporate dashboard.

## Product Feeling

Synapse should feel:

- Alive.
- Intelligent.
- Fast.
- Calm.
- Organized.
- Conversational.
- Premium.
- Realtime.
- AI-native.

Reference mix:

- ChatGPT.
- Intercom.
- Linear.
- Notion.
- Datadog.
- Vercel.
- Arc Browser.
- Warp Terminal.
- Slack.
- Discord.

## Visual Direction

Use a premium dark mode foundation with:

- Strong negative space.
- Subtle blur and translucency.
- Fluid transitions.
- Modern badges.
- Intelligent cards.
- Timelines.
- Realtime presence/status indicators.
- Elegant sidebar.
- Command palette.
- Clean typography.
- Minimalist UX.

Avoid:

- Generic admin templates.
- Heavy tables as the main experience.
- Old "form-first" helpdesk flows.
- Bootstrap dashboard aesthetics.
- ERP-style density.

## Chat And Helpdesk

The chat is the center of the experience.

Opening a ticket must feel like a modern conversation, not an old form. The user writes naturally, such as "Minha VPN caiu" or "Meu notebook está lento"; Synapse/AI should classify, contextualize, suggest solutions and route to IT when needed.

The ideal common-user feeling is ChatGPT plus Intercom.

## Composer Standard

The message composer should behave like modern collaboration products:

- Paste screenshots with Ctrl+V.
- Paste images directly.
- Drag and drop files.
- Multiple attachments.
- Inline previews.
- Copy/paste logs.
- Upload progress.
- Elegant attachment states.

Do not make "Escolher arquivo" the primary experience.

## Notifications And Background

Synapse and the agent should behave like modern always-on apps:

- Realtime notifications.
- Unread badges.
- New message alerts.
- New ticket alerts.
- IT response alerts.
- Incident alerts.
- Elegant toasts.
- Background sync.
- Connected/disconnected indicators.

## Common User Experience

Common users should only see:

- Support chat.
- Own requests.
- Attachments/screenshots.
- Service status.

Do not expose:

- Technical menus.
- Hardware details.
- AnyDesk.
- Shell/commands.
- Other assets/users.
- Admin/TI functions.

## IT Experience

The IT console should feel closer to Datadog, Linear, Warp and Vercel:

- Modern terminal.
- Realtime logs.
- Live timeline.
- Visual status.
- Quick filters.
- Command palette.
- AI sidecar/copilot.
- Fast actions.
- Clean operational context.

## AI Native

AI must not feel like a detached popup. It should be a native operational copilot that can:

- Summarize tickets.
- Suggest replies.
- Detect risk.
- Explain logs.
- Suggest safe commands.
- Correlate events.
- Support users and IT.

## Realtime Principle

Messages, machines, alerts, telemetry, presence, typing, logs, status, tickets and agents should update without manual refresh wherever possible.

## Implementation Rule

Do not rewrite the current Synapse just to chase visuals. Preserve the current system and improve new modules/components in this direction as they are touched.
