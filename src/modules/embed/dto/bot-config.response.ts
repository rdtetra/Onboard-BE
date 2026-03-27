/**
 * Bot + widget config returned to the embed script (widget token required).
 * Includes colors, mode, position, and all display settings.
 */
export class BotConfigResponseDto {
  /** Bot */
  name: string;
  description: string | null;
  introMessage: string | null;
  behavior: string | null;

  /** Widget appearance & layout */
  mode: string;
  position: string;
  primaryColor: string;
  headerTextColor: string;
  background: string;
  botMessageBg: string;
  botMessageText: string;
  userMessageBg: string;
  userMessageText: string;

  /** Widget copy & assets */
  headerText: string | null;
  welcomeMessage: string | null;
  botLogoUrl: string | null;
  showPoweredBy: boolean;
  taskChips: Array<{
    id: string;
    type: 'query' | 'link';
    label: string;
    question: string | null;
    url: string | null;
    newTab: boolean;
  }>;
}
