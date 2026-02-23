import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProjectBar } from "@/components/project-bar";
import { AIChatDialog } from "@/components/ai-chat-dialog";
import { ProjectDialog } from "@/components/project-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Sparkles, FolderKanban, AlertCircle } from "lucide-react";
import type { ProjectWithTasks, Category } from "@shared/schema";

export default function Home() {
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const { data: projects, isLoading: projectsLoading, error: projectsError } = useQuery<ProjectWithTasks[]>({
    queryKey: ["/api/projects"],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const groupedProjects = (projects || []).reduce((acc, project) => {
    const categoryName = project.category?.name || "Uncategorized";
    if (!acc[categoryName]) {
      acc[categoryName] = {
        color: project.category?.color || "#6B7280",
        projects: []
      };
    }
    acc[categoryName].projects.push(project);
    return acc;
  }, {} as Record<string, { color: string; projects: ProjectWithTasks[] }>);

  const totalProjects = projects?.length || 0;
  const completedProjects = projects?.filter(p => p.percentComplete === 100).length || 0;
  const activeProjects = projects?.filter(p => p.status === "active" && p.percentComplete < 100).length || 0;

  const usedCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    projects?.forEach(p => {
      if (p.categoryId) ids.add(p.categoryId);
    });
    return ids;
  }, [projects]);

  if (projectsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">ProjectFlow AI</h1>
                  <p className="text-sm text-muted-foreground">Loading projects...</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8" data-testid="container-loading">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" data-testid={`skeleton-project-${i}`} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (projectsError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="container-error">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold" data-testid="text-error-title">Failed to load projects</h2>
          <p className="text-muted-foreground" data-testid="text-error-message">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold" data-testid="text-app-title">ProjectFlow AI</h1>
                <p className="text-sm text-muted-foreground" data-testid="text-project-stats">
                  {totalProjects} projects · {activeProjects} active · {completedProjects} completed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => setAiDialogOpen(true)}
                data-testid="button-open-ai-chat"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Assistant
              </Button>
              <Button 
                onClick={() => setProjectDialogOpen(true)}
                data-testid="button-add-project"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8" data-testid="container-main">
        {Object.keys(groupedProjects).length === 0 ? (
          <div className="text-center py-20 space-y-4" data-testid="container-empty-state">
            <FolderKanban className="w-16 h-16 text-muted-foreground/30 mx-auto" />
            <h2 className="text-xl font-semibold text-muted-foreground" data-testid="text-empty-title">No projects yet</h2>
            <p className="text-muted-foreground max-w-md mx-auto" data-testid="text-empty-description">
              Create your first project to get started. The AI assistant can help you organize tasks and track progress.
            </p>
            <Button 
              onClick={() => setProjectDialogOpen(true)}
              data-testid="button-add-first-project"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Project
            </Button>
          </div>
        ) : (
          <div className="space-y-8" data-testid="container-projects">
            {Object.entries(groupedProjects).map(([categoryName, { color, projects: categoryProjects }]) => (
              <section key={categoryName} className="space-y-3" data-testid={`section-category-${categoryName.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="flex items-center gap-2 pb-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: color }}
                    data-testid={`indicator-category-color-${categoryName.toLowerCase().replace(/\s+/g, '-')}`}
                  />
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide" data-testid={`text-category-name-${categoryName.toLowerCase().replace(/\s+/g, '-')}`}>
                    {categoryName}
                  </h2>
                  <span className="text-xs text-muted-foreground" data-testid={`text-category-count-${categoryName.toLowerCase().replace(/\s+/g, '-')}`}>
                    ({categoryProjects.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {categoryProjects.map(project => (
                    <ProjectBar
                      key={project.id}
                      project={project}
                      isExpanded={expandedProjects.has(project.id)}
                      onToggle={() => toggleProject(project.id)}
                      categories={categories || []}
                      usedCategoryIds={usedCategoryIds}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <AIChatDialog 
        open={aiDialogOpen} 
        onOpenChange={setAiDialogOpen}
        projects={projects || []}
      />

      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        categories={categories || []}
        usedCategoryIds={usedCategoryIds}
      />
    </div>
  );
}
