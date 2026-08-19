export type AgentTool =
  | 'filesystem.read'
  | 'filesystem.write'
  | 'git.read'
  | 'git.write'
  | 'shell.execute'
  | 'network.request';

export interface AgentSummary {
  id: string;
  name: string;
  description?: string | null;
  modelProvider: string;
  modelName: string;
  temperature: number;
  tools: AgentTool[];
  isPublic: boolean;
}
