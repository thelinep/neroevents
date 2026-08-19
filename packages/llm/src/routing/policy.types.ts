export type TaskType = 'planning' | 'coding' | 'testing' | 'debugging' | 'reviewing' | 'deploying';

export interface RoutingDecision {
  provider: string;
  model: string;
  reason: string;
  confidence: number;
}
