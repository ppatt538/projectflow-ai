import { useState, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus } from "lucide-react";
import type { Project, Category } from "@shared/schema";

const projectFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
  categories: Category[];
  usedCategoryIds?: Set<string>;
}

const DEFAULT_COLORS = [
  "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#EC4899", "#06B6D4", "#84CC16"
];

export function ProjectDialog({ open, onOpenChange, project, categories, usedCategoryIds }: ProjectDialogProps) {
  const { toast } = useToast();
  const isEditing = !!project;
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState(DEFAULT_COLORS[0]);

  const filteredCategories = useMemo(() => {
    if (!usedCategoryIds || usedCategoryIds.size === 0) {
      return categories;
    }
    return categories.filter(cat => 
      usedCategoryIds.has(cat.id) || cat.id === project?.categoryId
    );
  }, [categories, usedCategoryIds, project?.categoryId]);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: project?.name || "",
      description: project?.description || "",
      categoryId: project?.categoryId || "",
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      const response = await apiRequest("POST", "/api/categories", data);
      return response.json();
    },
    onSuccess: (newCategory: Category) => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      form.setValue("categoryId", newCategory.id);
      setIsCreatingCategory(false);
      setNewCategoryName("");
      toast({ title: "Category created" });
    },
    onError: () => {
      toast({ title: "Failed to create category", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      return apiRequest("POST", "/api/projects", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project created" });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create project", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      return apiRequest("PATCH", `/api/projects/${project!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project updated" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to update project", variant: "destructive" });
    },
  });

  const onSubmit = (data: ProjectFormValues) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Project" : "Create New Project"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter project name" 
                      {...field} 
                      data-testid="input-project-name"
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
                      placeholder="Enter project description (optional)" 
                      {...field} 
                      data-testid="input-project-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  {isCreatingCategory ? (
                    <div className="space-y-3 p-3 border rounded-md bg-muted/30">
                      <Input
                        placeholder="Category name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        data-testid="input-new-category-name"
                      />
                      <div className="flex gap-1 flex-wrap">
                        {DEFAULT_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-6 h-6 rounded-full border-2 transition-all ${
                              newCategoryColor === color ? "border-foreground scale-110" : "border-transparent"
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setNewCategoryColor(color)}
                            data-testid={`button-color-${color.replace("#", "")}`}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsCreatingCategory(false);
                            setNewCategoryName("");
                          }}
                          data-testid="button-cancel-new-category"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                          onClick={() => {
                            createCategoryMutation.mutate({
                              name: newCategoryName.trim(),
                              color: newCategoryColor,
                            });
                          }}
                          data-testid="button-save-new-category"
                        >
                          {createCategoryMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                          Add Category
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-project-category">
                            <SelectValue placeholder="Select a category (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredCategories.map((category) => (
                            <SelectItem 
                              key={category.id} 
                              value={category.id}
                              data-testid={`option-category-${category.id}`}
                            >
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: category.color }}
                                />
                                {category.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-muted-foreground"
                        onClick={() => setIsCreatingCategory(true)}
                        data-testid="button-add-category"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add new category
                      </Button>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-project"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isPending}
                data-testid="button-submit-project"
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? "Save Changes" : "Create Project"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
