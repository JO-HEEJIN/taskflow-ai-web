import { Task, Subtask } from '@/types';

/**
 * Node types in the 3-tier hierarchy:
 * - task: Main task (Sun/Star - largest, golden)
 * - subtask: Top-level subtask (Planet - medium, purple)
 * - atomic: Child subtask (Moon - smallest, cyan)
 */
export type NodeType = 'task' | 'subtask' | 'atomic';

/**
 * Graph node with orbital positioning
 * Designed for Obsidian-style graph: circles only, labels on hover
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
  glowColor: string; // For bloom effect
  parentId?: string;
  estimatedMinutes?: number;
  isCompleted?: boolean;
  connectedNodeIds: string[]; // For hover highlighting
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
 * Elegant color palette for night sky constellation
 * Inspired by real star colors - warm whites, soft blues
 */
const COLORS = {
  task: {
    // Bright warm white/yellow - like Sirius or Vega
    pending: { fill: '#FFF8E7', glow: 'rgba(255, 248, 231, 0.8)' },
    in_progress: { fill: '#FFE4B5', glow: 'rgba(255, 228, 181, 0.8)' },
    completed: { fill: '#98D8AA', glow: 'rgba(152, 216, 170, 0.7)' },
    draft: { fill: '#8B9DC3', glow: 'rgba(139, 157, 195, 0.5)' },
  },
  subtask: {
    // Softer blue-white - like Rigel
    pending: { fill: '#C4D4F2', glow: 'rgba(196, 212, 242, 0.5)' },
    completed: { fill: '#A8D5BA', glow: 'rgba(168, 213, 186, 0.5)' },
  },
  atomic: {
    // Very dim, almost invisible - like distant stars
    pending: { fill: '#6B7B9E', glow: 'rgba(107, 123, 158, 0.2)' },
    completed: { fill: '#7A9E7E', glow: 'rgba(122, 158, 126, 0.2)' },
  },
};

/**
 * Seeded random for consistent but varied positions
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

/**
 * Generate 3-tier hierarchical graph with organic layout
 *
 * Philosophy: "Night Sky" for Desktop
 * - Tasks are bright stars (scattered with slight randomness)
 * - Subtasks are dimmer stars (orbit with varied distances)
 * - Atomic tasks are distant stars (almost invisible, very dim)
 */
export function generateHierarchyGraph(
  tasks: Task[],
  width: number,
  height: number
): HierarchyGraph {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Base layout constants
  const TASK_SPACING = 450;
  const BASE_SUBTASK_ORBIT = 160;
  const BASE_ATOMIC_ORBIT = 55;

  // Size hierarchy
  const TASK_SIZE = 14;
  const SUBTASK_SIZE = 8;
  const ATOMIC_SIZE = 4;

  // Filter tasks to render
  const tasksToRender = tasks.filter(t => t.status !== 'draft' || t.subtasks.length > 0);

  if (tasksToRender.length === 0) {
    return { nodes, links };
  }

  // Calculate grid layout for tasks
  const cols = Math.max(1, Math.ceil(Math.sqrt(tasksToRender.length)));
  const rows = Math.ceil(tasksToRender.length / cols);

  // Center the grid
  const gridWidth = (cols - 1) * TASK_SPACING;
  const gridHeight = (rows - 1) * TASK_SPACING;
  const startX = (width - gridWidth) / 2;
  const startY = (height - gridHeight) / 2;

  tasksToRender.forEach((task, index) => {
    // 1. TASK NODE (Star)
    const col = index % cols;
    const row = Math.floor(index / cols);
    const taskX = startX + col * TASK_SPACING;
    const taskY = startY + row * TASK_SPACING;

    const taskColorKey = task.status as keyof typeof COLORS.task;
    const taskColors = COLORS.task[taskColorKey] || COLORS.task.pending;

    // Track connected node IDs for hover highlighting
    const taskConnectedIds: string[] = [];

    // Add task node
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
      color: taskColors.fill,
      glowColor: taskColors.glow,
      connectedNodeIds: taskConnectedIds, // Will be populated later
    });

    // 2. SUBTASK NODES (Planets)
    // Filter: only top-level subtasks (no parentSubtaskId), not archived
    const activeSubtasks = task.subtasks.filter(
      st => !st.isArchived && !st.parentSubtaskId
    );

    if (activeSubtasks.length === 0) return;

    const subtaskAngleStep = (Math.PI * 2) / activeSubtasks.length;
    // Add random offset per task so subtasks don't all align
    const angleOffset = (index * Math.PI) / 3;

    activeSubtasks.forEach((subtask, stIndex) => {
      // Calculate orbital position with organic randomness
      const baseSeed = index * 1000 + stIndex;
      const angleJitter = (seededRandom(baseSeed) - 0.5) * 0.4; // ±0.2 radians
      const angle = angleOffset + stIndex * subtaskAngleStep + angleJitter;

      // Vary orbit radius for organic feel (±25%)
      const orbitJitter = 0.75 + seededRandom(baseSeed + 1) * 0.5;
      const subtaskOrbit = BASE_SUBTASK_ORBIT * orbitJitter;

      const stX = taskX + Math.cos(angle) * subtaskOrbit;
      const stY = taskY + Math.sin(angle) * subtaskOrbit;

      const subtaskColors = subtask.isCompleted
        ? COLORS.subtask.completed
        : COLORS.subtask.pending;

      const subtaskConnectedIds: string[] = [task.id]; // Connected to parent task

      // Add subtask node
      nodes.push({
        id: subtask.id,
        type: 'subtask',
        title: subtask.title,
        status: subtask.isCompleted ? 'completed' : 'pending',
        data: subtask,
        x: stX,
        y: stY,
        size: SUBTASK_SIZE,
        color: subtaskColors.fill,
        glowColor: subtaskColors.glow,
        parentId: task.id,
        estimatedMinutes: subtask.estimatedMinutes,
        isCompleted: subtask.isCompleted,
        connectedNodeIds: subtaskConnectedIds, // Will add atomics later
      });

      // Track connection in task
      taskConnectedIds.push(subtask.id);

      // Link task to subtask
      links.push({
        source: task.id,
        target: subtask.id,
        type: 'task-subtask',
      });

      // 3. ATOMIC NODES (Moons) - from subtask.children OR via parentSubtaskId
      // Combine both sources of children:
      // 1. subtask.children (from modal breakdown)
      // 2. task.subtasks filtered by parentSubtaskId (from focus mode breakdown)
      const childrenFromArray = subtask.children || [];
      const childrenFromParentId = task.subtasks.filter(
        st => st.parentSubtaskId === subtask.id && !st.isArchived
      );

      // Combine and deduplicate by id
      const allChildrenMap = new Map<string, Subtask>();
      childrenFromArray.forEach(c => allChildrenMap.set(c.id, c));
      childrenFromParentId.forEach(c => allChildrenMap.set(c.id, c));
      const atomicChildren = Array.from(allChildrenMap.values());

      if (atomicChildren.length === 0) return;

      const atomicAngleStep = (Math.PI * 2) / atomicChildren.length;

      atomicChildren.forEach((atomic, atIndex) => {
        // Calculate orbital position with organic randomness
        const atomicSeed = baseSeed * 100 + atIndex;
        const atomicAngleJitter = (seededRandom(atomicSeed) - 0.5) * 0.6; // More jitter for variety
        const atomicAngle = angle + Math.PI + atIndex * atomicAngleStep + atomicAngleJitter;

        // Vary orbit radius for organic feel (±30%)
        const atomicOrbitJitter = 0.7 + seededRandom(atomicSeed + 1) * 0.6;
        const atomicOrbit = BASE_ATOMIC_ORBIT * atomicOrbitJitter;

        const atX = stX + Math.cos(atomicAngle) * atomicOrbit;
        const atY = stY + Math.sin(atomicAngle) * atomicOrbit;

        const atomicColors = atomic.isCompleted
          ? COLORS.atomic.completed
          : COLORS.atomic.pending;

        const atomicConnectedIds: string[] = [subtask.id]; // Connected to parent subtask

        nodes.push({
          id: atomic.id,
          type: 'atomic',
          title: atomic.title,
          status: atomic.isCompleted ? 'completed' : 'pending',
          data: atomic,
          x: atX,
          y: atY,
          size: ATOMIC_SIZE,
          color: atomicColors.fill,
          glowColor: atomicColors.glow,
          parentId: subtask.id,
          estimatedMinutes: atomic.estimatedMinutes,
          isCompleted: atomic.isCompleted,
          connectedNodeIds: atomicConnectedIds,
        });

        // Track connection in subtask
        subtaskConnectedIds.push(atomic.id);

        // Link subtask to atomic
        links.push({
          source: subtask.id,
          target: atomic.id,
          type: 'subtask-atomic',
        });

        // 4. NESTED CHILDREN (when atomic is broken down further)
        // Check for children of this atomic task via parentSubtaskId
        const nestedChildren = task.subtasks.filter(
          st => st.parentSubtaskId === atomic.id && !st.isArchived
        );

        if (nestedChildren.length > 0) {
          const nestedAngleStep = (Math.PI * 2) / nestedChildren.length;
          const nestedOrbit = BASE_ATOMIC_ORBIT * 0.6; // Smaller orbit for nested

          nestedChildren.forEach((nested, nIndex) => {
            const nestedSeed = atomicSeed * 100 + nIndex;
            const nestedAngleJitter = (seededRandom(nestedSeed) - 0.5) * 0.8;
            const nestedAngle = atomicAngle + Math.PI + nIndex * nestedAngleStep + nestedAngleJitter;

            const nestedOrbitJitter = 0.7 + seededRandom(nestedSeed + 1) * 0.6;
            const nX = atX + Math.cos(nestedAngle) * nestedOrbit * nestedOrbitJitter;
            const nY = atY + Math.sin(nestedAngle) * nestedOrbit * nestedOrbitJitter;

            const nestedColors = nested.isCompleted
              ? COLORS.atomic.completed
              : COLORS.atomic.pending;

            nodes.push({
              id: nested.id,
              type: 'atomic',
              title: nested.title,
              status: nested.isCompleted ? 'completed' : 'pending',
              data: nested,
              x: nX,
              y: nY,
              size: ATOMIC_SIZE, // Same size as atomic
              color: nestedColors.fill,
              glowColor: nestedColors.glow,
              parentId: atomic.id,
              estimatedMinutes: nested.estimatedMinutes,
              isCompleted: nested.isCompleted,
              connectedNodeIds: [atomic.id],
            });

            atomicConnectedIds.push(nested.id);

            links.push({
              source: atomic.id,
              target: nested.id,
              type: 'subtask-atomic',
            });
          });
        }
      });
    });
  });

  // Debug logging
  console.log(`📊 [Hierarchy Graph] Generated ${nodes.length} nodes, ${links.length} links`);
  console.log(`📊 [Hierarchy Breakdown]:`, {
    tasks: nodes.filter(n => n.type === 'task').length,
    subtasks: nodes.filter(n => n.type === 'subtask').length,
    atomics: nodes.filter(n => n.type === 'atomic').length,
  });

  return { nodes, links };
}

/**
 * Generate mobile-optimized single-task hierarchy
 * Shows only one task (solar system view) centered in viewport
 */
export function generateMobileHierarchyGraph(
  task: Task,
  width: number,
  height: number
): HierarchyGraph {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Mobile-optimized sizes (touch-friendly)
  const TASK_SIZE = 36;
  const SUBTASK_SIZE = 24;
  const ATOMIC_SIZE = 14;

  // Mobile-optimized orbit radii (fit in small screen)
  const SUBTASK_ORBIT_RADIUS = Math.min(width, height) * 0.3;
  const ATOMIC_ORBIT_RADIUS = Math.min(width, height) * 0.12;

  // Center task in viewport
  const centerX = width / 2;
  const centerY = height / 2;

  const taskColorKey = task.status as keyof typeof COLORS.task;
  const taskColors = COLORS.task[taskColorKey] || COLORS.task.pending;
  const taskConnectedIds: string[] = [];

  // Task node (Sun at center)
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
    color: taskColors.fill,
    glowColor: taskColors.glow,
    connectedNodeIds: taskConnectedIds,
  });

  // Subtask nodes (Planets)
  const activeSubtasks = task.subtasks.filter(
    st => !st.isArchived && !st.parentSubtaskId
  );

  if (activeSubtasks.length === 0) {
    return { nodes, links };
  }

  const subtaskAngleStep = (Math.PI * 2) / activeSubtasks.length;
  const startAngle = -Math.PI / 2; // Start from top

  activeSubtasks.forEach((subtask, stIndex) => {
    const angle = startAngle + stIndex * subtaskAngleStep;
    const stX = centerX + Math.cos(angle) * SUBTASK_ORBIT_RADIUS;
    const stY = centerY + Math.sin(angle) * SUBTASK_ORBIT_RADIUS;

    const subtaskColors = subtask.isCompleted
      ? COLORS.subtask.completed
      : COLORS.subtask.pending;
    const subtaskConnectedIds: string[] = [task.id];

    nodes.push({
      id: subtask.id,
      type: 'subtask',
      title: subtask.title,
      status: subtask.isCompleted ? 'completed' : 'pending',
      data: subtask,
      x: stX,
      y: stY,
      size: SUBTASK_SIZE,
      color: subtaskColors.fill,
      glowColor: subtaskColors.glow,
      parentId: task.id,
      estimatedMinutes: subtask.estimatedMinutes,
      isCompleted: subtask.isCompleted,
      connectedNodeIds: subtaskConnectedIds,
    });

    taskConnectedIds.push(subtask.id);

    links.push({
      source: task.id,
      target: subtask.id,
      type: 'task-subtask',
    });

    // Atomic nodes (Moons) - from subtask.children OR via parentSubtaskId
    const childrenFromArray = subtask.children || [];
    const childrenFromParentId = task.subtasks.filter(
      st => st.parentSubtaskId === subtask.id && !st.isArchived
    );

    // Combine and deduplicate by id
    const allChildrenMap = new Map<string, Subtask>();
    childrenFromArray.forEach(c => allChildrenMap.set(c.id, c));
    childrenFromParentId.forEach(c => allChildrenMap.set(c.id, c));
    const atomicChildren = Array.from(allChildrenMap.values());

    if (atomicChildren.length === 0) return;

    const atomicAngleStep = (Math.PI * 2) / atomicChildren.length;

    atomicChildren.forEach((atomic, atIndex) => {
      const atomicAngle = angle + Math.PI + atIndex * atomicAngleStep;
      const atX = stX + Math.cos(atomicAngle) * ATOMIC_ORBIT_RADIUS;
      const atY = stY + Math.sin(atomicAngle) * ATOMIC_ORBIT_RADIUS;

      const atomicColors = atomic.isCompleted
        ? COLORS.atomic.completed
        : COLORS.atomic.pending;

      const atomicConnectedIds: string[] = [subtask.id];

      nodes.push({
        id: atomic.id,
        type: 'atomic',
        title: atomic.title,
        status: atomic.isCompleted ? 'completed' : 'pending',
        data: atomic,
        x: atX,
        y: atY,
        size: ATOMIC_SIZE,
        color: atomicColors.fill,
        glowColor: atomicColors.glow,
        parentId: subtask.id,
        estimatedMinutes: atomic.estimatedMinutes,
        isCompleted: atomic.isCompleted,
        connectedNodeIds: atomicConnectedIds,
      });

      subtaskConnectedIds.push(atomic.id);

      links.push({
        source: subtask.id,
        target: atomic.id,
        type: 'subtask-atomic',
      });

      // Nested children (when atomic is broken down further)
      const nestedChildren = task.subtasks.filter(
        st => st.parentSubtaskId === atomic.id && !st.isArchived
      );

      if (nestedChildren.length > 0) {
        const nestedAngleStep = (Math.PI * 2) / nestedChildren.length;
        const nestedOrbit = ATOMIC_ORBIT_RADIUS * 0.6;

        nestedChildren.forEach((nested, nIndex) => {
          const nestedAngle = atomicAngle + Math.PI + nIndex * nestedAngleStep;
          const nX = atX + Math.cos(nestedAngle) * nestedOrbit;
          const nY = atY + Math.sin(nestedAngle) * nestedOrbit;

          const nestedColors = nested.isCompleted
            ? COLORS.atomic.completed
            : COLORS.atomic.pending;

          nodes.push({
            id: nested.id,
            type: 'atomic',
            title: nested.title,
            status: nested.isCompleted ? 'completed' : 'pending',
            data: nested,
            x: nX,
            y: nY,
            size: ATOMIC_SIZE,
            color: nestedColors.fill,
            glowColor: nestedColors.glow,
            parentId: atomic.id,
            estimatedMinutes: nested.estimatedMinutes,
            isCompleted: nested.isCompleted,
            connectedNodeIds: [atomic.id],
          });

          atomicConnectedIds.push(nested.id);

          links.push({
            source: atomic.id,
            target: nested.id,
            type: 'subtask-atomic',
          });
        });
      }
    });
  });

  return { nodes, links };
}

/**
 * Check if a point is within a circular hit area
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
 * Priority: atomic > subtask > task (smallest to largest)
 */
export function findNodeAtPoint(
  x: number,
  y: number,
  nodes: GraphNode[],
  hitMultiplier: number = 2.5
): GraphNode | null {
  // Check in order: atomic > subtask > task
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

/**
 * Get all connected nodes (for hover highlighting)
 */
export function getConnectedNodes(
  nodeId: string,
  nodes: GraphNode[],
  links: GraphLink[]
): Set<string> {
  const connected = new Set<string>([nodeId]);

  links.forEach(link => {
    if (link.source === nodeId) {
      connected.add(link.target);
    }
    if (link.target === nodeId) {
      connected.add(link.source);
    }
  });

  return connected;
}
