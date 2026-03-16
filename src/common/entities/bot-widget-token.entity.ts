import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Bot } from './bot.entity';

@Entity('bot_widget_tokens')
export class BotWidgetToken extends BaseEntity {
  @Column({ type: 'uuid', name: 'bot_id' })
  botId: string;

  @ManyToOne(() => Bot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bot_id' })
  bot: Bot;

  /** The issued JWT (widget token) stored for reference and revoke. */
  @Column({ type: 'text' })
  token: string;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  /** Optional label (e.g. "Production embed", "Staging"). */
  @Column({ type: 'varchar', nullable: true })
  name: string | null;
}
