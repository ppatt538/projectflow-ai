import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { Task } from "@shared/schema";

const taskFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  percentComplete: z.number().min(0).max(100).default(0),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  parentTaskId?: string;
  task?: Task;
}

export function TaskDialog({ open, onOpenChange, projectId, parentTaskId, task }: TaskDialogProps) {
  const { toast } = useToast();
  const isEditing = !!task;

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      name: task?.name || "",
      description: task?.description || "",
      percentComplete: task?.percentComplete || 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TaskFormValues) => {
      return apiRequest("POST", "/api/tasks", {
        ...data,
        projectId,
        parentTaskId: parentTaskId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: parentTaskId ? "Subtask created" : "Task created" });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create task", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: TaskFormValues) => {
      return apiRequest("PATCH", `/api/tasks/${task!.id}`, {
        ...data,
        isCompleted: data.percentComplete === 100,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Task updated" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to update task", variant: "destructive" });
    },
  });

  const onSubmit = (data: TaskFormValues) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const getTitle = () => {
    if (isEditing) return "Edit Task";
    if (parentTaskId) return "Add Subtask";
    return "Add Task";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter task name" 
                      {...field}
                      data-testid="input-task-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter task description (optional)" 
                      {...field}
                      data-testid="input-task-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditing && (
              <FormField
                control={form.control}
                name="percentComplete"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Progress: {field.value}%</FormLabel>
                    <FormControl>
                      <Slider
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                        max={100}
                        step={5}
                        data-testid="slider-task-progress"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-task"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isPending}
                data-testid="button-submit-task"
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? "Save Changes" : "Create Task"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
