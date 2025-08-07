"use client";

import React, { useState, useEffect } from 'react';
import { onTasksUpdate, addTask, connectToFirebase, onAuthChange } from '@/lib/firebase';
import type { Task } from '@/types';
import type { User } from 'firebase/auth';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AddTaskForm } from '@/components/add-task-form';
import { TaskCard } from '@/components/task-card';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    try {
      connectToFirebase();

      const unsubscribeAuth = onAuthChange((firebaseUser) => {
        setUser(firebaseUser);
        if (firebaseUser) {
          setError(null);
          const unsubscribeTasks = onTasksUpdate(
            (newTasks) => {
              setTasks(newTasks);
              setLoading(false);
            },
            (err) => {
              console.error(err);
              setError("Could not fetch tasks. Check permissions and Firebase setup.");
              setLoading(false);
            }
          );
          return () => unsubscribeTasks();
        } else {
          setTasks([]);
          setLoading(true); // Wait for user to be authenticated
        }
      });

      return () => unsubscribeAuth();
    } catch (e: any) {
        console.error(e);
        setError(e.message || "Failed to connect to Firebase.");
        setLoading(false);
    }
  }, []);

  const handleAddTask = async (name: string) => {
    try {
      await addTask(name);
    } catch (error) {
      console.error("Error adding task:", error);
      toast({
        title: "Error",
        description: "Failed to add task. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
      <Card className="border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-3xl font-bold text-primary">
            Task Tracker Lite
          </CardTitle>
          <CardDescription className="font-body">A simple and reactive task management tool.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <AddTaskForm onAddTask={handleAddTask} disabled={!user || loading} />
            <Separator />
            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <TaskSkeleton key={i} />)
              ) : error ? (
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : tasks.length > 0 ? (
                tasks.map(task => <TaskCard key={task.id} task={task} />)
              ) : (
                <div className="text-center py-8 text-muted-foreground rounded-lg border-2 border-dashed">
                    <p className="font-body text-lg">No tasks yet.</p>
                    <p className="font-body text-sm">Add one to get started!</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const TaskSkeleton = () => (
    <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2 flex-grow">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-4 w-2/5" />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Skeleton className="h-10 w-full sm:w-[180px]" />
                <Skeleton className="h-10 w-10" />
            </div>
        </CardContent>
    </Card>
);
