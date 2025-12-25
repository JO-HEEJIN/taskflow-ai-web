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
 * - Its subtasks
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

  // Child nodes: subtasks
  task.subtasks
    .filter(st => !st.isArchived) // Only show active subtasks
    .forEach((subtask) => {
      nodes.push({
        id: subtask.id,
        type: 'subtaskNode',
        data: {
          label: subtask.title,
          subtask
        },
        position: { x: 0, y: 0 },
      });

      // Edge from task to subtask
      edges.push({
        id: `${task.id}-${subtask.id}`,
        source: task.id,
        target: subtask.id,
        type: 'smoothstep',
        style: { stroke: '#9ca3af', strokeWidth: 2 },
      });

      // Linked tasks (spawned from subtasks)
      if (subtask.linkedTaskId) {
        const linkedTask = allTasks.find((t) => t.id === subtask.linkedTaskId);
        if (linkedTask) {
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
