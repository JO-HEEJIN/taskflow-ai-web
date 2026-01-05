import { Task, Subtask } from '@/types';

/**
 * Node types in the 3-tier hierarchy:
 * - task: Main task (Sun)
 * - subtask: Top-level subtask (Planet)
 * - atomic: Child subtask (Moon)
 */
export type NodeType = 'task' | 'subtask' | 'atomic';

/**
 * Graph node with orbital positioning
 */
export interface GraphNode {
  id: string;
  type: NodeType;
  title: string;
  status: string;
  progress?: number;
  data: Task | Subtask;
  x: number;
  y: number;
  size: number; // Diameter in pixels
  color: string;
  parentId?: string;
  estimatedMinutes?: number;
  isCompleted?: boolean;
}

/**
 * Connection between nodes
 */
export interface GraphLink {
  source: string;
  target: string;
  type: 'task-subtask' | 'subtask-atomic';
}

export interface HierarchyGraph {
  nodes: GraphNode[];
  links: GraphLink[];
}

/**
 * Generate 3-tier hierarchical graph with orbital layout
 *
 * Philosophy: "Orion's Belt Perspective"
 * - Tasks are Suns (center, largest)
 * - Subtasks are Planets (orbit tasks)
 * - Atomic tasks are Moons (orbit subtasks)
 *
 * @param tasks - Array of tasks to visualize
 * @param width - Canvas/viewport width
 * @param height - Canvas/viewport height
 * @returns Graph data with positioned nodes and links
 */
export function generateHierarchyGraph(
  tasks: Task[],
  width: number,
  height: number
): HierarchyGraph {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Layout constants
  const TASK_SPACING = 400; // Grid spacing between tasks
  const SUBTASK_ORBIT_RADIUS = 120; // Distance from task center
  const ATOMIC_ORBIT_RADIUS = 50; // Distance from subtask center

  // Size hierarchy (desktop defaults)
  const TASK_SIZE = 60;
  const SUBTASK_SIZE = 35;
  const ATOMIC_SIZE = 15;

  // Calculate grid layout for tasks
  const tasksToRender = tasks.filter(t => t.status !== 'draft' || t.subtasks.length > 0);
  const cols = Math.ceil(Math.sqrt(tasksToRender.length));
  const rows = Math.ceil(tasksToRender.length / cols);

  // Center the grid
  const gridWidth = (cols - 1) * TASK_SPACING;
  const gridHeight = (rows - 1) * TASK_SPACING;
  const startX = (width - gridWidth) / 2;
  const startY = (height - gridHeight) / 2;

  tasksToRender.forEach((task, index) => {
    // 1. TASK NODE (Sun)
    const col = index % cols;
    const row = Math.floor(index / cols);
    const taskX = startX + (col * TASK_SPACING);
    const taskY = startY + (row * TASK_SPACING);

    const taskColor = getTaskColor(task.status);

    nodes.push({
      id: task.id,
      type: 'task',
      title: task.title,
      status: task.status,
      progress: task.progress,
      data: task,
      x: taskX,
      y: taskY,
      size: TASK_SIZE,
      color: taskColor,
    });

    // 2. SUBTASK NODES (Planets)
    const activeSubtasks = task.subtasks.filter(st => !st.isArchived && !st.parentSubtaskId);

    if (activeSubtasks.length === 0) return;

    const subtaskAngleStep = (Math.PI * 2) / activeSubtasks.length;

    activeSubtasks.forEach((subtask, stIndex) => {
      // Calculate orbital position
      const angle = stIndex * subtaskAngleStep;
      const stX = taskX + Math.cos(angle) * SUBTASK_ORBIT_RADIUS;
      const stY = taskY + Math.sin(angle) * SUBTASK_ORBIT_RADIUS;

      const subtaskColor = subtask.isCompleted ? '#22c55e' : '#A78BFA'; // Green if complete, Purple otherwise

      nodes.push({
        id: subtask.id,
        type: 'subtask',
        title: subtask.title,
        status: subtask.isCompleted ? 'completed' : 'pending',
        data: subtask,
        x: stX,
        y: stY,
        size: SUBTASK_SIZE,
        color: subtaskColor,
        parentId: task.id,
        estimatedMinutes: subtask.estimatedMinutes,
        isCompleted: subtask.isCompleted,
      });

      // Link task to subtask
      links.push({
        source: task.id,
        target: subtask.id,
        type: 'task-subtask',
      });

      // 3. ATOMIC NODES (Moons)
      const atomicChildren = subtask.children || [];

      if (atomicChildren.length === 0) return;

      const atomicAngleStep = (Math.PI * 2) / atomicChildren.length;

      atomicChildren.forEach((atomic, atIndex) => {
        // Calculate orbital position relative to subtask
        // Add offset based on parent's angle to avoid overlap
        const atomicAngle = angle + (atIndex * atomicAngleStep);
        const atX = stX + Math.cos(atomicAngle) * ATOMIC_ORBIT_RADIUS;
        const atY = stY + Math.sin(atomicAngle) * ATOMIC_ORBIT_RADIUS;

        const atomicColor = atomic.isCompleted ? '#22c55e' : '#22D3EE'; // Green if complete, Cyan otherwise

        nodes.push({
          id: atomic.id,
          type: 'atomic',
          title: atomic.title,
          status: atomic.isCompleted ? 'completed' : 'pending',
          data: atomic,
          x: atX,
          y: atY,
          size: ATOMIC_SIZE,
          color: atomicColor,
          parentId: subtask.id,
          estimatedMinutes: atomic.estimatedMinutes,
          isCompleted: atomic.isCompleted,
        });

        // Link subtask to atomic
        links.push({
          source: subtask.id,
          target: atomic.id,
          type: 'subtask-atomic',
        });
      });
    });
  });

  // Debug logging
  console.log(`📊 [Hierarchy Graph] Generated ${nodes.length} nodes, ${links.length} links`);
  console.log(`📊 [Hierarchy Breakdown]:`, {
    tasks: nodes.filter(n => n.type === 'task').length,
    subtasks: nodes.filter(n => n.type === 'subtask').length,
    atomics: nodes.filter(n => n.type === 'atomic').length,
    taskSubtaskLinks: links.filter(l => l.type === 'task-subtask').length,
    subtaskAtomicLinks: links.filter(l => l.type === 'subtask-atomic').length,
  });

  // Log sample nodes for debugging
  if (nodes.length > 0) {
    console.log(`📊 [Sample Nodes]:`, nodes.slice(0, 5).map(n => ({
      type: n.type,
      title: n.title.substring(0, 30) + '...',
      x: Math.round(n.x),
      y: Math.round(n.y),
      size: n.size,
    })));
  }

  return { nodes, links };
}

/**
 * Generate mobile-optimized single-task hierarchy
 * Shows only one task (solar system view) centered in viewport
 *
 * @param task - Single task to visualize
 * @param width - Canvas width
 * @param height - Canvas height
 * @returns Graph data for mobile view
 */
export function generateMobileHierarchyGraph(
  task: Task,
  width: number,
  height: number
): HierarchyGraph {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Mobile-optimized sizes (smaller for compact screens)
  const TASK_SIZE = 28;
  const SUBTASK_SIZE = 18;
  const ATOMIC_SIZE = 10;

  // Mobile-optimized orbit radii
  const SUBTASK_ORBIT_RADIUS = 80;
  const ATOMIC_ORBIT_RADIUS = 35;

  // Center task in viewport
  const centerX = width / 2;
  const centerY = height / 2;

  // Task node (Sun at center)
  const taskColor = getTaskColor(task.status);

  nodes.push({
    id: task.id,
    type: 'task',
    title: task.title,
    status: task.status,
    progress: task.progress,
    data: task,
    x: centerX,
    y: centerY,
    size: TASK_SIZE,
    color: taskColor,
  });

  // Subtask nodes (Planets)
  const activeSubtasks = task.subtasks.filter(st => !st.isArchived && !st.parentSubtaskId);

  if (activeSubtasks.length === 0) {
    return { nodes, links };
  }

  const subtaskAngleStep = (Math.PI * 2) / activeSubtasks.length;

  activeSubtasks.forEach((subtask, stIndex) => {
    const angle = stIndex * subtaskAngleStep;
    const stX = centerX + Math.cos(angle) * SUBTASK_ORBIT_RADIUS;
    const stY = centerY + Math.sin(angle) * SUBTASK_ORBIT_RADIUS;

    const subtaskColor = subtask.isCompleted ? '#22c55e' : '#A78BFA';

    nodes.push({
      id: subtask.id,
      type: 'subtask',
      title: subtask.title,
      status: subtask.isCompleted ? 'completed' : 'pending',
      data: subtask,
      x: stX,
      y: stY,
      size: SUBTASK_SIZE,
      color: subtaskColor,
      parentId: task.id,
      estimatedMinutes: subtask.estimatedMinutes,
      isCompleted: subtask.isCompleted,
    });

    links.push({
      source: task.id,
      target: subtask.id,
      type: 'task-subtask',
    });

    // Atomic nodes (Moons)
    const atomicChildren = subtask.children || [];

    if (atomicChildren.length === 0) return;

    const atomicAngleStep = (Math.PI * 2) / atomicChildren.length;

    atomicChildren.forEach((atomic, atIndex) => {
      const atomicAngle = angle + (atIndex * atomicAngleStep);
      const atX = stX + Math.cos(atomicAngle) * ATOMIC_ORBIT_RADIUS;
      const atY = stY + Math.sin(atomicAngle) * ATOMIC_ORBIT_RADIUS;

      const atomicColor = atomic.isCompleted ? '#22c55e' : '#22D3EE';

      nodes.push({
        id: atomic.id,
        type: 'atomic',
        title: atomic.title,
        status: atomic.isCompleted ? 'completed' : 'pending',
        data: atomic,
        x: atX,
        y: atY,
        size: ATOMIC_SIZE,
        color: atomicColor,
        parentId: subtask.id,
        estimatedMinutes: atomic.estimatedMinutes,
        isCompleted: atomic.isCompleted,
      });

      links.push({
        source: subtask.id,
        target: atomic.id,
        type: 'subtask-atomic',
      });
    });
  });

  return { nodes, links };
}

/**
 * Get color for task based on status
 */
function getTaskColor(status: string): string {
  switch (status) {
    case 'completed':
      return '#22c55e'; // Green
    case 'in_progress':
      return '#f59e0b'; // Amber
    case 'draft':
      return '#6b7280'; // Gray
    default:
      return '#FFD700'; // Gold
  }
}

/**
 * Check if a point is within a circular hit area
 * Useful for touch/click detection on nodes
 *
 * @param x - Click X coordinate
 * @param y - Click Y coordinate
 * @param nodeX - Node center X
 * @param nodeY - Node center Y
 * @param nodeSize - Node diameter
 * @param hitMultiplier - Multiplier for hit area (default 2.5 for mobile)
 * @returns True if click is within hit area
 */
export function isPointInNode(
  x: number,
  y: number,
  nodeX: number,
  nodeY: number,
  nodeSize: number,
  hitMultiplier: number = 2.5
): boolean {
  const radius = (nodeSize / 2) * hitMultiplier;
  const dx = x - nodeX;
  const dy = y - nodeY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance <= radius;
}

/**
 * Find node at given coordinates
 * Returns the smallest (most specific) node at that point
 * Priority: atomic > subtask > task
 *
 * @param x - Click X coordinate
 * @param y - Click Y coordinate
 * @param nodes - Array of graph nodes
 * @param hitMultiplier - Multiplier for hit area
 * @returns Clicked node or null
 */
export function findNodeAtPoint(
  x: number,
  y: number,
  nodes: GraphNode[],
  hitMultiplier: number = 2.5
): GraphNode | null {
  // Check in order: atomic > subtask > task (smallest to largest)
  const atomicNode = nodes.find(
    n => n.type === 'atomic' && isPointInNode(x, y, n.x, n.y, n.size, hitMultiplier)
  );
  if (atomicNode) return atomicNode;

  const subtaskNode = nodes.find(
    n => n.type === 'subtask' && isPointInNode(x, y, n.x, n.y, n.size, hitMultiplier)
  );
  if (subtaskNode) return subtaskNode;

  const taskNode = nodes.find(
    n => n.type === 'task' && isPointInNode(x, y, n.x, n.y, n.size, hitMultiplier)
  );
  return taskNode || null;
}
