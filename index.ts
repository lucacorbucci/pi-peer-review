/**
 * ML Paper Peer Review Extension for pi
 *
 * Orchestrates a rigorous multi-agent peer review process for ML papers.
 *
 * Architecture:
 *   - 1 Meta-Reviewer (Area Chair) orchestrating 8 sub-reviewers
 *   - 8 specialized sub-reviewers: Optimist, Rigorous Critic, Big Picture Skeptic, Brutal Roaster,
 *     Security Sentinel, Authenticity Inspector, Literature Sleuth, Visual Critic
 *   - Uses pi-subagents for agent management and parallel execution
 *
 * Agent definitions live as standalone .md files in .pi/agents/:
 *   ml-optimist.md, ml-critic.md, ml-skeptic.md, ml-roaster.md, ml-meta-reviewer.md,
 *   ml-security-sentinel.md, ml-authenticity-inspector.md, ml-literature-sleuth.md, ml-visual-critic.md
 *
 * You can freely edit those files to customize each agent's persona, tools,
 * thinking level, etc. The extension only patches the model field when
 * you pass overrides via command flags.
 *
 * Usage:
 *   /review-paper <paper.tex> [--meta-model=...] [--opt-model=...]
 *     [--critic-model=...] [--skeptic-model=...] [--roast-model=...]
 *     [--security-model=...] [--authenticity-model=...] [--literature-model=...] [--visual-model=...]
 *
 * Requires: pi-subagents package installed
 *   pi install npm:pi-subagents
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";

// ============================================================================
// Agent Registry
// ============================================================================

/** Which agent files (in .pi/agents/) participate in the review pipeline */
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

const META_AGENT = "ml-meta-reviewer";

/** Canonical names for flag→agent mapping */
type AgentName = (typeof REVIEWER_AGENTS)[number] | typeof META_AGENT;

interface AgentFileInfo {
  name: AgentName;
  path: string; // full path to the .md file
  exists: boolean;
}

// ============================================================================
// Default Models (used to initialize new agent files, or when no .md exists)
// ============================================================================

const DEFAULT_MODELS: Record<AgentName, string> = {
  "ml-meta-reviewer": "anthropic/claude-sonnet-4",
  "ml-optimist": "anthropic/claude-haiku-4-5",
  "ml-critic": "deepseek/deepseek-v4-flash",
  "ml-skeptic": "deepseek/deepseek-v4-flash",
  "ml-roaster": "deepseek/deepseek-v4-flash",
  "ml-security-sentinel": "anthropic/claude-haiku-4-5",
  "ml-authenticity-inspector": "deepseek/deepseek-v4-flash",
  "ml-literature-sleuth": "deepseek/deepseek-v4-flash",
  "ml-visual-critic": "openai/gpt-4o",
};

// ============================================================================
// Flag → Agent mapping (user-facing flags)
// ============================================================================

const FLAG_TO_AGENT: Record<string, AgentName> = {
  "--meta-model": "ml-meta-reviewer",
  "--opt-model": "ml-optimist",
  "--optimist-model": "ml-optimist",
  "--critic-model": "ml-critic",
  "--skeptic-model": "ml-skeptic",
  "--roast-model": "ml-roaster",
  "--roaster-model": "ml-roaster",
  "--security-model": "ml-security-sentinel",
  "--sentinel-model": "ml-security-sentinel",
  "--authenticity-model": "ml-authenticity-inspector",
  "--auth-model": "ml-authenticity-inspector",
  "--literature-model": "ml-literature-sleuth",
  "--sleuth-model": "ml-literature-sleuth",
  "--visual-model": "ml-visual-critic",
  "--vis-model": "ml-visual-critic",
};

// ============================================================================
// Agent file I/O
// ============================================================================

/**
 * Read the current model line from an agent .md file.
 * Returns undefined if file doesn't exist or model line isn't found.
 */
function readAgentModel(filePath: string): string | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  const content = fs.readFileSync(filePath, "utf-8");
  const match = content.match(/^model:\s*(.+)$/m);
  return match ? match[1].trim() : undefined;
}

/**
 * Patch the model line in an agent .md file.
 * Preserves all other content (system prompt, tools, thinking, etc.).
 */
function patchAgentModel(filePath: string, newModel: string): void {
  let content: string;
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, "utf-8");
  } else {
    // Create minimal file if it doesn't exist
    const name = path.basename(filePath, ".md");
    content = [
      "---",
      `name: ${name}`,
      `description: Custom agent: ${name}`,
      `model: ${newModel}`,
      "tools: read,grep",
      "systemPromptMode: replace",
      "inheritProjectContext: false",
      "inheritSkills: false",
      "---",
      "",
      `# ${name}`,
      "",
      "(Customize this agent's system prompt here.)",
    ].join("\n");
  }

  // Replace or add the model line
  if (content.match(/^model:/m)) {
    content = content.replace(/^model:\s*.+$/m, `model: ${newModel}`);
  } else {
    // Insert after the tools or name line
    content = content.replace(
      /^(tools:\s*.+)$/m,
      `$1\nmodel: ${newModel}`,
    );
  }

  fs.writeFileSync(filePath, content, "utf-8");
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

// ============================================================================
// Argument Parsing
// ============================================================================

interface ParsedArgs {
  paperPath: string;
  models: Partial<Record<AgentName, string>>;
  error?: string;
}

function parseArgs(rawArgs: string): ParsedArgs {
  // Split on spaces that precede --flags
  const tokens = rawArgs.trim().split(/\s+(?=--)/);
  const positional = tokens.filter((t) => !t.startsWith("--"));

  if (positional.length === 0) {
    return {
      paperPath: "",
      models: {},
      error:
        "Missing required argument: path to LaTeX paper file.\nUsage: /review-paper <paper.tex> [--meta-model=...]",
    };
  }

  const paperPath = positional[0].trim();
  const models: Partial<Record<AgentName, string>> = {};

  for (const token of tokens) {
    if (!token.startsWith("--")) continue;
    const eqIdx = token.indexOf("=");
    if (eqIdx === -1) continue;
    const flag = token.slice(0, eqIdx).trim();
    const value = token.slice(eqIdx + 1).trim();
    const agent = FLAG_TO_AGENT[flag];
    if (agent && value) {
      models[agent] = value;
    }
  }

  return { paperPath, models };
}

// ============================================================================
// Orchestration message builder
// ============================================================================

function buildOrchestrationMessage(
  paperPath: string,
  agentsDir: string,
): string {
  const reviewerNames = REVIEWER_AGENTS.join(", ");
  const paperName = path.basename(paperPath);
  const pdfPath = paperPath.replace(/\.tex$/i, ".pdf");

  // Build the chain structure for the LLM to use with the subagent tool
  const parallelTasks = REVIEWER_AGENTS.map((name) => {
    let task: string;
    if (name === "ml-visual-critic") {
      task = `Review the compiled PDF at \`${pdfPath}\` (alongside the LaTeX source at \`${paperPath}\`). Read the PDF and evaluate all figures, tables, and visual formatting. Follow your reviewer persona strictly and output your review in the format specified by your system prompt.`;
    } else {
      task = `Review the LaTeX paper at \`${paperPath}\`. Read the file and any supporting files (e.g., .bib files in the same directory). Follow your reviewer persona strictly and output your review in the format specified by your system prompt.`;
    }
    return `        { agent: "${name}", task: "${task.replace(/"/g, '\\"')}" }`;
  }).join(",\n");

  // {previous} intentionally literal — the subagent tool resolves it at chain runtime
  const metaTask = `Synthesize the following 8 peer reviews into a single, cohesive Meta-Review document following your output format.

Reviewers:
- Reviewer 1 (Optimist): Novelty & empirical strengths
- Reviewer 2 (Rigorous Critic): Methodology, baselines, math rigor
- Reviewer 3 (Big Picture Skeptic): Generalization, compute, societal impact
- Reviewer 4 (Brutal Roaster): Cynical cuts through hype & buzzwords
- Reviewer 5 (Security Sentinel): Malicious payloads, prompt injections, adversarial content
- Reviewer 6 (Authenticity Inspector): AI-generated writing detection, voice & tone
- Reviewer 7 (Literature Sleuth): Citation hallucination check, SOTA cross-reference
- Reviewer 8 (Visual Critic): Figures, tables, formatting, accessibility

Below are all 8 reviews:

{previous}`;

  // Escape for embedding in JSON string
  const metaTaskJson = metaTask.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");

  return `## Multi-Agent Peer Review

Review the following ML paper: **\`${paperPath}\`**

### Instructions

Use the \`subagent\` tool to run a **chain** with two steps:

**Step 1 — Parallel Review:** Spawn all 8 reviewers concurrently via a \`parallel\` step.

**Step 2 — Meta-Review Synthesis:** Feed all reviews to \`${META_AGENT}\` using \`{previous}\`.

\`\`\`json
{
  chain: [
    {
      parallel: [
${parallelTasks}
      ]
    },
    {
      agent: "${META_AGENT}",
      task: "${metaTaskJson}"
    }
  ]
}
\`\`\`

### Important

- Use \`agentScope: "project"\` to discover agents from \`${agentsDir}\`
- Set \`clarify: false\` to skip interactive prompts
- Execute the chain now`;
}

// ============================================================================
// Extension Entry Point
// ============================================================================

export default function (pi: ExtensionAPI) {
  // ── /review-paper ────────────────────────────────────────────────
  pi.registerCommand("review-paper", {
    description:
      "Run multi-agent peer review on a LaTeX ML paper. " +
      "Usage: /review-paper <paper.tex> [--meta-model=...] [--opt-model=...] " +
      "[--critic-model=...] [--skeptic-model=...] [--roast-model=...] " +
      "[--security-model=...] [--authenticity-model=...] [--literature-model=...] [--visual-model=...]",

    handler: async (args, ctx) => {
      if (!args || !args.trim()) {
        ctx.ui.notify(
          "Usage: /review-paper <paper.tex> [--meta-model=...] [--opt-model=...] [--critic-model=...] [--skeptic-model=...] [--roast-model=...] [--security-model=...] [--authenticity-model=...] [--literature-model=...] [--visual-model=...]",
          "error",
        );
        return;
      }

      const parsed = parseArgs(args);
      if (parsed.error) {
        ctx.ui.notify(parsed.error, "error");
        return;
      }

      const paperPath = path.isAbsolute(parsed.paperPath)
        ? parsed.paperPath
        : path.resolve(ctx.cwd, parsed.paperPath);

      if (!fs.existsSync(paperPath)) {
        ctx.ui.notify(`Paper file not found: ${paperPath}`, "error");
        return;
      }

      const agentsDir = path.join(ctx.cwd, ".pi", "agents");
      ensureDir(agentsDir);

      // Collect all agent names
      const allAgentNames = [...REVIEWER_AGENTS, META_AGENT];

      // Patch model fields for any overrides; leave existing files untouched otherwise
      for (const name of allAgentNames) {
        const filePath = path.join(agentsDir, `${name}.md`);
        const overrideModel = parsed.models[name as AgentName];
        if (overrideModel) {
          patchAgentModel(filePath, overrideModel);
        } else if (!fs.existsSync(filePath)) {
          // Create with default model if file doesn't exist
          const defaultModel = DEFAULT_MODELS[name as AgentName];
          patchAgentModel(filePath, defaultModel);
        }
      }

      // Report configuration
      const agentStatus = allAgentNames.map((name) => {
        const filePath = path.join(agentsDir, `${name}.md`);
        const model = readAgentModel(filePath) ?? DEFAULT_MODELS[name];
        const patched = parsed.models[name] ? " [patched]" : "";
        return `  ${name}: ${model}${patched}`;
      }).join("\n");

      ctx.ui.notify(
        `📄 Paper: ${path.basename(paperPath)}\n🤖 Agents:\n${agentStatus}`,
        "info",
      );

      // Dispatch the orchestration message
      const message = buildOrchestrationMessage(paperPath, agentsDir);
      pi.sendUserMessage(message);

      ctx.ui.notify(
        "🚀 Review chain dispatched. The orchestrator will spawn 8 sub-reviewers in parallel, then synthesize.",
        "success",
      );
    },
  });

  // ── /review-models ───────────────────────────────────────────────
  pi.registerCommand("review-models", {
    description:
      "Show or set default models for /review-paper. " +
      "Usage: /review-models [--meta-model=...] [--opt-model=...] ...",

    handler: async (args, ctx) => {
      const agentsDir = path.join(ctx.cwd, ".pi", "agents");
      const allNames = [...REVIEWER_AGENTS, META_AGENT];

      if (!args || !args.trim()) {
        // Show current models
        let msg = "Current agent models:\n";
        for (const name of allNames) {
          const filePath = path.join(agentsDir, `${name}.md`);
          const model = readAgentModel(filePath) ?? DEFAULT_MODELS[name];
          const exists = fs.existsSync(filePath);
          msg += `  ${name}: ${model}${exists ? "" : " (default)"}\n`;
        }
        msg += "\nAgent files live in .pi/agents/ — edit them to customize prompts, tools, etc.";
        msg += "\nPass flags to override models: /review-models --critic-model=anthropic/claude-sonnet-4";
        ctx.ui.notify(msg, "info");
        return;
      }

      // Parse model overrides
      const parsed = parseArgs(`dummy.tex ${args}`);
      if (parsed.error) {
        ctx.ui.notify(parsed.error, "error");
        return;
      }

      ensureDir(agentsDir);
      for (const [name, model] of Object.entries(parsed.models)) {
        const filePath = path.join(agentsDir, `${name}.md`);
        patchAgentModel(filePath, model);
      }

      const summary = Object.entries(parsed.models)
        .map(([name, model]) => `  ${name}: ${model}`)
        .join("\n");
      ctx.ui.notify(`✅ Models updated:\n${summary}`, "success");
    },
  });
}
