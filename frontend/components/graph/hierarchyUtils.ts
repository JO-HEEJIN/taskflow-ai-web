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

  // Base layout constants - increased for better clickability
  const BASE_SUBTASK_ORBIT = 180;
  const BASE_ATOMIC_ORBIT = 80; // Increased from 55 for better spacing

  // Size hierarchy - increased atomic size for easier clicking
  const TASK_SIZE = 14;
  const SUBTASK_SIZE = 10; // Increased from 8
  const ATOMIC_SIZE = 6;   // Increased from 4

  // Filter tasks to render
  const tasksToRender = tasks.filter(t => t.status !== 'draft' || t.subtasks.length > 0);

  if (tasksToRender.length === 0) {
    return { nodes, links };
  }

  // Calculate circular layout for tasks (like stars in a galaxy)
  const centerX = width / 2;
  const centerY = height / 2;
  const taskCount = tasksToRender.length;

  // Calculate radius based on task count and screen size
  // More tasks = larger radius to prevent overlap
  const minRadius = Math.min(width, height) * 0.25;
  const maxRadius = Math.min(width, height) * 0.4;
  const baseRadius = Math.min(maxRadius, minRadius + taskCount * 30);

  // Add slight randomness for organic feel
  const angleStep = (Math.PI * 2) / taskCount;
  const startAngle = -Math.PI / 2; // Start from top

  tasksToRender.forEach((task, index) => {
    // 1. TASK NODE (Star) - Circular layout with organic variation
    const baseSeed = task.id.charCodeAt(0) + index;
    const radiusJitter = 0.85 + seededRandom(baseSeed) * 0.3; // ±15% variation
    const angleJitter = (seededRandom(baseSeed + 1) - 0.5) * 0.3; // Slight angle offset

    const angle = startAngle + index * angleStep + angleJitter;
    const radius = baseRadius * radiusJitter;

    const taskX = centerX + Math.cos(angle) * radius;
    const taskY = centerY + Math.sin(angle) * radius;

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

      // 3. RECURSIVE CHILDREN - Infinite depth support
      // Helper function to recursively add children at any depth
      const addChildrenRecursively = (
        parentSubtask: Subtask,
        parentX: number,
        parentY: number,
        parentAngle: number,
        parentConnectedIds: string[],
        depth: number,
        baseSeedOffset: number
      ) => {
        // Get children from both sources and deduplicate
        const childrenFromArray = parentSubtask.children || [];
        const childrenFromParentId = task.subtasks.filter(
          st => st.parentSubtaskId === parentSubtask.id && !st.isArchived
        );
        const allChildrenMap = new Map<string, Subtask>();
        childrenFromArray.forEach(c => allChildrenMap.set(c.id, c));
        childrenFromParentId.forEach(c => allChildrenMap.set(c.id, c));
        const children = Array.from(allChildrenMap.values());

        if (children.length === 0) return;

        // Calculate orbit and size based on depth (shrinks with each level)
        // Use gentler shrinking (75%) for better visibility at deep levels
        const depthFactor = Math.pow(0.75, depth); // Each level is 75% of previous (was 65%)
        const orbitRadius = BASE_ATOMIC_ORBIT * depthFactor;
        const nodeSize = Math.max(ATOMIC_SIZE * depthFactor, 4); // Min size 4 for clickability

        const angleStep = (Math.PI * 2) / children.length;

        children.forEach((child, childIndex) => {
          const seed = baseSeedOffset * 100 + childIndex + depth * 1000;
          // Reduced jitter for better clickability (was 0.6, now 0.3)
          const angleJitter = (seededRandom(seed) - 0.5) * 0.3;
          const childAngle = parentAngle + Math.PI + childIndex * angleStep + angleJitter;

          // More consistent orbit radius (was 0.7-1.3, now 0.85-1.15)
          const orbitJitter = 0.85 + seededRandom(seed + 1) * 0.3;
          const childX = parentX + Math.cos(childAngle) * orbitRadius * orbitJitter;
          const childY = parentY + Math.sin(childAngle) * orbitRadius * orbitJitter;

          const childColors = child.isCompleted
            ? COLORS.atomic.completed
            : COLORS.atomic.pending;

          const childConnectedIds: string[] = [parentSubtask.id];

          nodes.push({
            id: child.id,
            type: 'atomic',
            title: child.title,
            status: child.isCompleted ? 'completed' : 'pending',
            data: child,
            x: childX,
            y: childY,
            size: nodeSize,
            color: childColors.fill,
            glowColor: childColors.glow,
            parentId: parentSubtask.id,
            estimatedMinutes: child.estimatedMinutes,
            isCompleted: child.isCompleted,
            connectedNodeIds: childConnectedIds,
          });

          parentConnectedIds.push(child.id);

          links.push({
            source: parentSubtask.id,
            target: child.id,
            type: 'subtask-atomic',
          });

          // Recursively add children of this child (infinite depth)
          addChildrenRecursively(
            child,
            childX,
            childY,
            childAngle,
            childConnectedIds,
            depth + 1,
            seed
          );
        });
      };

      // Start recursive children from subtask
      addChildrenRecursively(subtask, stX, stY, angle, subtaskConnectedIds, 0, baseSeed);
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

  // Mobile-optimized sizes (touch-friendly but subtle like desktop stars)
  const TASK_SIZE = 20;    // Task as bright star (not giant circle)
  const SUBTASK_SIZE = 12; // Subtask as dimmer star - increased for touch
  const ATOMIC_SIZE = 8;   // Atomic - increased for touch (was 5)

  // Mobile-optimized orbit radii (fit in small screen)
  const SUBTASK_ORBIT_RADIUS = Math.min(width, height) * 0.3;
  const ATOMIC_ORBIT_RADIUS = Math.min(width, height) * 0.15; // Increased from 0.12

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

    // RECURSIVE CHILDREN - Infinite depth support for mobile
    const addChildrenRecursivelyMobile = (
      parentSubtask: Subtask,
      parentX: number,
      parentY: number,
      parentAngle: number,
      parentConnectedIds: string[],
      depth: number
    ) => {
      // Get children from both sources and deduplicate
      const childrenFromArray = parentSubtask.children || [];
      const childrenFromParentId = task.subtasks.filter(
        st => st.parentSubtaskId === parentSubtask.id && !st.isArchived
      );
      const allChildrenMap = new Map<string, Subtask>();
      childrenFromArray.forEach(c => allChildrenMap.set(c.id, c));
      childrenFromParentId.forEach(c => allChildrenMap.set(c.id, c));
      const children = Array.from(allChildrenMap.values());

      if (children.length === 0) return;

      // Calculate orbit and size based on depth (shrinks with each level)
      const depthFactor = Math.pow(0.75, depth); // Each level is 75% of previous (gentler shrinking)
      const orbitRadius = ATOMIC_ORBIT_RADIUS * depthFactor;
      const nodeSize = Math.max(ATOMIC_SIZE * depthFactor, 5); // Min size 5 for touch

      const angleStep = (Math.PI * 2) / children.length;

      children.forEach((child, childIndex) => {
        const childAngle = parentAngle + Math.PI + childIndex * angleStep;
        const childX = parentX + Math.cos(childAngle) * orbitRadius;
        const childY = parentY + Math.sin(childAngle) * orbitRadius;

        const childColors = child.isCompleted
          ? COLORS.atomic.completed
          : COLORS.atomic.pending;

        const childConnectedIds: string[] = [parentSubtask.id];

        nodes.push({
          id: child.id,
          type: 'atomic',
          title: child.title,
          status: child.isCompleted ? 'completed' : 'pending',
          data: child,
          x: childX,
          y: childY,
          size: nodeSize,
          color: childColors.fill,
          glowColor: childColors.glow,
          parentId: parentSubtask.id,
          estimatedMinutes: child.estimatedMinutes,
          isCompleted: child.isCompleted,
          connectedNodeIds: childConnectedIds,
        });

        parentConnectedIds.push(child.id);

        links.push({
          source: parentSubtask.id,
          target: child.id,
          type: 'subtask-atomic',
        });

        // Recursively add children of this child (infinite depth)
        addChildrenRecursivelyMobile(
          child,
          childX,
          childY,
          childAngle,
          childConnectedIds,
          depth + 1
        );
      });
    };

    // Start recursive children from subtask
    addChildrenRecursivelyMobile(subtask, stX, stY, angle, subtaskConnectedIds, 0);
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
