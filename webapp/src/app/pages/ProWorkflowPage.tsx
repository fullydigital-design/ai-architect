import { useCallback, useState, useRef } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  BackgroundVariant,
  Node,
  OnConnect,
  NodeChange,
  EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import '@/styles/reactflow.css';
import { ArrowLeft, Play, Save, Sparkles } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { workflowNodeTypes } from '@/app/components/workflow/nodeTypes';
import { NodeLibrary } from '@/app/components/workflow/NodeLibrary';
import { SettingsPanel } from '@/app/components/workflow/SettingsPanel';
import { HandleLegend } from '@/app/components/workflow/HandleLegend';
import { TemplateDropdown } from '@/app/components/workflow/TemplateDropdown';
import { EmptyStateTemplates } from '@/app/components/workflow/EmptyStateTemplates';
import { getNodeDefinition } from '@/app/components/workflow/nodeDefinitions';
import { isValidConnection, getConnectionError, HANDLE_COLORS, DataType } from '@/app/components/workflow/types';
import { defaultEdgeOptions } from '@/app/components/workflow/customEdgeStyles';
import { WorkflowTemplate } from '@/app/components/workflow/templates';
import { toast } from 'sonner';

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

let nodeId = 0;
const getNodeId = () => `node_${nodeId++}`;

export function ProWorkflowPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Use refs to always get current state
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  
  // Update refs when state changes
  nodesRef.current = nodes;
  edgesRef.current = edges;

  // Update node data - MUST BE DEFINED FIRST
  const handleUpdateNode = useCallback((nodeId: string, data: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const newData = { 
            ...data, 
            type: node.data.type || data.type,
            onUpdate: handleUpdateNode
          };
          
          if (node.type === 'textInput') {
            if (!newData.computedText && newData.text) {
              newData.computedText = newData.text;
            }
          }
          
          setSelectedNode((current) => 
            current?.id === nodeId ? { ...current, data: newData } : current
          );
          
          if (node.type === 'textInput') {
            setTimeout(() => {
              recalculateAndPropagateText(nodeId, newData);
            }, 0);
          }
          
          return {
            ...node,
            data: newData,
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Recalculate text for a node and propagate
  const recalculateAndPropagateText = useCallback((nodeId: string, nodeData: any) => {
    setNodes((currentNodes) => {
      const currentEdges = edgesRef.current;
      const incomingEdges = currentEdges.filter(e => e.target === nodeId);
      
      let inputText = '';
      incomingEdges.forEach(edge => {
        const sourceNode = currentNodes.find(n => n.id === edge.source);
        if (sourceNode && sourceNode.type === 'textInput') {
          const sourceText = sourceNode.data.computedText || sourceNode.data.text || '';
          inputText += sourceText;
        }
      });
      
      const ownText = nodeData.text || '';
      const computedText = inputText + ownText;
      
      setTimeout(() => {
        const outgoingEdges = currentEdges.filter(e => e.source === nodeId);
        outgoingEdges.forEach(edge => {
          const targetNode = nodesRef.current.find(n => n.id === edge.target);
          if (targetNode) {
            if (targetNode.type === 'textInput') {
              recalculateAndPropagateText(targetNode.id, targetNode.data);
            } else if (targetNode.type === 'apiKey') {
              recalculateApiKeyInputs(targetNode.id);
            }
          }
        });
      }, 0);
      
      return currentNodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              text: nodeData.text || '',
              inputText: inputText,
              computedText: computedText,
              onUpdate: handleUpdateNode,
            },
          };
        }
        return node;
      });
    });
  }, [handleUpdateNode]);

  // Recalculate API Key by summing ALL incoming text inputs
  const recalculateApiKeyInputs = useCallback((apiKeyNodeId: string) => {
    const incomingEdges = edgesRef.current.filter(e => e.target === apiKeyNodeId);
    
    let fullApiKey = '';
    incomingEdges.forEach(edge => {
      const sourceNode = nodesRef.current.find(n => n.id === edge.source);
      if (sourceNode && sourceNode.type === 'textInput') {
        const sourceText = sourceNode.data.computedText || sourceNode.data.text || '';
        fullApiKey += sourceText;
      }
    });
    
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === apiKeyNodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              apiKey: fullApiKey,
              onUpdate: handleUpdateNode,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes, handleUpdateNode]);

  // Transfer data between nodes on connection
  const transferDataBetweenNodes = useCallback((sourceNode: Node, targetNode: Node) => {
    if (targetNode.type === 'textInput') {
      setTimeout(() => {
        recalculateAndPropagateText(targetNode.id, targetNode.data);
      }, 10);
    } else if (targetNode.type === 'apiKey') {
      const sourceText = sourceNode.data.computedText || sourceNode.data.text || '';
      handleUpdateNode(targetNode.id, {
        ...targetNode.data,
        apiKey: sourceText,
      });
    } else if (targetNode.type === 'geminiFull') {
      if (sourceNode.type === 'textPrompt') {
        const sourceText = sourceNode.data.value || '';
        handleUpdateNode(targetNode.id, {
          ...targetNode.data,
          prompt: sourceText,
          promptFromConnection: true,
        });
      }
    }
  }, [handleUpdateNode, recalculateAndPropagateText]);

  // Handle drag over canvas
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop on canvas
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      
      if (!type || !reactFlowInstance) {
        return;
      }

      const nodeDefinition = getNodeDefinition(type);
      if (!nodeDefinition) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: getNodeId(),
        type,
        position,
        data: { 
          ...nodeDefinition.config,
          type: type,
          onUpdate: handleUpdateNode,
          ...(type === 'textInput' ? { 
            text: '',
            inputText: '',
            computedText: '' 
          } : {}),
          ...(type === 'imageInput' ? { 
            image: null,
            inputImage: null,
            computedImage: null 
          } : {}),
        },
      };

      setNodes((nds) => nds.concat(newNode));
      toast.success(`Added ${nodeDefinition.label} node`);
    },
    [reactFlowInstance, setNodes, handleUpdateNode]
  );

  // Validate and handle connections
  const onConnect: OnConnect = useCallback(
    (params) => {
      if (!params.source || !params.target || !params.sourceHandle || !params.targetHandle) {
        return;
      }

      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);

      if (!sourceNode || !targetNode) {
        return;
      }

      const sourceDef = getNodeDefinition(sourceNode.type);
      const targetDef = getNodeDefinition(targetNode.type);

      if (!sourceDef || !targetDef) {
        return;
      }

      const sourceHandle = sourceDef.handles.outputs.find(h => h.id === params.sourceHandle);
      const targetHandle = targetDef.handles.inputs.find(h => h.id === params.targetHandle);

      if (!sourceHandle || !targetHandle) {
        return;
      }

      if (!isValidConnection(sourceHandle.dataType, targetHandle.dataType)) {
        const errorMsg = getConnectionError(
          sourceHandle.dataType,
          targetHandle.dataType,
          sourceDef.label,
          targetDef.label
        );
        toast.error('Invalid Connection', {
          description: errorMsg,
          duration: 4000,
        });
        return;
      }

      const edgeColor = HANDLE_COLORS[sourceHandle.dataType];
      setEdges((eds) => addEdge({ 
        ...params, 
        animated: true,
        style: { stroke: edgeColor, strokeWidth: 2 },
        markerEnd: {
          type: 'arrowclosed',
          color: edgeColor,
        },
      }, eds));

      setTimeout(() => {
        transferDataBetweenNodes(sourceNode, targetNode);
      }, 50);
      
      toast.success('Connection created!');
    },
    [nodes, setEdges, transferDataBetweenNodes]
  );

  // Handle node selection
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Handle canvas click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Run workflow
  const handleRun = async () => {
    if (nodes.length === 0) {
      toast.error('No nodes in workflow', {
        description: 'Add some nodes to build your workflow first',
      });
      return;
    }

    setIsRunning(true);
    toast.info('Running workflow (Simulation Mode)...', {
      description: 'Generating mock AI responses',
    });

    try {
      const geminiNodes = nodes.filter(n => n.type === 'geminiFull' || n.type === 'gemini');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      for (const geminiNode of geminiNodes) {
        const prompt = geminiNode.data.prompt;
        const uploadedImage = geminiNode.data.uploadedImage;
        
        if (!prompt && !uploadedImage) {
          toast.warning('No prompt provided', {
            description: 'Add a prompt to the Gemini node',
          });
          continue;
        }

        const simulatedResponse = generateMockResponse(prompt, uploadedImage, geminiNode.data);
        
        const connectedEdges = edges.filter(e => e.source === geminiNode.id);
        
        for (const edge of connectedEdges) {
          const targetNode = nodes.find(n => n.id === edge.target);
          if (targetNode && targetNode.type === 'textDisplay') {
            setNodes((nds) =>
              nds.map((node) => {
                if (node.id === targetNode.id) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      result: simulatedResponse,
                    },
                  };
                }
                return node;
              })
            );
          }
        }
      }

      setIsRunning(false);
      toast.success('Workflow completed! (Simulation)', {
        description: 'Mock AI results generated successfully',
      });
    } catch (error) {
      setIsRunning(false);
      toast.error('Workflow execution error', {
        description: 'An error occurred during simulation',
      });
      console.error('Workflow error:', error);
    }
  };

  // Generate mock AI response
  const generateMockResponse = (prompt: string, image: string | null, config: any): string => {
    const hasImage = !!image;
    const goalType = config.goalType || 'general';
    
    if (hasImage) {
      return `**Image-Based Campaign Created!**

Based on the uploaded image, here's your campaign:

🎯 **Campaign Hook:**
"Luxury you can feel through the screen"

**Content Structure:**
- Opening: Close-up details
- Build: Product in context
- Reveal: Full showcase
- Close: Brand + CTA

Ready to launch! 🚀`;
    }

    return `**${prompt}**

Here's your AI-generated concept:

This is a professional response addressing your prompt. In production, this would be replaced with actual Gemini API responses.

**Key Points:**
- Professional structure
- Actionable insights
- Tailored content

**Next Steps:**
1. Review the content
2. Make adjustments
3. Deploy your campaign

Would you like me to refine any section?`;
  };

  // Save workflow
  const handleSave = () => {
    const workflow = { nodes, edges };
    localStorage.setItem('pro_workflow', JSON.stringify(workflow));
    toast.success('Workflow saved!', {
      description: 'Your workflow has been saved locally',
    });
  };

  // Load template workflow
  const handleLoadTemplate = useCallback((template: WorkflowTemplate) => {
    const newNodes: Node[] = template.nodes.map((node) => ({
      ...node,
      id: getNodeId(),
      data: {
        ...node.data,
        onUpdate: handleUpdateNode,
      },
    }));

    const newEdges: Edge[] = [];
    
    for (let i = 0; i < newNodes.length - 1; i++) {
      const sourceNode = newNodes[i];
      const targetNode = newNodes[i + 1];
      
      const sourceDef = getNodeDefinition(sourceNode.type);
      const targetDef = getNodeDefinition(targetNode.type);
      
      if (!sourceDef || !targetDef) continue;
      
      if (sourceDef.handles.outputs.length === 0 || targetDef.handles.inputs.length === 0) {
        continue;
      }
      
      const sourceHandle = sourceDef.handles.outputs[0];
      const targetHandle = targetDef.handles.inputs[0];
      
      if (sourceHandle && targetHandle && isValidConnection(sourceHandle.dataType, targetHandle.dataType)) {
        const edgeColor = HANDLE_COLORS[sourceHandle.dataType];
        newEdges.push({
          id: `edge_${i}_${Date.now()}`,
          source: sourceNode.id,
          target: targetNode.id,
          sourceHandle: sourceHandle.id,
          targetHandle: targetHandle.id,
          animated: true,
          style: { stroke: edgeColor, strokeWidth: 2 },
          markerEnd: {
            type: 'arrowclosed',
            color: edgeColor,
          },
        });
      }
    }

    setNodes(newNodes);
    setEdges(newEdges);
    
    toast.success(`Loaded "${template.name}" template`, {
      description: `Added ${newNodes.length} nodes to your workflow`,
    });
  }, [setNodes, setEdges, handleUpdateNode]);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate?.('workflow-selection')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-bold">Back</span>
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900">PRO Workflow Builder</h1>
              <p className="text-xs text-gray-500 font-medium">Drag nodes to build workflows</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TemplateDropdown onSelectTemplate={handleLoadTemplate} />
          <Button
            onClick={handleSave}
            variant="outline"
            size="sm"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button
            onClick={handleRun}
            disabled={isRunning}
            size="sm"
            className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 hover:from-fuchsia-700 hover:via-purple-700 hover:to-pink-700 text-white border-0 shadow-lg shadow-purple-500/30"
          >
            <Play className="w-4 h-4 mr-2" />
            {isRunning ? 'Running...' : 'Run Workflow'}
          </Button>
          <div className="ml-2 px-2 py-1 rounded-md bg-blue-50 border border-blue-200">
            <span className="text-xs font-bold text-blue-700">🎭 Simulation Mode</span>
          </div>
        </div>
      </div>

      {/* Main Content: Sidebar + Canvas + Settings */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Node Library */}
        <NodeLibrary onDragStart={() => {}} />

        {/* Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={workflowNodeTypes}
            fitView
            className="bg-gray-50"
            deleteKeyCode="Delete"
          >
            <Controls className="!shadow-lg !border-2 !border-gray-200" />
            <MiniMap
              className="!bg-white !border-2 !border-gray-200"
              nodeColor={(node) => {
                const nodeDef = getNodeDefinition(node.type);
                return nodeDef?.color || '#6b7280';
              }}
            />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>

          {/* Helper Text Overlay - Only show when canvas is empty */}
          {nodes.length === 0 && (
            <EmptyStateTemplates onSelectTemplate={handleLoadTemplate} />
          )}
        </div>

        {/* Right Sidebar - Settings Panel */}
        <SettingsPanel
          selectedNode={selectedNode}
          onClose={() => setSelectedNode(null)}
          onUpdateNode={handleUpdateNode}
        />
      </div>

      {/* Handle Legend */}
      <HandleLegend />
    </div>
  );
}
