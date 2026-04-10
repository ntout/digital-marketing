# User Stories — Marketing Analytics SaaS

## Overview
This repository contains all user stories for the marketing analytics platform. Stories are written in a format optimized for implementation with Codex: each story is self-contained with acceptance criteria written as Given/When/Then, a data model hint, explicit dependencies, and out-of-scope boundaries.

---

## How to use these stories with Codex

1. **Feed one story per session.** Paste the full markdown of a single story into Codex and open with: *"Implement this user story. Use the acceptance criteria to write tests first (TDD), then the implementation."*
2. **Always include dependencies.** If a story depends on US-003, paste US-003's data model into context so Codex uses consistent field names.
3. **Use the data model as your schema source of truth.** Do not let Codex invent field names — if the story has a data model, enforce it.
4. **Implement in the order below.** Dependencies flow downward; building out of order will cause Codex to scaffold missing pieces inconsistently.

---

## Implementation order

Stories are grouped into phases. Complete all stories in a phase before moving to the next.

### Phase 1 — Foundation (build first, everything depends on this)
| ID | Title | Priority |
|----|-------|----------|
| US-001 | User authentication & workspace setup | High |
| US-002 | Team invitations & role management | High |

### Phase 2 — Data pipeline (no UI is useful without data)
| ID | Title | Priority |
|----|-------|----------|
| US-003 | Connect marketing platforms via OAuth | High |
| US-004 | Background data ingestion & sync | High |

### Phase 3 — Core analytics UI (the product's main value)
| ID | Title | Priority |
|----|-------|----------|
| US-005 | Unified KPI dashboard | High |
| US-006 | Trend charts & date comparison | High |
| US-007 | Campaign & ad set breakdown table | High |
| US-008 | Anomaly detection & alerts | High |
| US-009 | Report generation & scheduled delivery | Medium |

### Phase 4 — Campaign write-back (enables human edits from the app)
| ID | Title | Priority |
|----|-------|----------|
| US-010 | In-app campaign editing (write-back to platforms) | High |
| US-011 | In-app ad copy editing | Medium |
| US-012 | Bulk campaign actions | Medium |

### Phase 5 — AI infrastructure (must exist before any AI agent actions)
| ID | Title | Priority |
|----|-------|----------|
| US-013 | AI action log & audit trail | High |
| US-014 | AI autonomy controls & permission levels | High |
| US-015 | AI approval queue | High |

### Phase 6 — AI agent actions (built on top of Phase 5 infrastructure)
| ID | Title | Priority |
|----|-------|----------|
| US-016 | AI agent: budget optimization | High |
| US-017 | AI agent: cross-channel budget reallocation | Medium |
| US-018 | AI agent: creative fatigue detection | Low |
| US-019 | AI insights & recommendations panel | High |
| US-020 | Cross-channel attribution model | Medium |

---

## Dependency graph

```
US-001 (Auth)
  └── US-002 (Teams)
        └── US-003 (Platform connections)
              └── US-004 (Data ingestion)
                    ├── US-005 (Dashboard)
                    │     └── US-006 (Trend charts)
                    │           └── US-007 (Campaign table)
                    │                 ├── US-008 (Anomaly alerts)
                    │                 └── US-009 (Reports)
                    └── US-010 (Campaign editing / write-back)
                          ├── US-011 (Ad copy editing)
                          ├── US-012 (Bulk actions)
                          └── US-013 (AI action log)  ← build before any AI
                                └── US-014 (AI autonomy controls)
                                      └── US-015 (Approval queue)
                                            ├── US-016 (AI budget optimization)
                                            ├── US-017 (AI cross-channel reallocation)
                                            ├── US-018 (AI creative fatigue)
                                            └── US-019 (AI insights)
                                                  └── US-020 (Attribution model)
```

---

## Story file naming convention
`US-[###]-[short-slug].md`

## Roles referenced
| Role | Description |
|------|-------------|
| Owner | Workspace creator, all permissions |
| Admin | Full access except billing |
| Manager | Can edit campaigns and AI settings |
| Marketer | Read + limited edit access |
| Viewer | Read only |
| AI Agent | Automated system actor |

