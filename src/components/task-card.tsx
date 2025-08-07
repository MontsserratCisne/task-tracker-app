"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';
import { updateTaskStatus } from '@/lib/firebase';
import type { Task, StatusHistoryEntry } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { StatusHistoryDialog } from './status-history-dialog';
import { formatDistanceToNow } from 'date-fns';

const STATUS_OPTIONS = ['TO DO', 'IN PROGRESS', 'IN TEST', 'DONE'];

export function TaskCard({ task }: { task: Task }) {
  const { toast } = useToast();
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);

  // Optimistic state for status
  const [optimisticStatusHistory, setOptimisticStatusHistory] = React.useState(task.statusHistory);
  
  React.useEffect(() => {
    setOptimisticStatusHistory(task.statusHistory);
  }, [task.statusHistory]);


  const currentStatusEntry = optimisticStatusHistory[optimisticStatusHistory.length - 1];

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatusEntry.status) return;

    const previousStatusHistory = optimisticStatusHistory;
    
    // Optimistically update the UI
    const newEntry: StatusHistoryEntry = { status: newStatus, timestamp: Date.now() };
    setOptimisticStatusHistory([...optimisticStatusHistory, newEntry]);
    setIsUpdating(true);

    try {
      await updateTaskStatus(task.id, newStatus);
    } catch (error) {
      console.error("Error updating status:", error);
      // Revert the optimistic update on error
      setOptimisticStatusHistory(previousStatusHistory);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    } finally {
        setIsUpdating(false);
    }
  };
  
  const timeAgo = currentStatusEntry ? formatDistanceToNow(new Date(currentStatusEntry.timestamp), { addSuffix: true }) : 'just now';

  return (
    <>
      <Card className="transition-shadow hover:shadow-md animate-in fade-in-50">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-grow">
            <p className="font-headline font-semibold text-lg">{task.name}</p>
            {currentStatusEntry && (
              <p className="font-body text-sm text-muted-foreground">
                Status: {currentStatusEntry.status} ({timeAgo})
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select onValueChange={handleStatusChange} value={currentStatusEntry?.status} disabled={isUpdating}>
              <SelectTrigger className="w-full sm:w-[180px] font-body">
                <SelectValue placeholder="Change status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setIsHistoryOpen(true)} aria-label="View status history">
              <History className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      <StatusHistoryDialog
        isOpen={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        taskName={task.name}
        history={optimisticStatusHistory}
      />
    </>
  );
}
