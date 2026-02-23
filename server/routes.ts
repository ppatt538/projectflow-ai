import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertTaskSchema, insertCategorySchema, insertConversationSchema, insertMessageSchema } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const parsed = insertCategorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const category = await storage.createCategory(parsed.data);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  app.patch("/api/categories/:id", async (req, res) => {
    try {
      const category = await storage.updateCategory(req.params.id, req.body);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      await storage.deleteCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getAllProjectsWithTasks();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProjectWithTasks(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const parsed = insertProjectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const project = await storage.createProject(parsed.data);
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.updateProject(req.params.id, req.body);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      await storage.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ error: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const parsed = insertTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const task = await storage.createTask(parsed.data);
      
      if (task.parentTaskId) {
        await storage.recalculateParentTaskCompletion(task.parentTaskId);
      }
      await storage.recalculateProjectCompletion(task.projectId);
      
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const existingTask = await storage.getTask(req.params.id);
      if (!existingTask) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      const task = await storage.updateTask(req.params.id, req.body);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      if (task.parentTaskId) {
        await storage.recalculateParentTaskCompletion(task.parentTaskId);
      }
      await storage.recalculateProjectCompletion(task.projectId);
      
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      const projectId = task.projectId;
      const parentTaskId = task.parentTaskId;
      
      await storage.deleteTask(req.params.id);
      
      if (parentTaskId) {
        const parentTask = await storage.getTask(parentTaskId);
        if (parentTask) {
          await storage.recalculateParentTaskCompletion(parentTaskId);
        }
      }
      await storage.recalculateProjectCompletion(projectId);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  app.get("/api/conversations", async (req, res) => {
    try {
      const conversations = await storage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const conversation = await storage.getConversationWithMessages(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const parsed = insertConversationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const conversation = await storage.createConversation(parsed.data);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      await storage.deleteConversation(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const message = await storage.createMessage({
        conversationId: req.params.id,
        role: req.body.role,
        content: req.body.content,
      });
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, context, conversationId } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      
      let conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
      
      if (conversationId) {
        const existingMessages = await storage.getMessagesByConversation(conversationId);
        conversationHistory = existingMessages.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content
        }));
        
        await storage.createMessage({
          conversationId,
          role: "user",
          content: message,
        });
      }

      const categories = await storage.getAllCategories();

      const actionSystemPrompt = `You are an intelligent AI project management assistant. Your job is to understand user intent and help them manage projects effectively.

## Understanding Progress Updates
Convert natural language to percentages intelligently:
- "1 of 4 done" / "1 out of 4" → 25%
- "2 of 5 complete" → 40%
- "3 out of 4 finished" → 75%
- "just started" / "barely begun" → 5-10%
- "making progress" / "underway" → 20-30%
- "halfway" / "half done" → 50%
- "mostly done" / "nearly there" → 75-80%
- "almost done" / "almost finished" → 85-95%
- "done" / "complete" / "finished" → 100%
- "blocked" / "stuck" → keep current %, note roadblock
- Fractions like "about a third" → 33%, "three quarters" → 75%

## Understanding Intent
- "the design is almost ready" → update the design task to ~90%
- "we finished planning" → mark planning task as 100% complete
- "homepage is blocked by..." → update homepage task roadblock
- "start a new marketing project" → create project in Marketing category
- "add review step to website project" → create task under that project

## IMPORTANT: Creating Projects with Tasks
When the user asks to create a project, ALWAYS also create 3-5 relevant starter tasks for that project. Extract tasks from:
1. Tasks explicitly mentioned by the user in the same message
2. Logical tasks that would be needed for that type of project

For example, if user says "Create a website redesign project with homepage, about page and contact form":
- Create the project first
- Then create tasks: "Homepage design", "About page design", "Contact form implementation"

If user just says "Create a marketing campaign project" without specifying tasks:
- Create the project
- Create sensible default tasks like: "Campaign strategy", "Content creation", "Launch preparation"

Available categories:
${JSON.stringify(categories.map(c => ({ id: c.id, name: c.name })), null, 2)}

Current projects and tasks:
${JSON.stringify(context?.projects || [], null, 2)}

Respond with a JSON object:
{
  "actions": [
    { "type": "create_project", "name": "string", "description": "optional", "categoryId": "optional" },
    { "type": "create_task", "projectId": "id", "name": "string", "description": "optional", "parentTaskId": "optional" },
    { "type": "update_task", "taskId": "id", "percentComplete": 0-100, "roadblocks": "optional string or null to clear" },
    { "type": "update_project", "projectId": "id", "percentComplete": 0-100, "roadblocks": "optional" }
  ],
  "responseMessage": "Friendly, conversational message about what you did or your advice"
}

CRITICAL: For create_task actions, you must use the ACTUAL project ID from the project you just created or from the existing projects list. When creating a project and its tasks in the same response, use "NEW_PROJECT" as a placeholder projectId for tasks that belong to the newly created project - the system will replace it with the actual ID.

Guidelines:
- Match task/project names flexibly (partial matches, case-insensitive)
- Infer the most likely project/task when context makes it obvious
- If ambiguous, ask for clarification in responseMessage with empty actions
- Choose appropriate category for new projects based on their nature
- Be helpful, proactive, and conversational in your responses
- If user just wants advice or asks a question, return empty actions with helpful response
- Remember the conversation context - refer back to previous messages when relevant`;

      const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: actionSystemPrompt }
      ];
      
      for (const msg of conversationHistory) {
        chatMessages.push({ role: msg.role, content: msg.content });
      }
      
      chatMessages.push({ role: "user", content: message });

      const actionResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: chatMessages,
        response_format: { type: "json_object" },
        max_completion_tokens: 1024,
      });

      let actionResult: { actions: any[]; responseMessage: string };
      try {
        actionResult = JSON.parse(actionResponse.choices[0]?.message?.content || '{"actions":[],"responseMessage":"I couldn\'t process that request."}');
      } catch {
        actionResult = { actions: [], responseMessage: "I had trouble understanding that. Could you rephrase?" };
      }

      const executedActions: string[] = [];
      let newlyCreatedProjectId: string | null = null;
      
      for (const action of actionResult.actions || []) {
        try {
          if (action.type === "create_project") {
            let resolvedCategoryId = action.categoryId || categories[0]?.id || null;
            if (resolvedCategoryId && !categories.find(c => c.id === resolvedCategoryId)) {
              const matchedCategory = categories.find(
                c => c.name.toLowerCase() === resolvedCategoryId.toLowerCase()
              );
              resolvedCategoryId = matchedCategory?.id || categories[0]?.id || null;
            }
            const project = await storage.createProject({
              name: action.name,
              description: action.description || null,
              categoryId: resolvedCategoryId,
              status: "active",
              percentComplete: 0,
            });
            newlyCreatedProjectId = project.id;
            executedActions.push(`Created project "${project.name}"`);
          } else if (action.type === "create_task") {
            let projectId = action.projectId;
            if (projectId === "NEW_PROJECT" && newlyCreatedProjectId) {
              projectId = newlyCreatedProjectId;
            }
            
            if (!projectId || projectId === "NEW_PROJECT") {
              console.error("Cannot create task without valid project ID");
              continue;
            }
            
            const task = await storage.createTask({
              projectId: projectId,
              parentTaskId: action.parentTaskId || null,
              name: action.name,
              description: action.description || null,
              percentComplete: 0,
              isCompleted: false,
              status: "pending",
              sortOrder: 0,
            });
            if (task.parentTaskId) {
              await storage.recalculateParentTaskCompletion(task.parentTaskId);
            }
            await storage.recalculateProjectCompletion(task.projectId);
            executedActions.push(`Created task "${task.name}"`);
          } else if (action.type === "update_task") {
            const existingTask = await storage.getTask(action.taskId);
            if (existingTask) {
              const updates: any = {};
              if (action.percentComplete !== undefined) {
                updates.percentComplete = action.percentComplete;
                updates.isCompleted = action.percentComplete === 100;
                updates.status = action.percentComplete === 100 ? "completed" : (action.percentComplete > 0 ? "in-progress" : "pending");
              }
              if (action.isCompleted !== undefined) {
                updates.isCompleted = action.isCompleted;
                updates.percentComplete = action.isCompleted ? 100 : (updates.percentComplete || existingTask.percentComplete);
              }
              if (action.roadblocks !== undefined) {
                updates.roadblocks = action.roadblocks;
              }
              const task = await storage.updateTask(action.taskId, updates);
              if (task && task.parentTaskId) {
                await storage.recalculateParentTaskCompletion(task.parentTaskId);
              }
              if (task) {
                await storage.recalculateProjectCompletion(task.projectId);
              }
              executedActions.push(`Updated task "${existingTask.name}"`);
            }
          } else if (action.type === "update_project") {
            const existingProject = await storage.getProject(action.projectId);
            if (existingProject) {
              const updates: any = {};
              if (action.percentComplete !== undefined) updates.percentComplete = action.percentComplete;
              if (action.roadblocks !== undefined) updates.roadblocks = action.roadblocks;
              await storage.updateProject(action.projectId, updates);
              executedActions.push(`Updated project "${existingProject.name}"`);
            }
          }
        } catch (e) {
          console.error("Error executing action:", action, e);
        }
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      if (executedActions.length > 0) {
        const actionSummary = `[Actions completed: ${executedActions.join(", ")}]\n\n`;
        res.write(`data: ${JSON.stringify({ content: actionSummary, isAction: true })}\n\n`);
      }

      let fullResponse = executedActions.length > 0 
        ? `[Actions completed: ${executedActions.join(", ")}]\n\n${actionResult.responseMessage}`
        : actionResult.responseMessage;

      const words = actionResult.responseMessage.split(" ");
      for (let i = 0; i < words.length; i++) {
        const content = (i === 0 ? "" : " ") + words[i];
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
        await new Promise(r => setTimeout(r, 20));
      }

      if (conversationId) {
        await storage.createMessage({
          conversationId,
          role: "assistant",
          content: fullResponse,
        });
      }

      res.write(`data: ${JSON.stringify({ done: true, actionsExecuted: executedActions.length > 0 })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in AI chat:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to get AI response" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to get AI response" });
      }
    }
  });

  app.post("/api/ai/analyze", async (req, res) => {
    try {
      const projects = await storage.getAllProjectsWithTasks();
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an AI project analyst. Analyze the following projects and tasks. Identify potential roadblocks, suggest improvements, and recommend next steps. Return your analysis as JSON with this structure:
{
  "updates": [
    {
      "type": "project" | "task",
      "id": "string",
      "roadblocks": "string or null",
      "aiSuggestions": "string or null"
    }
  ],
  "summary": "Overall analysis summary"
}`
          },
          {
            role: "user",
            content: JSON.stringify(projects)
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 2048,
      });

      const analysis = JSON.parse(response.choices[0]?.message?.content || "{}");
      
      if (analysis.updates) {
        for (const update of analysis.updates) {
          if (update.type === "project") {
            await storage.updateProject(update.id, {
              roadblocks: update.roadblocks,
              aiSuggestions: update.aiSuggestions,
            });
          } else if (update.type === "task") {
            await storage.updateTask(update.id, {
              roadblocks: update.roadblocks,
              aiSuggestions: update.aiSuggestions,
            });
          }
        }
      }

      res.json(analysis);
    } catch (error) {
      console.error("Error in AI analysis:", error);
      res.status(500).json({ error: "Failed to analyze projects" });
    }
  });

  return httpServer;
}
