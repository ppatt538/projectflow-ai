import { storage } from "./storage";

export async function seedData() {
  const existingCategories = await storage.getAllCategories();
  if (existingCategories.length > 0) {
    console.log("Data already seeded, skipping...");
    return;
  }

  console.log("Seeding initial data...");

  const devCategory = await storage.createCategory({ name: "Development", color: "#3B82F6" });
  const marketingCategory = await storage.createCategory({ name: "Marketing", color: "#10B981" });
  const designCategory = await storage.createCategory({ name: "Design", color: "#8B5CF6" });
  const operationsCategory = await storage.createCategory({ name: "Operations", color: "#F59E0B" });

  const websiteProject = await storage.createProject({
    name: "Website Redesign",
    description: "Complete overhaul of the company website with modern design and improved UX",
    categoryId: devCategory.id,
    status: "active",
    percentComplete: 45,
  });

  const planningTask = await storage.createTask({
    projectId: websiteProject.id,
    name: "Planning & Research",
    description: "Initial planning phase including competitor analysis",
    percentComplete: 100,
    isCompleted: true,
    status: "completed",
    sortOrder: 0,
  });

  await storage.createTask({
    projectId: websiteProject.id,
    parentTaskId: planningTask.id,
    name: "Competitor Analysis",
    percentComplete: 100,
    isCompleted: true,
    status: "completed",
    sortOrder: 0,
  });

  await storage.createTask({
    projectId: websiteProject.id,
    parentTaskId: planningTask.id,
    name: "User Research",
    percentComplete: 100,
    isCompleted: true,
    status: "completed",
    sortOrder: 1,
  });

  const designTask = await storage.createTask({
    projectId: websiteProject.id,
    name: "UI/UX Design",
    description: "Create wireframes and high-fidelity mockups",
    percentComplete: 70,
    isCompleted: false,
    status: "in-progress",
    sortOrder: 1,
  });

  await storage.createTask({
    projectId: websiteProject.id,
    parentTaskId: designTask.id,
    name: "Wireframes",
    percentComplete: 100,
    isCompleted: true,
    status: "completed",
    sortOrder: 0,
  });

  await storage.createTask({
    projectId: websiteProject.id,
    parentTaskId: designTask.id,
    name: "High-fidelity mockups",
    percentComplete: 80,
    isCompleted: false,
    status: "in-progress",
    sortOrder: 1,
  });

  await storage.createTask({
    projectId: websiteProject.id,
    parentTaskId: designTask.id,
    name: "Design review with stakeholders",
    percentComplete: 30,
    isCompleted: false,
    status: "in-progress",
    roadblocks: "Waiting for VP approval on color palette",
    sortOrder: 2,
  });

  const devTask = await storage.createTask({
    projectId: websiteProject.id,
    name: "Frontend Development",
    description: "Build the new website using React",
    percentComplete: 20,
    isCompleted: false,
    status: "in-progress",
    sortOrder: 2,
  });

  await storage.createTask({
    projectId: websiteProject.id,
    parentTaskId: devTask.id,
    name: "Setup project structure",
    percentComplete: 100,
    isCompleted: true,
    status: "completed",
    sortOrder: 0,
  });

  await storage.createTask({
    projectId: websiteProject.id,
    parentTaskId: devTask.id,
    name: "Build homepage components",
    percentComplete: 40,
    isCompleted: false,
    status: "in-progress",
    sortOrder: 1,
  });

  await storage.createTask({
    projectId: websiteProject.id,
    parentTaskId: devTask.id,
    name: "Implement responsive design",
    percentComplete: 0,
    isCompleted: false,
    status: "pending",
    sortOrder: 2,
  });

  await storage.createTask({
    projectId: websiteProject.id,
    name: "Testing & QA",
    description: "Complete testing before launch",
    percentComplete: 0,
    isCompleted: false,
    status: "pending",
    sortOrder: 3,
  });

  const mobileProject = await storage.createProject({
    name: "Mobile App Launch",
    description: "Launch the mobile application on iOS and Android",
    categoryId: devCategory.id,
    status: "active",
    percentComplete: 75,
  });

  const betaTask = await storage.createTask({
    projectId: mobileProject.id,
    name: "Beta Testing",
    percentComplete: 100,
    isCompleted: true,
    status: "completed",
    sortOrder: 0,
  });

  await storage.createTask({
    projectId: mobileProject.id,
    parentTaskId: betaTask.id,
    name: "Internal testing",
    percentComplete: 100,
    isCompleted: true,
    status: "completed",
    sortOrder: 0,
  });

  await storage.createTask({
    projectId: mobileProject.id,
    parentTaskId: betaTask.id,
    name: "External beta program",
    percentComplete: 100,
    isCompleted: true,
    status: "completed",
    sortOrder: 1,
  });

  await storage.createTask({
    projectId: mobileProject.id,
    name: "App Store Submission",
    percentComplete: 50,
    isCompleted: false,
    status: "in-progress",
    roadblocks: "Need updated screenshots for App Store",
    aiSuggestions: "Consider using automated screenshot tools like Fastlane to speed up the process",
    sortOrder: 1,
  });

  await storage.createTask({
    projectId: mobileProject.id,
    name: "Marketing Launch Prep",
    percentComplete: 80,
    isCompleted: false,
    status: "in-progress",
    sortOrder: 2,
  });

  const campaignProject = await storage.createProject({
    name: "Q1 Marketing Campaign",
    description: "Integrated marketing campaign for product launch",
    categoryId: marketingCategory.id,
    status: "active",
    percentComplete: 30,
  });

  await storage.createTask({
    projectId: campaignProject.id,
    name: "Campaign Strategy",
    percentComplete: 100,
    isCompleted: true,
    status: "completed",
    sortOrder: 0,
  });

  await storage.createTask({
    projectId: campaignProject.id,
    name: "Content Creation",
    percentComplete: 40,
    isCompleted: false,
    status: "in-progress",
    sortOrder: 1,
  });

  await storage.createTask({
    projectId: campaignProject.id,
    name: "Social Media Setup",
    percentComplete: 20,
    isCompleted: false,
    status: "in-progress",
    sortOrder: 2,
  });

  await storage.createTask({
    projectId: campaignProject.id,
    name: "Paid Advertising",
    percentComplete: 0,
    isCompleted: false,
    status: "pending",
    sortOrder: 3,
  });

  const brandProject = await storage.createProject({
    name: "Brand Guidelines Update",
    description: "Refresh brand guidelines and create new style guide",
    categoryId: designCategory.id,
    status: "active",
    percentComplete: 90,
  });

  await storage.createTask({
    projectId: brandProject.id,
    name: "Logo Variations",
    percentComplete: 100,
    isCompleted: true,
    status: "completed",
    sortOrder: 0,
  });

  await storage.createTask({
    projectId: brandProject.id,
    name: "Typography Guidelines",
    percentComplete: 100,
    isCompleted: true,
    status: "completed",
    sortOrder: 1,
  });

  await storage.createTask({
    projectId: brandProject.id,
    name: "Color Palette Documentation",
    percentComplete: 100,
    isCompleted: true,
    status: "completed",
    sortOrder: 2,
  });

  await storage.createTask({
    projectId: brandProject.id,
    name: "Final Review & Export",
    percentComplete: 60,
    isCompleted: false,
    status: "in-progress",
    aiSuggestions: "Consider creating multiple format exports (PDF, Figma, Sketch) for different team needs",
    sortOrder: 3,
  });

  const hiringProject = await storage.createProject({
    name: "Engineering Hiring",
    description: "Hire 3 senior engineers for the platform team",
    categoryId: operationsCategory.id,
    status: "active",
    percentComplete: 40,
    roadblocks: "Limited candidate pool for specialized skills",
  });

  await storage.createTask({
    projectId: hiringProject.id,
    name: "Job Posting & Outreach",
    percentComplete: 100,
    isCompleted: true,
    status: "completed",
    sortOrder: 0,
  });

  await storage.createTask({
    projectId: hiringProject.id,
    name: "Initial Screening",
    percentComplete: 70,
    isCompleted: false,
    status: "in-progress",
    sortOrder: 1,
  });

  await storage.createTask({
    projectId: hiringProject.id,
    name: "Technical Interviews",
    percentComplete: 20,
    isCompleted: false,
    status: "in-progress",
    sortOrder: 2,
  });

  await storage.createTask({
    projectId: hiringProject.id,
    name: "Final Interviews & Offers",
    percentComplete: 0,
    isCompleted: false,
    status: "pending",
    sortOrder: 3,
  });

  console.log("Seed data created successfully!");
}
