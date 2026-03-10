import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Bot } from './bot.entity';
import { Message } from './message.entity';
import { ConversationStatus } from '../../types/conversation';

@Entity('conversations')
export class Conversation extends BaseEntity {
  @Column({ type: 'uuid', name: 'bot_id' })
  botId: string;

  @ManyToOne(() => Bot, (bot) => bot.conversations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bot_id' })
  bot: Bot;

  @Column({ type: 'uuid', name: 'visitor_id' })
  visitorId: string;

  @Column({ type: 'enum', enum: ConversationStatus, default: ConversationStatus.OPEN })
  status: ConversationStatus;

  @Column({ type: 'timestamp', name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'timestamp', name: 'ended_at', nullable: true })
  endedAt: Date | null;

  @OneToMany(() => Message, (message: Message) => message.conversation, {
    cascade: true,
  })
  messages: Message[];
}
