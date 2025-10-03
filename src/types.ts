export type Id = string | number;

export type Column = {
    id: Id;
    title: string;
}

export interface Subtask {
    id: Id;
    title: string;
    isCompleted: boolean;
  }

  export interface Campaign {
    id: Id;
    columnId: Id
    title: string;
    description: string;
    status: string;
    subtasks: Subtask[]; // List of subtasks
  }
