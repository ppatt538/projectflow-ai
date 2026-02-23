import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { TaskDialog } from "./task-dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronRight, 
  ChevronDown, 
  MoreHorizontal, 
  Plus, 
  Pencil, 
  Trash2,
  AlertTriangle,
  Lightbulb
} from "lucide-react";
import type { TaskWithChildren } from "@shared/schema";

interface TaskTreeProps {
  tasks: TaskWithChildren[];
  projectId: string;
  level: number;
  parentTaskId?: string;
}

export function TaskTree({ tasks, projectId, level, parentTaskId }: TaskTreeProps) {
  return (
    <div className="space-y-1" data-testid={`task-tree-level-${level}`}>
      {tasks.map(task => (
        <TaskItem 
          key={task.id} 
          task={task} 
          projectId={projectId}
          level={level}
        />
      ))}
    </div>
  );
}

interface TaskItemProps {
  task: TaskWithChildren;
  projectId: string;
  level: number;
}

function TaskItem({ task, projectId, level }: TaskItemProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(true);
  const [addSubtaskOpen, setAddSubtaskOpen] = useState(false);
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(task.description || "");
  const [localPercent, setLocalPercent] = useState(task.percentComplete);
  const [isDragging, setIsDragging] = useState(false);
  const descriptionInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isDragging) {
      setLocalPercent(task.percentComplete);
    }
  }, [task.percentComplete, isDragging]);

  const hasChildren = task.children.length > 0;
  const paddingLeft = level * 24;

  const updateMutation = useMutation({
    mutationFn: async (updates: { isCompleted?: boolean; percentComplete?: number; description?: string }) => {
      return apiRequest("PATCH", `/api/tasks/${task.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: () => {
      toast({ title: "Failed to update task", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/tasks/${task.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Task deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete task", variant: "destructive" });
    }
  });

  const handleToggleComplete = () => {
    const newCompleted = !task.isCompleted;
    updateMutation.mutate({ 
      isCompleted: newCompleted,
      percentComplete: newCompleted ? 100 : 0
    });
  };

  return (
    <div data-testid={`task-item-${task.id}`}>
      <div 
        className="flex items-center gap-2 py-1.5 px-2 rounded-md hover-elevate group"
        style={{ paddingLeft: `${paddingLeft + 8}px` }}
      >
        {hasChildren ? (
          <Button 
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid={`button-toggle-task-${task.id}`}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>
        ) : (
          <div className="w-6" />
        )}

        <Checkbox 
          checked={task.isCompleted}
          onCheckedChange={handleToggleComplete}
          disabled={hasChildren}
          data-testid={`checkbox-task-${task.id}`}
        />

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span 
            className={`text-sm truncate ${task.isCompleted ? "line-through text-muted-foreground" : ""}`}
            data-testid={`text-task-name-${task.id}`}
          >
            {task.name}
          </span>
          {task.roadblocks && (
            <Badge variant="outline" className="text-amber-500 border-amber-500/50 text-xs py-0" data-testid={`badge-task-blocked-${task.id}`}>
              <AlertTriangle className="w-3 h-3 mr-1" />
              Blocked
            </Badge>
          )}
          {task.aiSuggestions && (
            <Lightbulb className="w-3 h-3 text-primary flex-shrink-0" data-testid={`icon-task-suggestion-${task.id}`} />
          )}
        </div>

        <div className="flex items-center gap-2">
          <Slider
            value={[localPercent]}
            min={0}
            max={100}
            step={5}
            className="w-20"
            disabled={hasChildren}
            onValueChange={(values) => {
              setIsDragging(true);
              setLocalPercent(values[0]);
            }}
            onValueCommit={(values) => {
              setIsDragging(false);
              const newPercent = values[0];
              if (newPercent !== task.percentComplete) {
                updateMutation.mutate({ 
                  percentComplete: newPercent,
                  isCompleted: newPercent === 100
                });
              }
            }}
            data-testid={`slider-task-${task.id}`}
          />
          <span className="text-xs text-muted-foreground min-w-[2.5rem]" data-testid={`text-task-percent-${task.id}`}>
            {localPercent}%
          </span>
        </div>

        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="ghost" 
            size="icon"
            className="h-7 w-7"
            onClick={() => setAddSubtaskOpen(true)}
            data-testid={`button-add-subtask-${task.id}`}
          >
            <Plus className="w-3 h-3" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`button-task-menu-${task.id}`}>
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditTaskOpen(true)} data-testid={`button-edit-task-${task.id}`}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Task
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => deleteMutation.mutate()}
                data-testid={`button-delete-task-${task.id}`}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isExpanded && (
        <div 
          className="ml-12 mb-1"
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          {isEditingDescription ? (
            <Input
              ref={descriptionInputRef}
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              onBlur={() => {
                setIsEditingDescription(false);
                if (editedDescription !== task.description) {
                  updateMutation.mutate({ description: editedDescription });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setIsEditingDescription(false);
                  if (editedDescription !== task.description) {
                    updateMutation.mutate({ description: editedDescription });
                  }
                }
                if (e.key === "Escape") {
                  setIsEditingDescription(false);
                  setEditedDescription(task.description || "");
                }
              }}
              className="text-xs h-6 py-0 px-1"
              placeholder="Add description..."
              autoFocus
              data-testid={`input-task-description-${task.id}`}
            />
          ) : (
            <p 
              className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              onClick={() => {
                setEditedDescription(task.description || "");
                setIsEditingDescription(true);
              }}
              data-testid={`text-task-description-${task.id}`}
            >
              {task.description || <span className="italic opacity-50">Click to add description...</span>}
            </p>
          )}
        </div>
      )}

      {task.roadblocks && isExpanded && (
        <div 
          className="text-xs bg-amber-500/10 rounded px-2 py-1 ml-12 mb-1 flex items-start gap-1"
          style={{ marginLeft: `${paddingLeft + 48}px` }}
          data-testid={`text-task-roadblock-${task.id}`}
        >
          <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground">{task.roadblocks}</span>
        </div>
      )}

      {task.aiSuggestions && isExpanded && (
        <div 
          className="text-xs bg-primary/5 rounded px-2 py-1 ml-12 mb-1 flex items-start gap-1"
          style={{ marginLeft: `${paddingLeft + 48}px` }}
          data-testid={`text-task-suggestion-${task.id}`}
        >
          <Lightbulb className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground">{task.aiSuggestions}</span>
        </div>
      )}

      {isExpanded && hasChildren && (
        <TaskTree 
          tasks={task.children} 
          projectId={projectId}
          level={level + 1}
          parentTaskId={task.id}
        />
      )}

      <TaskDialog
        open={addSubtaskOpen}
        onOpenChange={setAddSubtaskOpen}
        projectId={projectId}
        parentTaskId={task.id}
      />

      <TaskDialog
        open={editTaskOpen}
        onOpenChange={setEditTaskOpen}
        projectId={projectId}
        task={task}
      />
    </div>
  );
}
