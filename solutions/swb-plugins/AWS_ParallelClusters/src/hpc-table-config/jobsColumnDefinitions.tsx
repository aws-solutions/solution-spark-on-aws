import { TableProps } from '@awsui/components-react';

export const columnDefinitions: readonly TableProps.ColumnDefinition<object>[] = [
  {
    id: 'job_id',
    header: 'ID',
    cell: (e: { job_id: string }) => e.job_id,
    sortingField: 'job_id'
  },
  {
    id: 'name',
    header: 'Name',
    cell: (e: { name: string }) => e.name
  },
  {
    id: 'partition',
    header: 'Partition/Queue',
    cell: (e: { partition: string }) => e.partition
  },
  {
    id: 'nodes',
    header: 'Nodes',
    cell: (e: { nodes: string }) => e.nodes
  },
  {
    id: 'job_state',
    header: 'State',
    cell: (e: { job_state: string }) => e.job_state
  },
  {
    id: 'start_time',
    header: 'Started',
    cell: (e: { job_state: string; start_time: number }) => {
      if (['COMPLETED', 'RUNNING', 'FAILED', 'CANCELLED'].includes(e.job_state)) {
        return new Date(e.start_time * 1000).toLocaleString();
      } else {
        return 'N/A';
      }
    }
  },
  {
    id: 'end_time',
    header: 'Completed',
    cell: (e: { job_state: string; end_time: number }) => {
      if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(e.job_state)) {
        return new Date(e.end_time * 1000).toLocaleString();
      } else {
        return 'N/A';
      }
    }
  }
];

export const searchableColumns: string[] = [
  'job_id',
  'name',
  'partition',
  'nodes',
  'job_state',
  'start_time',
  'end_time'
];
