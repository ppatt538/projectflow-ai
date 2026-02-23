import { 
  type User, type InsertUser, 
  type Category, type InsertCategory,
  type Project, type InsertProject, type ProjectWithTasks,
  type Task, type InsertTask, type TaskWithChildren,
  type Conversation, type InsertConversation, type ConversationWithMessages,
  type Message, type InsertMessage,
  users, categories, projects, tasks, conversations, messages
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<void>;
  
  getAllProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  getProjectWithTasks(id: string): Promise<ProjectWithTasks | undefined>;
  getAllProjectsWithTasks(): Promise<ProjectWithTasks[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;
  
  getTasksByProject(projectId: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;
  
  recalculateProjectCompletion(projectId: string): Promise<void>;
  recalculateParentTaskCompletion(taskId: string): Promise<void>;
  
  getAllConversations(): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationWithMessages(id: string): Promise<ConversationWithMessages | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation | undefined>;
  deleteConversation(id: string): Promise<void>;
  
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getAllCategories(): Promise<Category[]> {
    return db.select().from(categories);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.id, id));
    return result[0];
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const result = await db.insert(categories).values(insertCategory).returning();
    return result[0];
  }

  async updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category | undefined> {
    const result = await db.update(categories).set(updates).where(eq(categories.id, id)).returning();
    return result[0];
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getAllProjects(): Promise<Project[]> {
    return db.select().from(projects);
  }

  async getProject(id: string): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id));
    return result[0];
  }

  private buildTaskTree(allTasks: Task[], parentId: string | null = null): TaskWithChildren[] {
    return allTasks
      .filter(t => t.parentTaskId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(task => ({
        ...task,
        children: this.buildTaskTree(allTasks, task.id)
      }));
  }

  async getProjectWithTasks(id: string): Promise<ProjectWithTasks | undefined> {
    const projectResult = await db.select().from(projects).where(eq(projects.id, id));
    const project = projectResult[0];
    if (!project) return undefined;

    let category: Category | undefined;
    if (project.categoryId) {
      const catResult = await db.select().from(categories).where(eq(categories.id, project.categoryId));
      category = catResult[0];
    }

    const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, id)).orderBy(asc(tasks.sortOrder));
    const taskTree = this.buildTaskTree(projectTasks, null);

    return {
      ...project,
      category,
      tasks: taskTree
    };
  }

  async getAllProjectsWithTasks(): Promise<ProjectWithTasks[]> {
    const allProjects = await db.select().from(projects);
    const allCategories = await db.select().from(categories);
    const allTasks = await db.select().from(tasks).orderBy(asc(tasks.sortOrder));

    const categoryMap = new Map(allCategories.map(c => [c.id, c]));

    return allProjects.map(project => {
      const category = project.categoryId ? categoryMap.get(project.categoryId) : undefined;
      const projectTasks = allTasks.filter(t => t.projectId === project.id);
      const taskTree = this.buildTaskTree(projectTasks, null);
      return { ...project, category, tasks: taskTree };
    });
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const result = await db.insert(projects).values(insertProject).returning();
    return result[0];
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const result = await db.update(projects).set(updates).where(eq(projects.id, id)).returning();
    return result[0];
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(asc(tasks.sortOrder));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id));
    return result[0];
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const result = await db.insert(tasks).values(insertTask).returning();
    return result[0];
  }

  async updateTask(id: string, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const result = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();
    return result[0];
  }

  async deleteTask(id: string): Promise<void> {
    const childTasks = await db.select().from(tasks).where(eq(tasks.parentTaskId, id));
    for (const child of childTasks) {
      await this.deleteTask(child.id);
    }
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async recalculateProjectCompletion(projectId: string): Promise<void> {
    const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, projectId));
    const rootTasks = projectTasks.filter(t => !t.parentTaskId);

    if (rootTasks.length === 0) {
      await db.update(projects).set({ percentComplete: 0 }).where(eq(projects.id, projectId));
      return;
    }

    const totalPercent = rootTasks.reduce((sum, t) => sum + t.percentComplete, 0);
    const avgPercent = Math.round(totalPercent / rootTasks.length);

    await db.update(projects).set({ percentComplete: avgPercent }).where(eq(projects.id, projectId));
  }

  async recalculateParentTaskCompletion(parentTaskId: string): Promise<void> {
    const parentResult = await db.select().from(tasks).where(eq(tasks.id, parentTaskId));
    const parentTask = parentResult[0];
    if (!parentTask) return;

    const children = await db.select().from(tasks).where(eq(tasks.parentTaskId, parentTaskId));
    if (children.length === 0) return;

    const totalPercent = children.reduce((sum, t) => sum + t.percentComplete, 0);
    const avgPercent = Math.round(totalPercent / children.length);

    const isCompleted = avgPercent === 100;
    await db.update(tasks).set({
      percentComplete: avgPercent,
      isCompleted,
      status: isCompleted ? "completed" : (avgPercent > 0 ? "in-progress" : parentTask.status)
    }).where(eq(tasks.id, parentTaskId));

    if (parentTask.parentTaskId) {
      await this.recalculateParentTaskCompletion(parentTask.parentTaskId);
    }
  }

  async getAllConversations(): Promise<Conversation[]> {
    return db.select().from(conversations).orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const result = await db.select().from(conversations).where(eq(conversations.id, id));
    return result[0];
  }

  async getConversationWithMessages(id: string): Promise<ConversationWithMessages | undefined> {
    const convResult = await db.select().from(conversations).where(eq(conversations.id, id));
    const conversation = convResult[0];
    if (!conversation) return undefined;

    const msgs = await db.select().from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt));

    return { ...conversation, messages: msgs };
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const result = await db.insert(conversations).values(insertConversation).returning();
    return result[0];
  }

  async updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation | undefined> {
    const result = await db.update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return result[0];
  }

  async deleteConversation(id: string): Promise<void> {
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(insertMessage).returning();
    
    await db.update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, insertMessage.conversationId));

    return result[0];
  }
}

export const storage = new DatabaseStorage();
