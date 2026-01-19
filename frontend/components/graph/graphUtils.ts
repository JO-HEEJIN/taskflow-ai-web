import { Node, Edge } from 'reactflow';
import dagre from 'dagre';
import { Task } from '@/types';

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Build graph data from a task and all tasks in the store
 * Creates nodes for:
 * - Current task (center node)
 * - Its subtasks (with proper hierarchy via parentSubtaskId)
 * - Tasks linked from those subtasks
 */
export function buildGraphData(task: Task, allTasks: Task[]): GraphData {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Center node: current task
  nodes.push({
    id: task.id,
    type: 'taskNode',
    data: {
      label: task.title,
      task,
      isCenter: true
    },
    position: { x: 0, y: 0 }, // Will be recalculated by layout
  });

  // Get active subtasks
  const activeSubtasks = task.subtasks.filter(st => !st.isArchived);

  // Child nodes: subtasks with hierarchy support
  activeSubtasks.forEach((subtask) => {
    // Calculate depth for styling
    const depth = getSubtaskDepth(subtask, activeSubtasks);

    nodes.push({
      id: subtask.id,
      type: 'subtaskNode',
      data: {
        label: subtask.title,
        subtask,
        depth, // Pass depth for potential styling
      },
      position: { x: 0, y: 0 },
    });

    // Determine edge source: parent subtask or task
    if (subtask.parentSubtaskId) {
      // This is a child subtask - connect to parent subtask
      const parentExists = activeSubtasks.some(st => st.id === subtask.parentSubtaskId);
      if (parentExists) {
        edges.push({
          id: `${subtask.parentSubtaskId}-${subtask.id}`,
          source: subtask.parentSubtaskId,
          target: subtask.id,
          type: 'smoothstep',
          style: { stroke: '#a78bfa', strokeWidth: 2 }, // Purple for child connections
        });
      } else {
        // Parent not found, connect to task as fallback
        edges.push({
          id: `${task.id}-${subtask.id}`,
          source: task.id,
          target: subtask.id,
          type: 'smoothstep',
          style: { stroke: '#9ca3af', strokeWidth: 2 },
        });
      }
    } else {
      // Root subtask - connect directly to task
      edges.push({
        id: `${task.id}-${subtask.id}`,
        source: task.id,
        target: subtask.id,
        type: 'smoothstep',
        style: { stroke: '#9ca3af', strokeWidth: 2 },
      });
    }

    // Linked tasks (spawned from subtasks)
    if (subtask.linkedTaskId) {
      const linkedTask = allTasks.find((t) => t.id === subtask.linkedTaskId);
      if (linkedTask) {
        // Check if linked task node already exists (avoid duplicates)
        if (!nodes.some(n => n.id === linkedTask.id)) {
          nodes.push({
            id: linkedTask.id,
            type: 'taskNode',
            data: {
              label: linkedTask.title,
              task: linkedTask,
              isLinked: true
            },
            position: { x: 0, y: 0 },
          });
        }

        // Edge from subtask to linked task
        edges.push({
          id: `${subtask.id}-${linkedTask.id}`,
          source: subtask.id,
          target: linkedTask.id,
          type: 'smoothstep',
          animated: true, // Animated edge for linked tasks
          style: { stroke: '#3b82f6', strokeWidth: 2 },
        });
      }
    }
  });

  // Apply auto-layout
  return applyDagreLayout(nodes, edges);
}

/**
 * Calculate the depth of a subtask in the hierarchy
 */
function getSubtaskDepth(subtask: { parentSubtaskId?: string }, allSubtasks: { id: string; parentSubtaskId?: string }[]): number {
  let depth = 0;
  let currentParentId = subtask.parentSubtaskId;

  while (currentParentId) {
    depth++;
    const parent = allSubtasks.find(st => st.id === currentParentId);
    currentParentId = parent?.parentSubtaskId;

    // Safety check to prevent infinite loops
    if (depth > 10) break;
  }

  return depth;
}

/**
 * Apply Dagre layout algorithm to position nodes in a hierarchical tree
 */
export function applyDagreLayout(nodes: Node[], edges: Edge[]): GraphData {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: 'TB', // Top-to-bottom
    nodesep: 50,   // Horizontal spacing between nodes
    ranksep: 80,   // Vertical spacing between ranks
  });

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: 200,  // Node width
      height: 80   // Node height
    });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Run layout algorithm
  dagre.layout(dagreGraph);

  // Update node positions
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 100, // Center node (width / 2)
        y: nodeWithPosition.y - 40,  // Center node (height / 2)
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
