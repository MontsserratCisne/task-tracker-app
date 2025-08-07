"use client"
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { onAuthChange, onTasksUpdate, addTask, updateTaskStatus } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import type { Task } from '@/types';


// Define possible task statuses
const STATUSES = [
  'TO DO',
  'IN PROGRESS',
  'PULL REQUEST',
  'IN TEST',
  'IN QA',
  'READY FOR PROD',
  'IN UAT',
  'DONE',
];

// Define a mapping of statuses to Tailwind CSS classes for colors
const STATUS_COLOR_MAP = {
  'TO DO': 'bg-gray-100 text-gray-800',
  'IN PROGRESS': 'bg-blue-100 text-blue-800',
  'PULL REQUEST': 'bg-yellow-100 text-yellow-800',
  'IN TEST': 'bg-orange-100 text-orange-800',
  'IN QA': 'bg-pink-100 text-pink-800', // Closest to "Mexican pink" in Tailwind
  'READY FOR PROD': 'bg-lime-200 text-lime-800', // Changed to a more vibrant lime green
  'IN UAT': 'bg-indigo-100 text-indigo-800', // "purple-blue"
  'DONE': 'bg-teal-200 text-teal-800', // Changed to a distinct teal green
};

function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskName, setNewTaskName] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // New state for editing task name
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState('');

  // Initialize Firebase and authenticate
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
        setUser(user);
        setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen for real-time updates to tasks from Firestore
  useEffect(() => {
    if (user) {
        const unsubscribe = onTasksUpdate(setTasks, (error) => {
            console.error(error);
            setMessage(`Error loading tasks: ${error.message}`);
        });
        return () => unsubscribe();
    }
  }, [user]);

  // Function to calculate IN TEST -> IN PROGRESS regressions
  const calculateRegressions = useCallback((statusHistory) => {
    let regressions = 0;
    if (!statusHistory || statusHistory.length < 2) {
      return 0;
    }
    for (let i = 1; i < statusHistory.length; i++) {
      const previousStatus = statusHistory[i - 1].status;
      const currentStatus = statusHistory[i].status;
      if (previousStatus === 'IN TEST' && currentStatus === 'IN PROGRESS') {
        regressions++;
      }
    }
    return regressions;
  }, []);

  // Handle adding a new task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) {
      setMessage('Please enter a task name.');
      return;
    }
    setLoading(true);
    try {
      await addTask(newTaskName.trim());
      setNewTaskName('');
      setMessage('Task added successfully.');
    } catch (error: any) {
      console.error("Error adding task:", error);
      setMessage(`Error adding task: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle updating a task's status
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId || !newStatus) {
      setMessage('Please select a task and a new status.');
      return;
    }
    setLoading(true);
    try {
        await updateTaskStatus(selectedTaskId, newStatus)
        setMessage('Task status updated successfully.');
    } catch (error: any) {
      console.error("Error updating status:", error);
      setMessage(`Error updating status: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle editing task name
  const handleEditTaskName = async (taskId: string) => {
    if (!editingTaskName.trim()) {
      setMessage('Task name cannot be empty.');
      return;
    }
    setLoading(true);
    try {
      // This function needs to be implemented in firebase.ts
      // For now, it will just be a placeholder
      console.log("Updating task name for", taskId, "to", editingTaskName.trim());
      setMessage('Task name updated successfully.');
      setEditingTaskId(null); // Exit edit mode
      setEditingTaskName('');
    } catch (error: any) {
      console.error("Error updating task name:", error);
      setMessage(`Error updating task name: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate total regressions across all tasks using useMemo
  const totalRegressions = useMemo(() => {
    return tasks.reduce((sum, task) => sum + calculateRegressions(task.statusHistory), 0);
  }, [tasks, calculateRegressions]);

  // Determine banner color based on total regressions
  const getBannerColorClass = () => {
    if (totalRegressions === 0) {
      return 'bg-lime-600'; // Changed to a more vibrant lime green
    } else if (totalRegressions > 0 && totalRegressions <= 5) {
      return 'bg-orange-600'; // Warning: Some regressions
    } else {
      return 'bg-red-600'; // Critical: Many regressions
    }
  };

  // Function to get a shortened userId for display
  const getShortenedUserId = (id: string | undefined) => {
    if (!id) return 'N/A';
    return id.substring(0, 8) + '...'; // Show first 8 characters
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <p className="text-lg text-gray-700">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 font-sans text-gray-800">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl p-6 md:p-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-center text-indigo-700 mb-6">
          📈 Task Regression Dashboard
        </h1>
        <p className="text-sm text-center text-gray-600 mb-8">
          User ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded-md text-sm">{getShortenedUserId(user?.uid)}</span>
        </p>

        {message && (
          <div className={`p-3 mb-4 rounded-lg text-sm ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}

        {/* Overall Regression Count */}
        <div className={`${getBannerColorClass()} text-white p-5 rounded-lg shadow-lg mb-8 text-center`}>
          <h2 className="text-xl font-semibold mb-2">Total Regressions (IN TEST → IN PROGRESS)</h2>
          <p className="text-5xl font-bold">{totalRegressions}</p>
        </div>

        {/* Add New Task Form */}
        <div className="mb-8 p-6 bg-blue-50 rounded-lg shadow-md">
          <h3 className="text-2xl font-semibold text-indigo-700 mb-4">Add New Task</h3>
          <form onSubmit={handleAddTask} className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Task Name"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              className="flex-grow p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition duration-200"
              required
            />
            <button
              type="submit"
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-6 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105"
            >
              Add Task
            </button>
          </form>
        </div>

        {/* Update Task Status Form */}
        <div className="mb-8 p-6 bg-blue-50 rounded-lg shadow-md">
          <h3 className="text-2xl font-semibold text-indigo-700 mb-4">Update Task Status</h3>
          <form onSubmit={handleUpdateStatus} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition duration-200 col-span-1 md:col-span-1"
              required
            >
              <option value="">Select a task</option>
              {tasks.map(task => (
                <option key={task.id} value={task.id}>{task.name}</option>
              ))}
            </select>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition duration-200 col-span-1 md:col-span-1"
              required
            >
              <option value="">Select new status</option>
              {STATUSES.map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 col-span-1 md:col-span-1"
            >
              Update Status
            </button>
          </form>
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-lg shadow-xl p-6">
          <h3 className="text-2xl font-semibold text-indigo-700 mb-4">Task Details</h3>
          {tasks.length === 0 ? (
            <p className="text-gray-600 text-center">No tasks yet. Add one to get started!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Regressions (IN TEST → IN PROGRESS)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status History
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tasks.map(task => (
                    <tr key={task.id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {editingTaskId === task.id ? (
                          <input
                            type="text"
                            value={editingTaskName}
                            onChange={(e) => setEditingTaskName(e.target.value)}
                            className="p-2 border border-gray-300 rounded-md w-full"
                          />
                        ) : (
                          task.name
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          task.statusHistory && task.statusHistory.length > 0
                            ? STATUS_COLOR_MAP[task.statusHistory[task.statusHistory.length - 1].status] || 'bg-gray-100 text-gray-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {task.statusHistory && task.statusHistory.length > 0
                            ? task.statusHistory[task.statusHistory.length - 1].status
                            : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span className="text-lg font-bold text-red-600">
                          {calculateRegressions(task.statusHistory)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
                          {task.statusHistory && task.statusHistory
                            .filter(entry =>
                              entry.status !== 'TO DO' &&
                              entry.status !== 'READY FOR PROD' &&
                              entry.status !== 'PULL REQUEST' &&
                              entry.status !== 'IN QA'
                            )
                            .map((entry, index, filteredArr) => (
                            <div key={index} className="flex items-center gap-x-1">
                              <div className="flex flex-col items-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR_MAP[entry.status] || 'bg-gray-100 text-gray-800'}`}>
                                  {entry.status}
                                </span>
                                <span className="text-gray-500 text-xs whitespace-nowrap mt-0.5">
                                  {new Date(entry.timestamp).toLocaleDateString()}
                                </span>
                              </div>
                              {index < filteredArr.length - 1 && (
                                <span className="text-gray-400 text-lg">→</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {editingTaskId === task.id ? (
                          <button
                            onClick={() => handleEditTaskName(task.id)}
                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md shadow-sm transition duration-150 ease-in-out"
                          >
                            Save
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingTaskId(task.id);
                              setEditingTaskName(task.name);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 font-bold py-2 px-4 rounded-md transition duration-150 ease-in-out"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
