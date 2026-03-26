import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Bot } from './bot.entity';
import { WidgetPosition, WidgetAppearance } from '../../types/widget';

@Entity('widgets')
@Unique(['botId', 'mode'])
export class Widget extends BaseEntity {
  @Column({ type: 'uuid', name: 'bot_id', nullable: true })
  botId: string | null;

  @ManyToOne(() => Bot, (bot) => bot.widgets, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'bot_id' })
  bot: Bot | null;

  @Column({
    type: 'enum',
    enum: WidgetAppearance,
    default: WidgetAppearance.LIGHT,
  })
  mode: WidgetAppearance;

  /** Bot logo image URL or path (max 1 MB, png or jpg) */
  @Column({ type: 'varchar', name: 'bot_logo_url', nullable: true })
  botLogoUrl: string | null;

  @Column({
    type: 'enum',
    enum: WidgetPosition,
    default: WidgetPosition.BOTTOM_RIGHT,
  })
  position: WidgetPosition;

  @Column({
    type: 'varchar',
    name: 'primary_color',
    length: 7,
    default: '#000000',
  })
  primaryColor: string;

  @Column({
    type: 'varchar',
    name: 'header_text_color',
    length: 7,
    default: '#000000',
  })
  headerTextColor: string;

  @Column({ type: 'varchar', length: 7, default: '#ffffff' })
  background: string;

  @Column({
    type: 'varchar',
    name: 'bot_message_bg',
    length: 7,
    default: '#f0f0f0',
  })
  botMessageBg: string;

  @Column({
    type: 'varchar',
    name: 'bot_message_text',
    length: 7,
    default: '#000000',
  })
  botMessageText: string;

  @Column({
    type: 'varchar',
    name: 'user_message_bg',
    length: 7,
    default: '#007bff',
  })
  userMessageBg: string;

  @Column({
    type: 'varchar',
    name: 'user_message_text',
    length: 7,
    default: '#ffffff',
  })
  userMessageText: string;

  @Column({ type: 'varchar', name: 'header_text', nullable: true })
  headerText: string | null;

  @Column({ type: 'text', name: 'welcome_message', nullable: true })
  welcomeMessage: string | null;

  @Column({ type: 'boolean', name: 'show_powered_by', default: true })
  showPoweredBy: boolean;
}
