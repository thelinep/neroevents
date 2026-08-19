export interface Task {
  id: number; name: string; prompt: string; agent: string; type: string;
  status: 'pending' | 'running' | 'awaiting_approval' | 'applied' | 'rejected' | 'failed';
  files?: string[]; dependencies: number[]; expectedOutput?: string; result?: any; error?: string;
}
export interface ProviderResponse { content: string; usage?: any; logs?: string[]; }
