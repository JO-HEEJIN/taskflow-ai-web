'use client';

import { useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useTaskStore } from '@/store/taskStore';
import { buildGraphData } from './graphUtils';
import { TaskNode } from './TaskNode';
import { SubtaskNode } from './SubtaskNode';

interface TaskMindMapProps {
  taskId: string;
}

// Register custom node types
const nodeTypes = {
  taskNode: TaskNode,
  subtaskNode: SubtaskNode,
};

export function TaskMindMap({ taskId }: TaskMindMapProps) {
  const { tasks } = useTaskStore();

  // Find the current task
  const task = tasks.find((t) => t.id === taskId);

  // Build graph data
  const { nodes, edges } = useMemo(() => {
    if (!task) return { nodes: [], edges: [] };
    return buildGraphData(task, tasks);
  }, [task, tasks]);

  if (!task) {
    return (
      <div className="w-full h-96 flex items-center justify-center text-gray-400">
        <p>Task not found</p>
      </div>
    );
  }

  if (task.subtasks.filter(st => !st.isArchived).length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-lg mb-2">No subtasks yet</p>
          <p className="text-sm">Mind map will appear when you add subtasks</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-96 border border-gray-200 rounded-lg overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
        }}
        minZoom={0.5}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e5e7eb" gap={16} />
        <Controls className="bg-white border border-gray-300 rounded-lg shadow-sm" />
        <MiniMap
          className="bg-gray-50 border border-gray-300 rounded-lg"
          nodeColor={(node: Node) => {
            if (node.data.isCenter) return '#2563eb';
            if (node.data.isLinked) return '#60a5fa';
            if (node.type === 'subtaskNode') return '#e5e7eb';
            return '#d1d5db';
          }}
        />

        <Panel position="top-right" className="bg-white border border-gray-200 rounded-lg p-3 text-xs text-gray-600 shadow-sm m-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary-600 rounded" />
              <span>Current Task</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-200 rounded" />
              <span>Subtask</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-400 rounded" />
              <span>Linked Task</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
