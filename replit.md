# ProjectFlow AI

## Overview

ProjectFlow AI is an intelligent project and task management application with AI-powered features including status updates, roadblock detection, and completion suggestions. The application follows a full-stack TypeScript architecture with a React frontend and Express backend, using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite with hot module replacement

The frontend follows a component-based architecture with:
- Page components in `client/src/pages/`
- Reusable UI components in `client/src/components/ui/`
- Feature components in `client/src/components/`
- Custom hooks in `client/src/hooks/`

### Backend Architecture
- **Framework**: Express 5 running on Node.js
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful JSON API with `/api` prefix
- **Build**: esbuild for production bundling with selective dependency bundling

The server structure includes:
- `server/index.ts` - Application entry point and middleware setup
- `server/routes.ts` - API route definitions
- `server/storage.ts` - Data access layer with in-memory storage (database-ready interface)
- `server/vite.ts` - Development server with Vite integration
- `server/static.ts` - Production static file serving

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Defined in `shared/schema.ts` using Drizzle's schema builder
- **Validation**: Zod schemas generated from Drizzle schemas via drizzle-zod
- **Migrations**: Drizzle Kit for schema migrations (`npm run db:push`)

Core data models:
- **Users**: Authentication with username/password
- **Categories**: Project categorization with custom colors
- **Projects**: Main project entities with status, progress, roadblocks, and AI suggestions
- **Tasks**: Hierarchical task structure with parent-child relationships and completion tracking
- **Conversations/Messages**: Chat history for AI interactions

### AI Integration
- **Provider**: OpenAI API (via Replit AI Integrations)
- **Features**: 
  - AI chat assistant that can execute actions:
    - Create new projects with name, description, and category
    - Automatically creates 3-5 starter tasks when creating projects
    - Create tasks within projects (including subtasks)
    - Update task progress percentages
    - Update project information and roadblocks
  - **Conversation Context**: Full conversation history is sent to AI with each message, enabling multi-turn conversations where the AI remembers what was discussed
  - **Conversation Persistence**: Conversations are saved and can be reloaded from the sidebar
  - Two-phase AI processing: structured JSON action identification, then conversational response
  - Roadblock detection and AI suggestions
  - Real-time streaming responses

### Replit Integrations
The `server/replit_integrations/` and `client/replit_integrations/` directories contain pre-built utilities for:
- **Audio**: Voice recording, playback, and streaming with AudioWorklet
- **Chat**: Conversation storage and streaming responses
- **Image**: Image generation via OpenAI
- **Batch**: Rate-limited batch processing utilities

## External Dependencies

### Database
- **PostgreSQL**: Primary database (connection via `DATABASE_URL` environment variable)
- **Drizzle ORM**: Database queries and schema management
- **connect-pg-simple**: Session storage (available but not currently configured)

### AI Services
- **OpenAI API**: Accessed through Replit AI Integrations
  - Environment variables: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`
  - Used for: Chat completions, speech-to-text, text-to-speech, image generation

### Frontend Libraries
- **@tanstack/react-query**: Server state management
- **react-hook-form**: Form handling with Zod validation
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon library

### Development Tools
- **Vite**: Frontend build tool and dev server
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Production bundling for server
- **Drizzle Kit**: Database migration tooling