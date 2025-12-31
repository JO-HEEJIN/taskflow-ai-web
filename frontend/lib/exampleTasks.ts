/**
 * Realistic ADHD Task Examples
 * These represent common scenarios where ADHD individuals struggle with task initiation
 */

export interface ExampleTask {
  id: string;
  title: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
  estimatedTime: string;
}

export const exampleTasks: ExampleTask[] = [
  {
    id: 'tax-filing',
    title: 'File Tax Return',
    description: 'Deadline in 3 days. Need to gather documents, fill forms, and submit.',
    urgency: 'high',
    estimatedTime: '2-3 hours',
  },
  {
    id: 'job-interview',
    title: 'Prepare for Job Interview',
    description: 'Interview tomorrow at 9 AM. Research company, practice answers, pick outfit.',
    urgency: 'high',
    estimatedTime: '2 hours',
  },
  {
    id: 'assignment-due',
    title: 'Finish Assignment',
    description: "Due tomorrow and haven't started. Need to research, write, and proofread.",
    urgency: 'high',
    estimatedTime: '4-6 hours',
  },
  {
    id: 'doctor-appointment',
    title: 'Prepare for Doctor Appointment',
    description: 'Appointment in 1 hour. Find insurance card, write symptom notes, gather meds list.',
    urgency: 'high',
    estimatedTime: '30 minutes',
  },
  {
    id: 'travel-packing',
    title: 'Pack for Trip',
    description: 'Leaving tomorrow morning. Pack clothes, toiletries, check documents, charge devices.',
    urgency: 'medium',
    estimatedTime: '1-2 hours',
  },
  {
    id: 'daily-routine',
    title: 'Complete Daily Routine',
    description: 'Clean room, exercise, finish work tasks, and get to bed on time.',
    urgency: 'medium',
    estimatedTime: '3-4 hours',
  },
];
