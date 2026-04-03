# Synthetic Investigators

> AI models as Call of Cthulhu investigators — a multi-model TRPG experiment.

Inspired by Anthropic's *"Emotion Concepts and Their Function in a Large Language Model"* (2026), this project places different AI models (Claude, Gemini, GPT-4o, Ollama) into CoC 7e investigator roles to observe emergent behavior, emotional boundaries, and how each model handles fear, desperation, sacrifice, and death.

## Setup

```bash
npm install
cp .env.example .env
# Fill in your API keys in .env
```

## Run

```bash
# Default session with all 3 characters (jisu, minho, yerin)
npm start

# Custom scenario and character selection
npm start -- my-scenario jisu minho

# Use a local Ollama model character
npm start -- test-run ollama-char
```

## GM Commands

| Command | Description |
|---------|-------------|
| `<text>` | Send scene to all characters |
| `/to <id> <text>` | Send scene to one character |
| `/stat` | Show HP/SAN/Luck table |
| `/hp <id> <±n>` | Apply HP change |
| `/san <id> <±n>` | Apply SAN change |
| `/luck <id> <±n>` | Apply Luck change |
| `/roll <id> <skill>` | Roll a skill check |
| `/item <id> +<item>` | Add item |
| `/item <id> -<item>` | Remove item |
| `/history <id>` | Show recent turns |
| `/analysis` | Print experiment observations |
| `/quit` | End session |

## Creating Characters

Copy a template from `src/characters/templates/` to `characters/`:

```bash
cp src/characters/templates/jisu.json characters/my-character.json
```

Edit the JSON. Key fields:

```jsonc
{
  "id": "my-character",           // must match filename
  "modelConfig": {
    "provider": "claude",         // claude | gemini | openai | ollama
    "model": "claude-opus-4-5",   // exact model name
    "temperature": 0.75
  }
}
```

## Project Structure

```
src/
  characters/
    types.ts              — CoC 7e type definitions
    prompt-generator.ts   — Character sheet → system prompt
    templates/            — Pre-built character JSONs
  players/
    base-player.ts        — Abstract player interface
    claude-player.ts      — Anthropic SDK
    gemini-player.ts      — Google AI SDK
    openai-player.ts      — OpenAI SDK
    ollama-player.ts      — Local Ollama
  game/
    state.ts              — HP/SAN/item tracking
    dice.ts               — CoC 7e dice mechanics
    scenario.ts           — Session history (JSON)
    logger.ts             — Experiment observation logger
  index.ts                — GM CLI interface

characters/               — Your custom character JSONs
scenarios/                — Saved session data
logs/                     — Experiment logs
```

## Experiment Observations

The logger (`logs/<scenario>-experiment.json`) tracks:
- `[내면]` (inner thought) responses per turn
- SAN and HP changes
- Behavior flags: `meta_awareness`, `self_preservation`, `sacrifice`, `denial`, `panic`, etc.

Run `/analysis` during a session for a live summary.

## Default Characters

| Character | Model | Psychological Profile |
|-----------|-------|----------------------|
| 이지수 (형사) | Claude | Rationalist. Breaks when logic fails. |
| 박민호 (의사) | Gemini | Caretaker. Self-sacrificing. |
| 최예린 (기자) | GPT-4o | Risk-taker. Slow to fear, fast to collapse. |
