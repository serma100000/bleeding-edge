# Buildable Bleeding-Edge Research: February - March 2026

**Compiled:** March 21, 2026 | **Focus:** Things you can actually BUILD with today

---

## TOP PICKS: Most Interesting Things to Build With

### 1. DeepMind DiscoRL -- AI That Discovers Its Own RL Algorithms
- **What:** A neural network that IS an RL update rule, discovered via meta-learning. Outperforms ALL hand-designed RL algorithms (PPO, SAC, DQN) on Atari AND generalizes to unseen environments. Published in Nature.
- **Code:** `github.com/google-deepmind/disco_rl` (Apache 2.0)
- **Install:** `pip install git+https://github.com/google-deepmind/disco_rl.git`
- **Build:** Drop-in PPO/DQN replacement. Train game agents, robotics controllers, or meta-train your own RL algorithms for your domain.

### 2. Google HOPE (Nested Learning) -- Models That Never Forget
- **What:** Self-modifying recurrent architecture with Fast Weights (real-time) and Slow Weights (long-term). Directly solves catastrophic forgetting. Lower perplexity than standard transformers.
- **Code:** `github.com/obekt/HOPE-nested-learning` (community PyTorch + Gradio UI)
- **Build:** Agents that accumulate knowledge over time without retraining. Continual learning systems.

### 3. EZKL -- Zero-Knowledge Proofs for Any ML Model
- **What:** Takes any ONNX model, generates ZK-SNARK proofs of correct inference. Verifiable on-chain, in browsers, or on devices. Production-ready.
- **Code:** `github.com/zkonduit/ezkl` (Open source, Python/JS/CLI)
- **Build:** Verifiable AI oracles, decentralized model marketplaces, regulatory compliance (prove an approved model made a decision).

### 4. Covenant-72B -- First Decentralized 72B LLM Training
- **What:** 72B-parameter model trained across 70+ contributors on commodity hardware via Bittensor. 67.1 MMLU score. SparseLoCo provides 146x communication compression.
- **Code:** `github.com/opentensor/bittensor` | Weights on HuggingFace (Apache 2.0)
- **Paper:** `arxiv.org/pdf/2603.08163`
- **Build:** Contribute GPU cycles to decentralized training. Build custom subnets for domain-specific training.

### 5. Tether QVAC -- Fine-Tune Billion-Parameter Models on Your Phone
- **What:** World's first cross-platform BitNet LoRA framework. Fine-tune 1B models in 78 min on Samsung S25. 13B models on iPhone 16. 77.8% less VRAM than 16-bit.
- **Build:** Privacy-preserving personal AI trained entirely on-device. P2P federated fine-tuning networks.

### 6. Meta V-JEPA 2 -- Video World Model
- **What:** 1.2B parameter self-supervised video encoder trained on 1M+ hours. SOTA on motion understanding and action anticipation. Predicts in representation space, not pixels.
- **Code:** `github.com/facebookresearch/vjepa2`
- **Build:** Video understanding, robot perception, physical reasoning, action prediction from video.

### 7. NVIDIA NitroGen -- AI That Plays Any Video Game
- **What:** Vision-to-action foundation model trained on 40K hours of gameplay across 1000+ games. Maps raw frames to gamepad actions. 52% improvement on unseen games.
- **Code:** `github.com/MineDojo/NitroGen` + 40K hour dataset on HuggingFace
- **Build:** Game-playing agents, game testing automation, robotics transfer learning.

---

## OPEN-WEIGHT FOUNDATION MODELS (Ready to Deploy)

| Model | Active Params | Context | License | Standout Feature |
|-------|--------------|---------|---------|-----------------|
| OpenAI GPT-OSS-120B | 5.1B (MoE) | 128K | Apache 2.0 | OpenAI's first open model, runs on 1x 80GB GPU |
| Qwen 3.5-9B | 9B dense | 262K+ | Apache 2.0 | Matches 120B models at 1/13th the size |
| Qwen 3.5-397B | 17B (MoE) | 262K+ | Apache 2.0 | Competes with GPT-5 |
| Meta Llama 4 Scout | 17B (16 experts) | **10M** | Llama License | 10 million token context on a single H100 |
| Kimi K2.5 | 32B (1T total) | - | Modified MIT | Trillion-param with built-in agent swarm |
| NVIDIA Nemotron 3 Nano | 3.2B (Mamba-2+MoE) | - | Open | 3.3x faster inference than comparable models |
| IBM Granite 4.0 | 1-9B (Mamba-2 hybrid) | - | Apache 2.0 | ISO 42001 certified, 70% less RAM |
| Sarvam 105B | 10.3B (MoE) | 128K | Apache 2.0 | 22 Indic languages, built in India |
| Baidu ERNIE 4.5-VL | 3B active | - | Apache 2.0 | "Thinking with Images" -- zooms during reasoning |

---

## AI AGENT FRAMEWORKS

| Framework | Language | License | What It Does |
|-----------|----------|---------|-------------|
| OpenClaw | Multi-platform | MIT | Personal AI assistant, 50+ integrations, 310K+ GitHub stars |
| LangChain Open-SWE | Python | MIT | Autonomous coding agent, creates PRs, Slack/Linear/GitHub integration |
| Microsoft Agent Framework | Python/.NET | MIT | Unifies Semantic Kernel + AutoGen, time-travel debugging |
| VoltAgent | TypeScript | Open source | Best JS/TS agent framework with memory + tools |

---

## DISTRIBUTED SYSTEMS & DECENTRALIZED AI

### Infrastructure
| Project | What | Code | Readiness |
|---------|------|------|-----------|
| llm-d | K8s-native disaggregated LLM inference (Red Hat + NVIDIA + Google) | `github.com/llm-d/llm-d` | Production |
| Flower 1.26.1 | Leading federated learning framework | `github.com/flwrlabs/flower` | Production |
| APPFL | Privacy-preserving FL with differential privacy (Argonne) | `github.com/APPFL/APPFL` | Production |

### On-Chain AI
| Project | What | Status |
|---------|------|--------|
| 0G (Zero Gravity) | L1 blockchain for AI agents with TEE-verified inference | Mainnet live |
| Ritual Network | Modular AI execution layer (TEE + ZK) with 8K+ nodes | Live |
| ICP Caffeine | On-chain AI smart contracts, no cloud dependency | Live |

### ZKML (Verifiable ML)
| Project | What | Code |
|---------|------|------|
| EZKL | ONNX → ZK-SNARK proofs, EVM-verifiable | `github.com/zkonduit/ezkl` |
| zkDL | GPU-accelerated ZK deep learning (CUDA backend) | `github.com/SafeAILab/zkDL` |
| zkPyTorch | PyTorch → ZK proof compiler | Paper: `eprint.iacr.org/2025/535.pdf` |

### Novel Consensus
| Algorithm | Innovation | Published |
|-----------|-----------|-----------|
| Proof of Team Sprint (PoTS) | Collaborative mining, up to 64x energy savings | IET Blockchain 2026 |
| DRT-PBFT | Reputation-tree BFT, micro-blocks for constrained nodes | MDPI Future Internet March 2026 |

### Decentralized Storage
| Protocol | Innovation | Status |
|----------|-----------|--------|
| Walrus (on Sui) | RedStuff 2D erasure coding, 4.5x vs 10x replication | Live |
| Shelby (Aptos + Jump) | First decentralized hot storage, sub-second access | Early access |

---

## VIDEO & MEDIA GENERATION

| Model | What | Code | License |
|-------|------|------|---------|
| LTX-2.3 | 4K@50FPS video + audio, single pass, desktop app | `github.com/Lightricks/LTX-Video` | Apache 2.0 |

---

## ARCHITECTURE TRENDS (Sebastian Raschka's Analysis)

Key patterns across 10 open-weight LLMs released Jan-Feb 2026:

1. **Hybrid Mamba-2 + Attention** -- Linear-time attention replaces quadratic scaling (Granite 4.0, Nemotron 3)
2. **Multi-Level Attention (MLA)** -- Reduces KV-cache memory (Kimi K2.5, GLM-5)
3. **Massive MoE with tiny active params** -- Trillion total, billions active (GPT-OSS, Qwen, Kimi)
4. **Cognitive density > raw scale** -- Qwen 9B matching 120B models via better training recipes

---

## PROJECT IDEAS: What to Actually Build

### Tier 1: Start This Weekend
1. **Verifiable AI Agent** -- EZKL + any open model → prove AI decisions on-chain
2. **Self-Improving RL Agent** -- DiscoRL as drop-in replacement for PPO in any game/robotics env
3. **Video Content Pipeline** -- LTX-2.3 desktop app + script → automated video production
4. **Personal AI** -- OpenClaw + Qwen 3.5-9B running locally with full data sovereignty

### Tier 2: Build This Month
5. **Continual Learning Agent** -- HOPE architecture + RuVector for persistent memory
6. **Decentralized Inference Network** -- llm-d + Bittensor for distributed model serving
7. **ZKML Compliance Platform** -- EZKL + model registry → prove which model made which decision
8. **Autonomous Coding Team** -- Open-SWE + Microsoft Agent Framework for multi-agent dev pipeline

### Tier 3: Ambitious Project
9. **Decentralized Training Network** -- Bittensor subnet + Flower FL + Walrus storage
10. **World Model Platform** -- V-JEPA 2 + DiscoRL + HOPE for agents that understand physics and learn continuously

---

*Report compiled from 6 parallel research agents. Web-searched data covers Feb-March 2026 publications with verified GitHub/HuggingFace links.*
