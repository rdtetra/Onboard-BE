import { Entity, Column, OneToOne, DeleteDateColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Bot } from './bot.entity';
import { WidgetPosition, WidgetAppearance } from '../../types/widget';

@Entity('widgets')
export class Widget extends BaseEntity {
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  /** Inverse side of Bot.widget – Bot owns the relation (bots.widget_id). */
  @OneToOne(() => Bot, (bot) => bot.widget)
  bot: Bot | null;

  /** Bot logo image URL or path (max 1 MB, png or jpg) */
  @Column({ type: 'varchar', name: 'bot_logo_url', nullable: true })
  botLogoUrl: string | null;

  @Column({ type: 'enum', enum: WidgetPosition, default: WidgetPosition.BOTTOM_RIGHT })
  position: WidgetPosition;

  @Column({ type: 'enum', enum: WidgetAppearance, default: WidgetAppearance.LIGHT })
  appearance: WidgetAppearance;

  @Column({ type: 'varchar', name: 'primary_color', length: 7, default: '#000000' })
  primaryColor: string;

  @Column({ type: 'varchar', name: 'header_text_color', length: 7, default: '#000000' })
  headerTextColor: string;

  @Column({ type: 'varchar', length: 7, default: '#ffffff' })
  background: string;

  @Column({ type: 'varchar', name: 'bot_message_bg', length: 7, default: '#f0f0f0' })
  botMessageBg: string;

  @Column({ type: 'varchar', name: 'bot_message_text', length: 7, default: '#000000' })
  botMessageText: string;

  @Column({ type: 'varchar', name: 'user_message_bg', length: 7, default: '#007bff' })
  userMessageBg: string;

  @Column({ type: 'varchar', name: 'user_message_text', length: 7, default: '#ffffff' })
  userMessageText: string;

  @Column({ type: 'varchar', name: 'header_text', nullable: true })
  headerText: string | null;

  @Column({ type: 'text', name: 'welcome_message', nullable: true })
  welcomeMessage: string | null;

  @Column({ type: 'boolean', name: 'show_powered_by', default: true })
  showPoweredBy: boolean;
}
