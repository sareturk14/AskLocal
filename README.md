<div align="center">

<br/>

# AskLocal

**Your documents. Your machine. Your answers.**

*A fully offline, privacy-first AI assistant — powered by local LLMs and vector search.*

<br/>

[![License: MIT](https://img.shields.io/badge/License-MIT-7c3aed?style=flat-square)](LICENSE)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows%2010%2F11-4338ca?style=flat-square)](https://www.microsoft.com/windows)
[![Python: 3.10+](https://img.shields.io/badge/Python-3.10%2B-818cf8?style=flat-square)](https://python.org)
[![React: 18+](https://img.shields.io/badge/React-18%2B-06b6d4?style=flat-square)](https://react.dev)

<br/>

</div>

---

## What is AskLocal?

AskLocal is a document-aware AI assistant that runs **100% on your own hardware**. No API keys. No subscriptions. No data leaving your machine.

Upload your PDFs, Word docs, presentations or text files — then ask questions in plain language. The system retrieves the most relevant passages from your documents and generates accurate, grounded answers using a local Large Language Model.

```
You ask a question  →  AskLocal finds the right passages  →  Local LLM generates an answer
                            (Vector Similarity Search)              (Offline, GPU-accelerated)
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          AskLocal Desktop                           │
│                                                                     │
│   ┌──────────────┐    HTTP/SSE     ┌────────────────────────────┐  │
│   │  React UI    │ ◄────────────► │     FastAPI Backend         │  │
│   │  (Vite)      │                │                             │  │
│   │  Port 5173   │                │  ┌──────────────────────┐  │  │
│   └──────────────┘                │  │  Ingest Pipeline      │  │  │
│                                   │  │  PDF/DOCX/PPTX/TXT    │  │  │
│                                   │  │  ↓ Chunking           │  │  │
│                                   │  │  ↓ Qwen3 Embedding    │  │  │
│                                   │  │  ↓ SQLite Vector DB   │  │  │
│                                   │  └──────────────────────┘  │  │
│                                   │                             │  │
│                                   │  ┌──────────────────────┐  │  │
│                                   │  │  RAG Engine           │  │  │
│                                   │  │  Cosine Similarity    │  │  │
│                                   │  │  Top-K Retrieval      │  │  │
│                                   │  │  ↓ Phi-3.5-mini       │  │  │
│                                   │  │  ↓ WinML / DirectX12  │  │  │
│                                   │  └──────────────────────┘  │  │
│                                   │      Port 8000              │  │
│                                   └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Features

| Feature | Details |
|---------|---------|
| 🔒 **100% Offline** | No internet connection required after setup. All computation is local. |
| ⚡ **GPU Acceleration** | Uses DirectX 12 / WinML via Microsoft Foundry Local SDK for fast inference. |
| 📄 **Multi-format Ingestion** | PDF, DOCX, PPTX, TXT — all parsed and indexed automatically. |
| 🧠 **Smart Retrieval** | Cosine similarity vector search with configurable Top-K and threshold. |
| 🎯 **Document Targeting** | Type `@filename` in chat to restrict search to a specific document. |
| 🚫 **Document Disable Toggle** | Temporarily exclude any document from RAG search without deleting it. |
| 🔁 **Streaming Responses** | Real-time token-by-token response streaming via Server-Sent Events. |
| 📌 **Pin & Organize** | Pin important chats and documents to top for quick access. |
| 🔬 **Source Inspector** | Click any response to see exactly which chunk and file it came from. |
| ⚙️ **Fine-grained RAG Control** | Adjust Top-K, similarity threshold and strict/lenient mode in Settings. |
| 💻 **Standalone .exe** | Package the entire app as a borderless native desktop app (no console). |

---

## Prerequisites

- **OS:** Windows 10 / 11 (64-bit) with DirectX 12 compatible GPU
- **Python:** 3.10 or 3.11
- **Node.js:** 18+
- **RAM:** 8 GB minimum (16 GB recommended)

---

## Getting Started

### 1 — Clone & Setup Python Environment

```bash
git clone https://github.com/yourusername/AskLocal.git
cd AskLocal

python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
```

### 2 — Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 3 — Launch

Double-click **`start_app.bat`** or run from terminal:

```bash
start_app.bat
```

This starts the FastAPI backend on **:8000** and the Vite dev server on **:5173**, then opens AskLocal in your browser automatically.

> **First launch:** The app will download the default AI models (~1-2 GB). This only happens once.

---

## Configuration

Open **Settings** (gear icon) to configure:

| Setting | Description |
|---------|-------------|
| **Chat Model** | Switch between available local LLMs |
| **Embedding Model** | Choose embedding accuracy vs. speed |
| **Top-K Context** | Number of document chunks retrieved per query (1–10) |
| **Similarity Threshold** | Minimum relevance score to include a chunk (0–100%) |
| **Strict Mode** | Forces the AI to refuse answering if no relevant chunks are found |

---

## Building a Standalone .exe

To package AskLocal as a single native Windows application:

```bash
python build_exe.py
```

Output: **`AskLocal-win-x64.exe`** — double-click to run with no dependencies, no console window.

---

## Project Structure

```
AskLocal/
├── backend/
│   ├── main.py          # FastAPI server — chat, documents, models, sessions
│   ├── ingest.py        # Document parsing & chunking pipeline
│   └── static/          # Built frontend (production)
├── frontend/
│   ├── public/
│   │   └── favicon.svg  # AskLocal icon
│   └── src/
│       ├── App.jsx      # Main UI — chat, sidebar, modals
│       └── App.css      # Dark theme design system
├── documents/           # Uploaded files stored here
├── knowledge_base.db    # SQLite vector store
├── build_exe.py         # Standalone desktop packaging script
├── start_app.bat        # Developer launcher
└── README.md
```

---

## Roadmap

- [ ] 🏷️ Document tagging & folder grouping
- [ ] 📤 Chat export to PDF / Markdown
- [ ] 🔊 Voice input (Web Speech API)
- [ ] 📊 Usage statistics dashboard
- [ ] 🆚 Side-by-side document comparison mode
- [ ] 🔀 Hybrid BM25 + vector search

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with ♥ — zero cloud, zero compromise.

</div>
