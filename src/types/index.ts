export interface StatusHistoryEntry {
  status: string;
  timestamp: number;
}

export interface Task {
  id: string;
  name: string;
  statusHistory: StatusHistoryEntry[];
  createdAt: number;
}
