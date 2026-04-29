# pi-peer-review
A simple pi.dev extension to spawn agents to review your ML papers
# ML Paper Peer Review Extension

A pi.dev extension that automates a rigorous, multi-agent peer review process for machine learning papers using the `pi-subagents` library.

## Installation

```bash
# 1. Install the extension from GitHub
pi install git:github.com/lucacorbucci/pi-peer-review

# 2. Install the subagents dependency
pi install npm:pi-subagents
```

### First Use: Set Your Models

Agent files use `CHANGE-ME` as a placeholder. You **must** set a valid model before running a review.

Set all models at once:

```bash
/review-models \
  --meta-model=anthropic/claude-sonnet-4 \
  --opt-model=anthropic/claude-haiku-4-5 \
  --critic-model=deepseek/deepseek-v4-flash \
  --skeptic-model=google/gemini-3-pro \
  --roast-model=anthropic/claude-haiku-4-5 \
  --security-model=anthropic/claude-haiku-4-5 \
  --authenticity-model=deepseek/deepseek-v4-flash \
  --literature-model=deepseek/deepseek-v4-flash \
  --visual-model=openai/gpt-4o
```

Or set models per-review with flags:

```bash
/review-paper paper.tex --critic-model=anthropic/claude-sonnet-4 --meta-model=openai/gpt-5.5
```

> The extension copies its agent templates to `.pi/agents/` on first use.
> You can then edit those files to customize each agent's persona, tools, thinking level, etc.

## Requirements

- [pi.dev](https://pi.dev) installed
- API keys configured for the models you want to use

## Architecture

```
User
 │  /review-paper paper.tex --critic-model=openai/gpt-5.5
 ▼
Orchestrator (your current agent with subagent tool)
 │
 ▼
┌──────────────────────────────────────────────────────────┐
│  Chain: parallel review → meta-synthesis                  │
│                                                          │
│  Step 1: Parallel Reviewers (8 agents)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Optimist │ │  Critic  │ │ Skeptic  │ │ Roaster  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌───────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │    Security   │ │Authenticity  │ │  Literature  │  │
│  │   Sentinel    │ │  Inspector   │ │    Sleuth    │  │
│  └───────────────┘ └──────────────┘ └──────────────┘  │
│  ┌───────────────┐                                    │
│  │    Visual     │                                    │
│  │    Critic     │                                    │
│  └───────────────┘                                    │
│         │                                              │
│         ▼ (8 reviews merged)                           │
│  Step 2: Meta-Reviewer                                 │
│  ┌────────────────────────┐                            │
│  │  Area Chair / Meta     │                            │
│  │  Synthesizes 8 reviews  │                            │
│  └────────────────────────┘                            │
│         │                                              │
│         ▼                                              │
│  Unified Meta-Review Document                          │
└──────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# 1. Set your models (required before first use)
/review-models --meta-model=anthropic/claude-sonnet-4 --critic-model=deepseek/deepseek-v4-flash

# 2. Run a review
/review-paper paper.tex

# Or override models per-review with flags
/review-paper paper.tex --meta-model=openai/gpt-5.5 --critic-model=anthropic/claude-sonnet-4
```

---

## Commands

### `/review-paper <paper.tex> [flags...]`

Run the full multi-agent peer review. Takes the path to a LaTeX paper and optional model overrides.

**Flags (all optional, overrides the model in the agent's .md file):**

| Flag | Agent | Default model |
|------|-------|---------------|
| `--meta-model=` | ml-meta-reviewer | `CHANGE-ME` |
| `--opt-model=` or `--optimist-model=` | ml-optimist | `CHANGE-ME` |
| `--critic-model=` | ml-critic | `CHANGE-ME` |
| `--skeptic-model=` | ml-skeptic | `CHANGE-ME` |
| `--roast-model=` or `--roaster-model=` | ml-roaster | `CHANGE-ME` |
| `--security-model=` or `--sentinel-model=` | ml-security-sentinel | `CHANGE-ME` |
| `--authenticity-model=` or `--auth-model=` | ml-authenticity-inspector | `CHANGE-ME` |
| `--literature-model=` or `--sleuth-model=` | ml-literature-sleuth | `CHANGE-ME` |
| `--visual-model=` or `--vis-model=` | ml-visual-critic | `CHANGE-ME` |

**Examples:**



### `/review-models`

Show the current models for all agents (reads from `.pi/agents/*.md`).

```bash
/review-models
```

### `/review-models [flags...]`

Persist model changes to the agent files. This updates the `model:` line in each agent's `.md` file so the change sticks for all future `/review-paper` runs.

```bash
# Set the critic to a different model permanently
/review-models --critic-model=anthropic/claude-sonnet-4

# Set multiple at once
/review-models --meta-model=openai/gpt-5.5 --opt-model=openai-codex/gpt-5.4-mini
```

---

## The Nine Agents

Each agent is a standalone markdown file in `.pi/agents/`. They contain:

- **YAML frontmatter** — name, description, model, tools, thinking level, etc.
- **System prompt** — the agent's persona, workflow, and output format

| File | Agent | Role | Default model | Thinking | Tools |
|------|-------|------|---------------|----------|-------|
| `ml-optimist.md` | Optimist | Novelty & empirical strengths | `CHANGE-ME` | low | read, grep |
| `ml-critic.md` | Rigorous Critic | Methodology, baselines, math rigor | `CHANGE-ME` | high | read, bash, grep |
| `ml-skeptic.md` | Big Picture Skeptic | Generalization, compute, societal impact | `CHANGE-ME` | medium | read, grep |
| `ml-roaster.md` | Brutal Roaster | Cynical, cuts through hype & buzzwords | `CHANGE-ME` | high | read, grep |
| `ml-security-sentinel.md` | Security Sentinel | Malicious payloads, prompt injections | `CHANGE-ME` | medium | read, grep |
| `ml-authenticity-inspector.md` | Authenticity Inspector | AI-generated writing detection | `CHANGE-ME` | medium | read, grep |
| `ml-literature-sleuth.md` | Literature Sleuth | Citation verification, SOTA check | `CHANGE-ME` | high | read, grep, web_search |
| `ml-visual-critic.md` | Visual Critic | Figures, tables, PDF formatting | `CHANGE-ME` | medium | read_pdf, bash |
| `ml-meta-reviewer.md` | Meta-Reviewer / Area Chair | Synthesizes reviews into final decision | `CHANGE-ME` | high | read, grep |

---

## Customizing Agents

Each agent's "soul" lives entirely in its `.md` file. You have full freedom to edit them.

### The agent file format

```
---
name: ml-optimist                        # Must match filename (minus .md)
description: Optimistic ML reviewer      # Shown in agent listings
model: CHANGE-ME                        # Set this to a model you have access to (e.g. anthropic/claude-sonnet-4)
tools: read,grep                         # Comma-separated tool names
thinking: low                            # off, minimal, low, medium, high, xhigh
systemPromptMode: replace                # "replace" (recommended) or "append"
inheritProjectContext: false             # Whether to inject AGENTS.md context
inheritSkills: false                     # Whether to inject loaded skills
---

Your system prompt goes here.
This is where you define the agent's persona,
workflow, and output format.
```

### Changing an agent's persona

Edit the body (system prompt) of the `.md` file. For example, to make the Optimist more strict:

```markdown
---
name: ml-optimist
...
---

You are Reviewer 1. You WERE optimistic, but you've been burned too many times
by overhyped papers. While you still appreciate novelty, you now demand:
- At least 3 strong baselines, not just 1-2
- Ablation studies for every architectural choice
- Error bars on every result table
...
```

Reload pi with `/reload` after editing agent files to ensure changes are picked up.

### Changing tools

Add or remove tools from the `tools:` line:

```markdown
tools: read,grep,find,ls    # Give the agent more exploration tools
```

Common tools: `read`, `grep`, `find`, `ls`, `bash`, `write`, `edit`

### Changing thinking level

The `thinking:` field controls how much reasoning the model does before responding:

| Value | Effect |
|-------|--------|
| `off` | No thinking, faster & cheaper |
| `minimal` | Brief reasoning |
| `low` | Light reasoning (good for the Optimist) |
| `medium` | Moderate depth (good for the Skeptic) |
| `high` | Deep reasoning (good for Critic, Roaster, Meta) |
| `xhigh` | Maximum reasoning (slowest, most expensive) |

### Changing the default model permanently

Either edit the `model:` line in the `.md` file directly, or use:

```bash
/review-models --meta-model=openai/gpt-5.5 --critic-model=anthropic/claude-sonnet-4
```

This patches only the model line and leaves everything else intact.

---

## Adding New Reviewers

The review pipeline is driven by the agent list at the top of `index.ts`:

```typescript
const REVIEWER_AGENTS = [
  "ml-optimist",
  "ml-critic",
  "ml-skeptic",
  "ml-roaster",
  "ml-security-sentinel",
  "ml-authenticity-inspector",
  "ml-literature-sleuth",
  "ml-visual-critic",
] as const;
```

To add a new reviewer type (e.g., a "Domain Expert" reviewer):

### Step 1: Create the agent file

Create `.pi/agents/ml-domain-expert.md`:

```markdown
---
name: ml-domain-expert
description: Domain expert reviewer - deeply familiar with the specific subfield
model: anthropic/claude-sonnet-4
tools: read,grep,find,ls
thinking: medium
systemPromptMode: replace
inheritProjectContext: false
inheritSkills: false
---

You are Reviewer 5, a domain expert who has published extensively in this
specific subfield. You care about:
- Whether the paper cites the right foundational work
- Whether the problem formulation aligns with how practitioners think about it
- Whether the experiments reflect realistic use cases for this domain

## Workflow
1. Read the paper carefully
2. Provide:

### Domain Alignment
Does this paper frame the problem correctly for the field?

### Missing Related Work
List 3-5 papers the authors should have cited but didn't.

### Practical Relevance
Would a practitioner in this field actually use this method? Why or why not?

### Score
Give a score from 1 to 10.
```

### Step 2: Register the agent in the extension

Open `index.ts` (at the repo root, or wherever the extension is installed) and add the new agent name to `REVIEWER_AGENTS`:

```typescript
const REVIEWER_AGENTS = [
  "ml-optimist",
  "ml-critic",
  "ml-skeptic",
  "ml-roaster",
  "ml-domain-expert",  // ← ADD THIS
] as const;
```

Also add the default model:

```typescript
const DEFAULT_MODELS: Record<AgentName, string> = {
  // ... existing entries ...
  "ml-domain-expert": "anthropic/claude-sonnet-4",  // ← ADD THIS
};
```

And add a flag if you want:

```typescript
const FLAG_TO_AGENT: Record<string, AgentName> = {
  // ... existing entries ...
  "--domain-model": "ml-domain-expert",  // ← ADD THIS
};
```

### Step 3: Reload

Run `/reload` in pi. The new reviewer is now part of the pipeline.

---

## Complete Example: Customizing for Your Conference

```bash
# 1. Set models appropriate for your compute budget (REPLACE these with models you have access to)
/review-models \
  --meta-model=CHANGE-ME \
  --opt-model=CHANGE-ME \
  --critic-model=CHANGE-ME \
  --skeptic-model=CHANGE-ME \
  --roast-model=CHANGE-ME \
  --security-model=CHANGE-ME \
  --authenticity-model=CHANGE-ME \
  --literature-model=CHANGE-ME \
  --visual-model=CHANGE-ME

# 2. Edit agent personas directly
# vim .pi/agents/ml-critic.md      # Make the critic even meaner
# vim .pi/agents/ml-roaster.md     # Tone down the sarcasm if needed
# vim .pi/agents/ml-meta-reviewer.md  # Change the output format

# 3. Reload and run
/reload
/review-paper my_paper.tex
```

---

## Output Format

The Meta-Reviewer produces a structured document with:

1. **Paper Summary** — 3-4 sentence synthesis across all reviews
2. **Overall Reception** — consensus and disagreement patterns
3. **Recurring Strengths** — strengths identified by multiple reviewers
4. **Prioritized Actionable Changes** — ranked list with reviewer attribution
5. **Average Score** — numerical average with individual scores
6. **Recommendation** — Accept / Weak Accept / Borderline / Weak Reject / Reject

---

## Repository Structure

```
pi-peer-review/            ← Git repo / pi package root
├── package.json           ← pi manifest (declares index.ts as the extension)
├── index.ts               ← Extension entry point (registerCommands, orchestration logic)
├── agents/                ← Bundled agent .md templates (copied to .pi/agents/ on first run)
│   ├── ml-optimist.md
│   ├── ml-critic.md
│   ├── ml-skeptic.md
│   ├── ml-roaster.md
│   ├── ml-security-sentinel.md
│   ├── ml-authenticity-inspector.md
│   ├── ml-literature-sleuth.md
│   ├── ml-visual-critic.md
│   └── ml-meta-reviewer.md
├── README.md
├── LICENSE
└── .gitignore
```

## How Agent Templates Work

On first run of `/review-paper`, the extension copies the bundled `.md` files from `agents/` (in this repo) to `.pi/agents/` (in your project). It never overwrites existing files — once you edit an agent, your changes are safe.

---

## Troubleshooting

**"subagent tool not found"**
→ Install pi-subagents: `pi install npm:pi-subagents`

**"Unknown agent: ml-optimist"**
→ Ensure the `.md` files exist in `.pi/agents/` with correct `name:` in frontmatter. Run `/reload`.

**Agent files not discovered**
→ The subagent tool must be invoked with `agentScope: "project"`. The orchestration message includes this.

**Model not available**
→ Check that you have an API key configured for the provider. Run `/login` or set the environment variable (e.g., `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`).
