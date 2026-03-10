import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import type { Conversation } from './conversation.entity';
import { MessageSender } from '../../types/message';

@Entity('messages')
export class Message extends BaseEntity {
  @Column({ type: 'uuid', name: 'conversation_id' })
  conversationId: string;

  @ManyToOne('Conversation', (conversation: Conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: MessageSender })
  sender: MessageSender;
}
