'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTaskStore } from '@/store/taskStore';
import { useCoachStore } from '@/store/useCoachStore';
import { Settings } from 'lucide-react';
import { TodayTab } from './TodayTab';
import { TomorrowTab } from './TomorrowTab';
import { WeeklyTab } from './WeeklyTab';
import { ZodiacIcon } from './ZodiacIcon';
import { EmptyStateWithActions } from '@/components/onboarding/EmptyStateWithActions';

type TabType = 'today' | 'tomorrow' | 'weekly';

interface MobileTaskViewProps {
  onSettingsClick?: () => void;
  onTaskSelect?: (taskId: string) => void;
}

export function MobileTaskView({ onSettingsClick, onTaskSelect }: MobileTaskViewProps) {
  const { tasks, generateAIBreakdown, addSubtasks, createTask, createTaskWithAutoFocus } = useTaskStore();
  const { enterFocusMode } = useCoachStore();
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    tasks.length > 0 ? tasks[0].id : null
  );
  const [showConstellation, setShowConstellation] = useState(false);
  const [showTitlePopup, setShowTitlePopup] = useState(false);
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [showTaskInput, setShowTaskInput] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showFocusModeHint, setShowFocusModeHint] = useState(false);
  const [showCompletionAnimation, setShowCompletionAnimation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  // Auto-navigate to constellation view when all tasks are completed
  useEffect(() => {
    const allCompleted = tasks.length > 0 && tasks.every(t => t.status === 'completed');
    if (allCompleted && activeTab !== 'weekly') {
      // Small delay for smooth transition
      setTimeout(() => {
        setActiveTab('weekly');
        setShowConstellation(true);
        setShowCompletionAnimation(true);
      }, 500);
    }
  }, [tasks, activeTab]);

  // Calculate task duration from subtasks
  const calculateDuration = (task: any): string => {
    const totalMinutes = task.subtasks.reduce((sum: number, st: any) => {
      return sum + (st.estimatedMinutes || 5);
    }, 0);

    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Truncate title if too long
  const truncateTitle = (title: string, maxLength: number = 30) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  // Handle AI Breakdown and Focus Mode
  const handleBreakdownAndFocus = async () => {
    if (!selectedTask || isBreakingDown) return;

    try {
      setIsBreakingDown(true);

      // Step 1: Generate AI breakdown
      const result = await generateAIBreakdown(selectedTask.id);

      // Step 2: Add subtasks
      if (result.suggestions && result.suggestions.length > 0) {
        await addSubtasks(selectedTask.id, result.suggestions);

        // Step 3: Show hint to click Focus Mode tab
        setShowFocusModeHint(true);
      }
    } catch (error) {
      console.error('Failed to breakdown and focus:', error);
    } finally {
      setIsBreakingDown(false);
    }
  };

  // Handle Weekly tab - show full constellation view
  const handleWeeklyClick = () => {
    setShowConstellation(true);
  };

  // Handle creating a sample task
  const handleCreateSample = async (sampleTask: string) => {
    try {
      // Create task only (no auto AI breakdown)
      await createTask(sampleTask, 'Sample task to get you started');

      // Find the newly created task (it will be the last one added)
      // Wait a bit for the store to update
      setTimeout(() => {
        const newTask = useTaskStore.getState().tasks[useTaskStore.getState().tasks.length - 1];
        if (newTask) {
          setSelectedTaskId(newTask.id);
          setActiveTab('today');
        }
      }, 100);
    } catch (error) {
      console.error('Failed to create sample task:', error);
    }
  };

  // Handle creating own task
  const handleCreateOwn = () => {
    setShowTaskInput(true);
  };

  // Handle submitting new task
  const handleSubmitTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      await createTask(newTaskTitle.trim());
      setNewTaskTitle('');
      setShowTaskInput(false);

      // Find the newly created task and navigate to it
      setTimeout(() => {
        const newTask = useTaskStore.getState().tasks[useTaskStore.getState().tasks.length - 1];
        if (newTask) {
          setSelectedTaskId(newTask.id);
          setActiveTab('today'); // Navigate to AI Breakdown tab
          setShowConstellation(false); // Ensure we're not in constellation view
        }
      }, 100);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  // Show empty state when no tasks
  if (tasks.length === 0 && !showTaskInput) {
    return (
      <div className="min-h-screen w-full relative overflow-x-hidden overflow-y-auto bg-gradient-to-b from-[#050715] to-[#0F1230]">
        {/* Settings Icon - Top Right */}
        <button
          onClick={onSettingsClick}
          className="absolute top-8 right-6 z-50 p-1.5 text-white/50 hover:text-white/70 transition-colors"
        >
          <Settings className="w-5 h-5" strokeWidth={1.5} />
        </button>

        {/* Empty State */}
        <div className="flex items-center justify-center min-h-screen px-4">
          <EmptyStateWithActions
            onCreateSample={handleCreateSample}
            onCreateOwn={handleCreateOwn}
          />
        </div>
      </div>
    );
  }

  // Show task input modal
  if (showTaskInput) {
    return (
      <div className="min-h-screen w-full relative overflow-x-hidden overflow-y-auto bg-gradient-to-b from-[#050715] to-[#0F1230]">
        {/* Settings Icon - Top Right */}
        <button
          onClick={onSettingsClick}
          className="absolute top-8 right-6 z-50 p-1.5 text-white/50 hover:text-white/70 transition-colors"
        >
          <Settings className="w-5 h-5" strokeWidth={1.5} />
        </button>

        {/* Task Input Modal */}
        <div className="flex items-center justify-center min-h-screen px-6">
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">Create New Task</h2>
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmitTask();
                }
              }}
              placeholder="Enter task title..."
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-purple-400 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTaskInput(false);
                  setNewTaskTitle('');
                }}
                className="flex-1 py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitTask}
                disabled={!newTaskTitle.trim()}
                className="flex-1 py-3 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If Weekly tab is active, show full constellation view
  if (showConstellation || activeTab === 'weekly') {
    return (
      <WeeklyTab
        tasks={tasks}
        selectedTaskId={selectedTaskId}
        onTaskClick={(id) => {
          setSelectedTaskId(id);
          setShowConstellation(false);
          setActiveTab('today');
          setShowCompletionAnimation(false);
        }}
        onBack={() => {
          setShowConstellation(false);
          setActiveTab('today');
          setShowCompletionAnimation(false);
        }}
        onSettingsClick={onSettingsClick}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCreateTask={() => {
          setShowTaskInput(true);
          setShowConstellation(false);
          setShowCompletionAnimation(false);
        }}
        showCompletionAnimation={showCompletionAnimation}
      />
    );
  }

  return (
    <div className="min-h-screen w-full relative overflow-x-hidden overflow-y-auto bg-gradient-to-b from-[#050715] to-[#0F1230]">
      {/* Background stars - subtle scattered */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-px h-px bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.3 + 0.2,
            }}
          />
        ))}
      </div>

      {/* Settings Icon - Top Right */}
      <button
        onClick={onSettingsClick}
        className="absolute top-8 right-6 z-50 p-1.5 text-white/50 hover:text-white/70 transition-colors"
      >
        <Settings className="w-5 h-5" strokeWidth={1.5} />
      </button>

      {/* Header Section (Top 20%) */}
      <div className="relative z-10 flex flex-col items-center pt-[40px] pb-3">
        {/* Title - truncated with click to expand */}
        <h1
          onClick={() => selectedTask && selectedTask.title.length > 30 && setShowTitlePopup(true)}
          className={`text-[16px] font-bold text-white mb-2 text-center px-4 ${
            selectedTask && selectedTask.title.length > 30 ? 'cursor-pointer' : ''
          }`}
        >
          {selectedTask ? truncateTitle(selectedTask.title) : 'No Task'}
        </h1>

        {/* Subtitle */}
        <p className="text-[14px] text-[#8F90A6] mb-6">
          {selectedTask ? calculateDuration(selectedTask) : '0 min'}
        </p>


        {/* Icon Selector (Horizontal Scroll) */}
        <div className="flex items-center justify-center gap-6 px-8 relative">
          {/* Show up to 5 tasks with 01.png ~ 05.png */}
          {tasks.slice(0, 5).map((task, idx) => {
            const isActive = task.id === selectedTaskId;
            const iconNumber = String(idx + 1).padStart(2, '0'); // 01, 02, 03, 04, 05

            if (isActive) {
              // Active item (center) - with dashed circle and sparkle animation
              return (
                <div key={task.id} className="relative">
                  {/* Sparkle effect */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    animate={{
                      boxShadow: [
                        '0 0 0px rgba(192, 132, 252, 0)',
                        '0 0 20px rgba(192, 132, 252, 0.8)',
                        '0 0 0px rgba(192, 132, 252, 0)',
                      ],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <div
                    className="w-[60px] h-[60px] rounded-full border border-dashed flex items-center justify-center relative z-10"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.3)', borderWidth: '1px' }}
                  >
                    <motion.img
                      src={`/${iconNumber}.png`}
                      alt={task.title}
                      className="w-[40px] h-[40px] object-contain"
                      animate={{
                        filter: [
                          'brightness(1)',
                          'brightness(1.3)',
                          'brightness(1)',
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  </div>
                </div>
              );
            } else {
              // Inactive icons
              return (
                <button
                  key={task.id}
                  onClick={() => {
                    setSelectedTaskId(task.id);
                  }}
                  className="transition-all opacity-60 hover:opacity-100"
                >
                  <img
                    src={`/${iconNumber}.png`}
                    alt={task.title}
                    className="w-[32px] h-[32px] object-contain"
                  />
                </button>
              );
            }
          })}
        </div>
      </div>

      {/* Main Content Card (Bottom 80%) - Bottom Sheet style */}
      <div
        className="relative z-10 mt-5 rounded-t-[30px] px-6 pt-[30px] pb-32 min-h-[75vh]"
        style={{ backgroundColor: '#080A1A' }}
      >
        {/* Tabs - horizontal scrollable */}
        <div className="overflow-x-auto -mx-6 px-6 mb-8 relative">
          <div className="flex gap-8 min-w-max">
            <button
              onClick={() => setActiveTab('today')}
              className="relative pb-2 flex-shrink-0"
            >
              <span className={`text-[16px] transition-colors whitespace-nowrap ${
                activeTab === 'today' ? 'text-white font-bold' : 'text-[#6E7084] font-normal'
              }`}>
                AI Breakdown
              </span>
              {activeTab === 'today' && (
                <div
                  className="absolute -bottom-1 left-0 h-[3px] rounded-full"
                  style={{
                    width: '100%',
                    background: 'linear-gradient(90deg, #4D6BFF 0%, #3B55D9 100%)',
                  }}
                />
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('tomorrow');
                setShowFocusModeHint(false);
              }}
              className="relative pb-2 flex-shrink-0"
            >
              <span className={`text-[16px] transition-colors whitespace-nowrap ${
                activeTab === 'tomorrow' ? 'text-white font-bold' : 'text-[#6E7084] font-normal'
              }`}>
                Focus Mode
              </span>
              {activeTab === 'tomorrow' && (
                <div
                  className="absolute -bottom-1 left-0 h-[3px] rounded-full"
                  style={{
                    width: '100%',
                    background: 'linear-gradient(90deg, #4D6BFF 0%, #3B55D9 100%)',
                  }}
                />
              )}
              {/* Sparkle effect on Focus Mode tab when hint is shown */}
              {showFocusModeHint && (
                <motion.div
                  className="absolute inset-0 -m-2 rounded-lg"
                  animate={{
                    boxShadow: [
                      '0 0 0px rgba(77, 107, 255, 0)',
                      '0 0 30px rgba(77, 107, 255, 1)',
                      '0 0 0px rgba(77, 107, 255, 0)',
                    ],
                    scale: [1, 1.08, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              )}
            </button>
            <button
              onClick={handleWeeklyClick}
              className="text-[16px] text-[#6E7084] font-normal hover:text-white/80 transition-colors flex-shrink-0 whitespace-nowrap"
            >
              Constellation
            </button>
          </div>
        </div>

        {/* Tab Content - Scrollable */}
        <div className="min-h-[400px] max-h-[calc(75vh-120px)] overflow-y-auto">
          {activeTab === 'today' && selectedTask && (
            <TodayTab
              task={selectedTask}
              onBreakdownAndFocus={handleBreakdownAndFocus}
            />
          )}
          {activeTab === 'tomorrow' && selectedTask && (
            <TomorrowTab task={selectedTask} />
          )}
        </div>

        {/* Loading overlay during AI breakdown */}
        {isBreakingDown && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-t-[30px] z-50">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white text-lg font-medium">Breaking down task...</p>
              <p className="text-white/60 text-sm mt-2">Preparing Focus Mode</p>
            </div>
          </div>
        )}
      </div>

      {/* Title Popup - Full title on click */}
      {showTitlePopup && selectedTask && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-6"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setShowTitlePopup(false)}
        >
          <div
            className="bg-[#080A1A] border border-white/20 rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-white text-center mb-4">
              {selectedTask.title}
            </h2>
            <button
              onClick={() => setShowTitlePopup(false)}
              className="w-full py-2 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
