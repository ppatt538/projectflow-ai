import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { TaskTree } from "./task-tree";
import { TaskDialog } from "./task-dialog";
import { ProjectDialog } from "./project-dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Lightbulb,
  CheckCircle2
} from "lucide-react";
import type { ProjectWithTasks, Category } from "@shared/schema";

interface ProjectBarProps {
  project: ProjectWithTasks;
  isExpanded: boolean;
  onToggle: () => void;
  categories: Category[];
  usedCategoryIds?: Set<string>;
}

export function ProjectBar({ project, isExpanded, onToggle, categories, usedCategoryIds }: ProjectBarProps) {
  const { toast } = useToast();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/projects/${project.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete project", variant: "destructive" });
    }
  });

  const getStatusColor = () => {
    if (project.percentComplete === 100) return "bg-green-500";
    if (project.roadblocks) return "bg-amber-500";
    if (project.status === "active") return "bg-primary";
    return "bg-muted";
  };

  const getProgressColor = () => {
    if (project.percentComplete === 100) return "bg-green-500";
    if (project.roadblocks) return "bg-amber-500";
    return "";
  };

  return (
    <div className="border rounded-md bg-card overflow-hidden" data-testid={`card-project-${project.id}`}>
      <div 
        className="flex items-center gap-3 p-3 cursor-pointer hover-elevate"
        onClick={onToggle}
        data-testid={`button-toggle-project-${project.id}`}
      >
        <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`button-expand-project-${project.id}`}>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>

        <div className={`w-2 h-8 rounded-full ${getStatusColor()}`} data-testid={`status-indicator-${project.id}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-medium truncate" data-testid={`text-project-name-${project.id}`}>
              {project.name}
            </h3>
            {project.percentComplete === 100 && (
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" data-testid={`icon-project-complete-${project.id}`} />
            )}
            {project.roadblocks && (
              <Badge variant="outline" className="text-amber-500 border-amber-500/50 flex-shrink-0" data-testid={`badge-project-blocked-${project.id}`}>
                <AlertTriangle className="w-3 h-3 mr-1" />
                Blocked
              </Badge>
            )}
            {project.aiSuggestions && (
              <Lightbulb className="w-4 h-4 text-primary flex-shrink-0" data-testid={`icon-project-suggestion-${project.id}`} />
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Progress 
              value={project.percentComplete} 
              className={`h-2 flex-1 max-w-xs ${getProgressColor()}`}
              data-testid={`progress-project-${project.id}`}
            />
            <span className="text-sm text-muted-foreground font-medium min-w-[3rem]" data-testid={`text-project-percent-${project.id}`}>
              {project.percentComplete}%
            </span>
            <span className="text-xs text-muted-foreground" data-testid={`text-project-task-count-${project.id}`}>
              {project.tasks.length} task{project.tasks.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setTaskDialogOpen(true)}
            data-testid={`button-add-task-${project.id}`}
          >
            <Plus className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-project-menu-${project.id}`}>
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditDialogOpen(true)} data-testid={`button-edit-project-${project.id}`}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => deleteMutation.mutate()}
                data-testid={`button-delete-project-${project.id}`}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t bg-background/50">
          {project.description && (
            <p className="px-4 py-2 text-sm text-muted-foreground border-b" data-testid={`text-project-description-${project.id}`}>
              {project.description}
            </p>
          )}
          {project.roadblocks && (
            <div className="px-4 py-2 bg-amber-500/10 border-b flex items-start gap-2" data-testid={`text-project-roadblock-${project.id}`}>
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Roadblock: </span>
                <span className="text-sm text-muted-foreground">{project.roadblocks}</span>
              </div>
            </div>
          )}
          {project.aiSuggestions && (
            <div className="px-4 py-2 bg-primary/5 border-b flex items-start gap-2" data-testid={`text-project-suggestion-${project.id}`}>
              <Lightbulb className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-sm font-medium text-primary">AI Suggestion: </span>
                <span className="text-sm text-muted-foreground">{project.aiSuggestions}</span>
              </div>
            </div>
          )}
          {project.tasks.length > 0 ? (
            <div className="p-3">
              <TaskTree 
                tasks={project.tasks} 
                projectId={project.id}
                level={0}
              />
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2" data-testid={`text-no-tasks-${project.id}`}>No tasks yet</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setTaskDialogOpen(true)}
                data-testid={`button-add-first-task-${project.id}`}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Task
              </Button>
            </div>
          )}
        </div>
      )}

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        projectId={project.id}
      />

      <ProjectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={project}
        categories={categories}
        usedCategoryIds={usedCategoryIds}
      />
    </div>
  );
}
