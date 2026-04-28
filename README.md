# pi-peer-review
A simple pi.dev extension to spawn agents to review your ML papers
# ML Paper Peer Review Extension

A pi.dev extension that automates a rigorous, multi-agent peer review process for machine learning papers using the `pi-subagents` library.

## Requirements

- [pi.dev](https://pi.dev) installed
- `pi-subagents` package installed: `pi install npm:pi-subagents`
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
# Install subagents support
pi install npm:pi-subagents

# Run a review with defaults
/review-paper paper.tex

# Override specific models
/review-paper paper.tex \
  --meta-model=openai/gpt-5.5 \
  --critic-model=anthropic/claude-sonnet-4 \
  --visual-model=openai/gpt-4o
```

---

## Commands

### `/review-paper <paper.tex> [flags...]`

Run the full multi-agent peer review. Takes the path to a LaTeX paper and optional model overrides.

**Flags (all optional, overrides the model in the agent's .md file):**

| Flag | Agent | Default model |
|------|-------|---------------|
| `--meta-model=` | ml-meta-reviewer | `anthropic/claude-sonnet-4` |
| `--opt-model=` or `--optimist-model=` | ml-optimist | `anthropic/claude-haiku-4-5` |
| `--critic-model=` | ml-critic | `deepseek/deepseek-v4-flash` |
| `--skeptic-model=` | ml-skeptic | `deepseek/deepseek-v4-flash` |
| `--roast-model=` or `--roaster-model=` | ml-roaster | `deepseek/deepseek-v4-flash` |
| `--security-model=` or `--sentinel-model=` | ml-security-sentinel | `anthropic/claude-haiku-4-5` |
| `--authenticity-model=` or `--auth-model=` | ml-authenticity-inspector | `deepseek/deepseek-v4-flash` |
| `--literature-model=` or `--sleuth-model=` | ml-literature-sleuth | `deepseek/deepseek-v4-flash` |
| `--visual-model=` or `--vis-model=` | ml-visual-critic | `openai/gpt-4o` |

**Examples:**

```bash
# All defaults
/review-paper paper.tex

# One custom model
/review-paper paper.tex --critic-model=openai/gpt-5.5

# Every agent with a different model
/review-paper paper.tex \
  --meta-model=anthropic/claude-sonnet-4 \
  --opt-model=openai-codex/gpt-5.4-mini \
  --critic-model=deepseek/deepseek-v4-flash \
  --skeptic-model=google/gemini-3-pro \
  --roast-model=anthropic/claude-haiku-4-5 \
  --security-model=anthropic/claude-haiku-4-5 \
  --authenticity-model=deepseek/deepseek-v4-flash \
  --literature-model=deepseek/deepseek-v4-flash \
  --visual-model=openai/gpt-4o
```

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
| `ml-optimist.md` | Optimist | Novelty & empirical strengths | `anthropic/claude-haiku-4-5` | low | read, grep |
| `ml-critic.md` | Rigorous Critic | Methodology, baselines, math rigor | `deepseek/deepseek-v4-flash` | high | read, bash, grep |
| `ml-skeptic.md` | Big Picture Skeptic | Generalization, compute, societal impact | `deepseek/deepseek-v4-flash` | medium | read, grep |
| `ml-roaster.md` | Brutal Roaster | Cynical, cuts through hype & buzzwords | `deepseek/deepseek-v4-flash` | high | read, grep |
| `ml-security-sentinel.md` | Security Sentinel | Malicious payloads, prompt injections | `anthropic/claude-haiku-4-5` | medium | read, grep |
| `ml-authenticity-inspector.md` | Authenticity Inspector | AI-generated writing detection | `deepseek/deepseek-v4-flash` | medium | read, grep |
| `ml-literature-sleuth.md` | Literature Sleuth | Citation verification, SOTA check | `deepseek/deepseek-v4-flash` | high | read, grep, web_search |
| `ml-visual-critic.md` | Visual Critic | Figures, tables, PDF formatting | `openai/gpt-4o` | medium | read_pdf, bash |
| `ml-meta-reviewer.md` | Meta-Reviewer / Area Chair | Synthesizes reviews into final decision | `anthropic/claude-sonnet-4` | high | read, grep |

---

## Customizing Agents

Each agent's "soul" lives entirely in its `.md` file. You have full freedom to edit them.

### The agent file format

```
---
name: ml-optimist                        # Must match filename (minus .md)
description: Optimistic ML reviewer      # Shown in agent listings
model: anthropic/claude-haiku-4-5        # provider/model format
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

The review pipeline is driven by the agent list at the top of `extension/index.ts`:

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

Open `.pi/extensions/ml-paper-review/index.ts` and add the new agent name to `REVIEWER_AGENTS`:

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
# 1. Set models appropriate for your compute budget
/review-models \
  --meta-model=anthropic/claude-sonnet-4 \
  --opt-model=openai-codex/gpt-5.4-mini \
  --critic-model=deepseek/deepseek-v4-flash \
  --skeptic-model=deepseek/deepseek-v4-flash \
  --roast-model=openai-codex/gpt-5.4-mini \
  --security-model=anthropic/claude-haiku-4-5 \
  --authenticity-model=deepseek/deepseek-v4-flash \
  --literature-model=deepseek/deepseek-v4-flash \
  --visual-model=openai/gpt-4o

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

## File Locations

| What | Where |
|------|-------|
| Extension code | `.pi/extensions/ml-paper-review/index.ts` |
| Agent definitions | `.pi/agents/ml-*.md` |
| Package manifest | `.pi/extensions/ml-paper-review/package.json` |

All file paths are relative to your project root.

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
