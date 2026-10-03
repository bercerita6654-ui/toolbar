export type AiAction = 'summarize' | 'action_items' | 'polish' | 'tags_and_title' | 'expand_ideas';

export interface AiTagAndTitleResult {
  title?: string;
  tags?: string[];
  summary?: string;
}

export interface AiProcessResponse {
  success: boolean;
  text?: string;
  data?: AiTagAndTitleResult;
  error?: string;
}

export async function processNoteWithAi(params: {
  action: AiAction;
  title?: string;
  content: string;
  language?: 'id' | 'en';
}): Promise<AiProcessResponse> {
  try {
    const res = await fetch('/api/ai/process-note', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP error ${res.status}`);
    }

    const data: AiProcessResponse = await res.json();
    return data;
  } catch (error: any) {
    console.error('Error calling AI note service:', error);
    return {
      success: false,
      error: error?.message || 'Gagal terhubung ke AI service',
    };
  }
}
