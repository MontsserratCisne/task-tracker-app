"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

interface AddTaskFormProps {
  onAddTask: (name: string) => Promise<void>;
  disabled?: boolean;
}

export function AddTaskForm({ onAddTask, disabled }: AddTaskFormProps) {
  const [taskName, setTaskName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim() || disabled) return;

    setIsSubmitting(true);
    await onAddTask(taskName.trim());
    setTaskName('');
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="text"
        value={taskName}
        onChange={(e) => setTaskName(e.target.value)}
        placeholder="Enter a new task..."
        disabled={disabled || isSubmitting}
        className="font-body"
        aria-label="New task name"
      />
      <Button type="submit" disabled={disabled || isSubmitting || !taskName.trim()} className="bg-accent hover:bg-accent/90 text-accent-foreground">
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Task
      </Button>
    </form>
  );
}
