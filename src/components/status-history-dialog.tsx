"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import type { StatusHistoryEntry } from '@/types';
import { format } from 'date-fns';

interface StatusHistoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  taskName: string;
  history: StatusHistoryEntry[];
}

export function StatusHistoryDialog({ isOpen, onOpenChange, taskName, history }: StatusHistoryDialogProps) {
  const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{taskName}</DialogTitle>
          <DialogDescription className="font-body">Complete status history for this task.</DialogDescription>
        </DialogHeader>
        <Separator />
        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-headline">Status</TableHead>
                <TableHead className="font-headline text-right">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedHistory.map((entry, index) => (
                <TableRow key={index}>
                  <TableCell className="font-semibold font-body">{entry.status}</TableCell>
                  <TableCell className="text-right font-body text-sm text-muted-foreground">
                    {format(new Date(entry.timestamp), "MMM d, yyyy, h:mm:ss a")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
