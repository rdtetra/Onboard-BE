export type OpenAiUsageQuery = {
  startTime?: string;
  endTime?: string;
  page?: string;
};

export type OpenAiUsageBaseResult = {
  project_id: string | null;
  user_id: string | null;
  api_key_id: string | null;
  model: string | null;
};

export type OpenAiCompletionsUsageResult = OpenAiUsageBaseResult & {
  object: 'organization.usage.completions.result';
  input_tokens: number;
  output_tokens: number;
  input_cached_tokens: number;
  input_audio_tokens: number;
  output_audio_tokens: number;
  num_model_requests: number;
  batch: boolean | null;
  service_tier: string | null;
};

export type OpenAiEmbeddingsUsageResult = OpenAiUsageBaseResult & {
  object: 'organization.usage.embeddings.result';
  input_tokens: number;
  num_model_requests: number;
};

export type OpenAiUsageBucket<TUsageResult> = {
  object: 'bucket';
  start_time: number;
  end_time: number;
  results: TUsageResult[];
};

export type OpenAiUsagePage<TUsageResult> = {
  object: 'page';
  data: OpenAiUsageBucket<TUsageResult>[];
  has_more: boolean;
  next_page: string | null;
};
