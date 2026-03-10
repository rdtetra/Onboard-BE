import { DataSource, Repository } from 'typeorm';
import { Bot } from '../common/entities/bot.entity';
import { Conversation } from '../common/entities/conversation.entity';
import { Message } from '../common/entities/message.entity';
import { ConversationStatus } from '../types/conversation';
import { MessageSender } from '../types/message';

const VISITOR_IDS = [
  '11111111-1111-1111-1111-111111111101',
  '11111111-1111-1111-1111-111111111102',
  '11111111-1111-1111-1111-111111111103',
  '11111111-1111-1111-1111-111111111104',
  '11111111-1111-1111-1111-111111111105',
];

const SAMPLE_MESSAGES: { content: string; sender: MessageSender }[] = [
  { content: 'Hi, I need help with my order.', sender: MessageSender.USER },
  { content: "Hello! I'd be happy to help. Could you share your order ID?", sender: MessageSender.BOT },
  { content: "It's #ORD-12345", sender: MessageSender.USER },
  { content: "I've found your order. It's shipping tomorrow. Anything else?", sender: MessageSender.BOT },
  { content: 'No, that was all. Thanks!', sender: MessageSender.USER },
  { content: "You're welcome! Have a great day.", sender: MessageSender.BOT },
];

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

export async function seedConversations(dataSource: DataSource): Promise<void> {
  const botRepository = dataSource.getRepository(Bot);
  const conversationRepository = dataSource.getRepository(Conversation);
  const messageRepository = dataSource.getRepository(Message);

  // Delete all existing messages then conversations (FK order)
  await messageRepository.createQueryBuilder().delete().execute();
  await conversationRepository.createQueryBuilder().delete().execute();

  const bots = await botRepository.find();
  if (bots.length === 0) {
    return; // no bots to attach conversations to
  }

  for (const bot of bots) {
    // Open conversation (recent)
    const openConv = conversationRepository.create({
      botId: bot.id,
      visitorId: VISITOR_IDS[0],
      status: ConversationStatus.OPEN,
      startedAt: daysAgo(0),
      endedAt: null,
    });
    const savedOpen = await conversationRepository.save(openConv);
    await addMessages(messageRepository, savedOpen.id);

    // Closed conversation (ended yesterday)
    const closedConv = conversationRepository.create({
      botId: bot.id,
      visitorId: VISITOR_IDS[1],
      status: ConversationStatus.CLOSED,
      startedAt: daysAgo(2),
      endedAt: daysAgo(1),
    });
    const savedClosed = await conversationRepository.save(closedConv);
    await addMessages(messageRepository, savedClosed.id);

    // Archived conversation (older)
    const archivedConv = conversationRepository.create({
      botId: bot.id,
      visitorId: VISITOR_IDS[2],
      status: ConversationStatus.ARCHIVED,
      startedAt: daysAgo(7),
      endedAt: daysAgo(6),
    });
    const savedArchived = await conversationRepository.save(archivedConv);
    await addMessages(messageRepository, savedArchived.id);

    // Extra open with different visitor
    const open2Conv = conversationRepository.create({
      botId: bot.id,
      visitorId: VISITOR_IDS[3],
      status: ConversationStatus.OPEN,
      startedAt: daysAgo(1),
      endedAt: null,
    });
    const savedOpen2 = await conversationRepository.save(open2Conv);
    await addMessages(messageRepository, savedOpen2.id);
  }
}

/** Adds the same sample messages to a conversation (all bots get identical content). */
async function addMessages(
  messageRepository: Repository<Message>,
  conversationId: string,
): Promise<void> {
  for (const { content, sender } of SAMPLE_MESSAGES) {
    const msg = messageRepository.create({
      conversationId,
      content,
      sender,
    });
    await messageRepository.save(msg);
  }
}
