export type ResponseFormat<T = unknown> = {
  url: string;
  message: string[];
  success: boolean;
  statusCode: number;
  timestamp: string;
  data?: T;
};
