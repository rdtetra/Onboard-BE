import { WidgetAppearance, WidgetPosition } from '../../types/widget';

/** Default widget config used when creating new widgets and when returning embed config with no widget. */
export const DEFAULT_WIDGET_CONFIG = {
  mode: WidgetAppearance.LIGHT,
  position: WidgetPosition.BOTTOM_RIGHT,
  primaryColor: '#7b61ff',
  headerTextColor: '#fefefe',
  background: '#fefefe',
  botMessageBg: '#f2efff',
  botMessageText: '#7b61ff',
  userMessageBg: '#7b61ff',
  userMessageText: '#fefefe',
  headerText: 'Hi, how can I help?',
  welcomeMessage:
    'Welcome to Onboard Support! Ask me anything about our products.',
  botLogoUrl: null as string | null,
  showPoweredBy: false,
} as const;
