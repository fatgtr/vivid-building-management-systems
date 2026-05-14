import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (event.type === 'create' && data) {
      // Update chat with last message info
      await base44.asServiceRole.entities.Chat.update(data.chat_id, {
        last_message: data.message.substring(0, 100),
        last_message_date: new Date().toISOString(),
        unread_count: 0 // Will be calculated separately per user
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Chat update failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});