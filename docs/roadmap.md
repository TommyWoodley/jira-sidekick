# 🗺️ Jira-Sidekick Roadmap

A roadmap for the jira-sidekick VS Code extension.

---

## Phase 0 — Setup

### Decisions
- Jira Cloud only
- Read-only MVP
- Repo + CI in place

### Clean architecture boundaries
- `jira/` — domain + API
- `ui/` — VS Code only
- `core/` — state, caching, events

✅ **Output:** empty extension that loads + CI passing

---

## Phase 1 — MVP: Read-only Jira inside VS Code (v0.1)

**Goal:** Immediate value, minimal surface area

### Features
- Jira authentication (API token)
- Sidebar Tree View:
  - "My Issues"
  - Refresh command
  - Click issue → open in browser
- Configurable JQL

### UX
- Status bar: issue count
- Error states (auth failed, no issues)

### Tech notes
- Cache issues in memory
- No background polling yet

✅ **Output:** usable daily tool

---

## Phase 2 — Issue details & light interaction (v0.2)

**Goal:** Reduce context switching

### Features
- Issue details webview:
  - Description
  - Status
  - Assignee
  - Labels
- Open issue inline (not browser)
- Manual refresh per issue

### Tech notes
- Introduce:
  - Webview message passing
  - Issue detail cache
- Still mostly read-only

✅ **Output:** VS Code becomes a Jira viewer

---

## Phase 3 — Write operations (v0.3)

**Goal:** Make Jira actionable from VS Code

### Features
- Add comments
- Transition issue status
- Assign / unassign issue

### UX
- Confirmation prompts for writes
- Optimistic UI updates

### Tech notes
- Central mutation layer
- Rollback on API failure

⚠️ **First phase with real risk → keep scope tight**

---

## Phase 4 — Git & workflow integration (v0.4)

**Goal:** Fit developer workflow naturally

### Features
- Detect Jira issue from:
  - Branch name
  - Commit message
- Status bar:
  - Current issue
- Commands:
  - Create branch from issue
  - Copy branch name

### UX
- Issue context always visible
- Zero manual linking

### Tech notes
- Listen to:
  - Git extension API
  - Workspace changes

✅ **This is where it becomes "sticky"**

---

## Phase 5 — Editor-level intelligence (v0.5)

**Goal:** Bring Jira into the editor

### Features
- Hover over `PROJ-123` → issue preview
- Clickable issue references
- TODO → Jira linking
- Warnings:
  - Commit without issue key

### Tech notes
- `TextDocumentHoverProvider`
- Lightweight parsing only

---

## Phase 6 — Dashboards & custom views (v0.6)

**Goal:** Power-user adoption

### Features
- Saved JQL views
- Multiple tree views:
  - My Issues
  - Sprint
  - Favourites
- Basic sprint awareness

### UX
- Configurable + persistent
- Fast loading via cache

---

## Phase 7 — Automation & rules (v0.7)

**Goal:** Remove manual Jira admin work

### Features
- Auto-transition:
  - PR opened → In Progress
  - PR merged → Done
- Auto-comment with:
  - PR links
  - Build URLs

### Tech notes
- Rules engine (config-driven)
- Event bus inside extension

⚠️ **Needs strong guardrails to avoid surprises**

---

## Phase 8 — AI-assisted features (v0.8+)

**Goal:** Differentiation

### Features
- Generate:
  - Commit messages
  - PR descriptions
- Summarise issues
- Suggest related tickets

### UX
- Explicit opt-in
- Manual triggers only at first

---

## Phase 9 — Enterprise & scale (v1.0)

**Goal:** Reliability & trust

### Features
- Multi-account support
- Offline read-only mode
- Persistent cache
- Telemetry (opt-in)

### Tech notes
- IndexedDB / local storage
- Background refresh scheduler

---

## What to design now vs later

### Design now
- Domain vs UI separation
- Event-driven core
- Jira client abstraction
- Caching layer

### Defer
- AI
- Automation rules
- Dashboards

---

## Suggested milestone plan

| Version | Milestone |
|---------|-----------|
| v0.1 | Public GitHub release |
| v0.3 | Daily-driver capable |
| v0.5 | Standout dev UX |
| v1.0 | Stable + extensible |

