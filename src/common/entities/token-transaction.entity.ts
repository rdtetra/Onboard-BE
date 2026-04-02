import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { TokenWallet } from './token-wallet.entity';
import { TokenTransactionType } from '../enums/token-transaction-type.enum';
import { Bot } from './bot.entity';
import { Conversation } from './conversation.entity';

@Entity('token_transactions')
export class TokenTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'wallet_id' })
  walletId: string;

  @ManyToOne(() => TokenWallet, (w) => w.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: TokenWallet;

  @Column({ type: 'enum', enum: TokenTransactionType })
  type: TokenTransactionType;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'uuid', name: 'bot_id', nullable: true })
  botId: string | null;

  @ManyToOne(() => Bot, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'bot_id' })
  bot: Bot | null;

  @Column({ type: 'uuid', name: 'conversation_id', nullable: true })
  conversationId: string | null;

  @ManyToOne(() => Conversation, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
