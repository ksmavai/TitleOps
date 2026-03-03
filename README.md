# TitleOps: AI-Driven AIOps Agent

This repository contains my submission for the **First Canadian Title (FCT) Summer Student Program - AIOps Challenge**. 

TitleOps is a prototype autonomous Site Reliability Engineering (SRE) agent designed to detect, diagnose, and auto-remediate infrastructure and application incidents in simulated environments.

## 🎥 Video Demonstration
<video src="https://github.com/ksmavai/TitleOps/raw/main/TitleOps_Demo.mp4" controls="controls" style="max-width: 100%;">
  Your browser does not support the video tag.
</video>

---

## 🏗️ Architecture & Design

TitleOps is built with a decoupled frontend and backend architecture to simulate a real-world observability platform and control plane.

*   **Frontend (React/Vite/TypeScript/Tailwind):** A modern, skeuomorphic "Glassmorphism" dashboard that visualizes system telemetry, current health status, active incidents, and the autonomous actions taken by the AI agent.
*   **Backend (Python/FastAPI):** The control plane that handles the heavy lifting. It acts as the intermediary between the simulated environment, the observability platform (Datadog), and the LLM reasoning engine.
*   **Environment Simulator:** A custom-built engine (`simulator.py`) that generates synthetic microservice architectures, injects realistic failure scenarios (e.g., Database Deadlocks, Redis Timeouts), and emits corresponding telemetry and error logs.
*   **Observability Integration:** Integrates directly with the **Datadog API** to push realistic time-series metrics during incidents and query them back for live dashboard visualization.

### Workflow
1. **Detect (Telemetry):** The simulator pushes metrics (Latency, Error Rate, CPU) to Datadog. The dashboard polls this data to visualize system health.
2. **Diagnose (AI Analysis):** When a fault is injected, raw service logs are captured and sent to the LLM. The LLM acts as an experienced SRE to determine the severity, affected services, and root cause.
3. **Research (AI Remediation):** Based on the root cause, the LLM researches and proposes specific, executable bash/CLI commands to mitigate the issue.
4. **Execute (Auto-Remediation):** The user approves the proposed fixes. The backend simulates the execution of these commands, evaluating their effectiveness against the root cause, and resolves the incident if successful.
5. **Document (Post-Mortem):** An automated, Markdown-formatted incident post-mortem is generated, capturing the timeline, impact, and fixes applied.

---

## 🧠 AI Techniques & Logic Used

The core intelligence of TitleOps relies on **Large Language Models (LLMs)** acting as goal-oriented agents, specifically utilizing the **DeepSeek API**.

1. **Context-Aware Log Analysis (Prompt Engineering):** Instead of relying on static regex rules, the system passes unstructured application logs to the LLM with a strict JSON-schema system prompt. The LLM parses the noise to extract the exact failing component and root cause.
2. **Dynamic Remediation Generation:** The agent does not use runbooks. It takes the diagnosed root cause and dynamically generates shell commands to mitigate the specific issue based on its pre-trained knowledge of infrastructure (e.g., Kubernetes, Redis, databases).
3. **Autonomous Evaluation Loop:** When a fix is "executed", a secondary LLM validation step evaluates whether the proposed command logically addresses the diagnosed root cause (scoring it as a full or partial resolution). This simulates a closed-loop autonomous system verifying its own work.

---

## 🚀 Setup Instructions

To run this prototype locally, you need both Node.js (for the frontend) and Python 3 (for the backend).

### Prerequisites
1. Node.js (v18+)
2. Python (3.9+)
3. An active **Datadog** account (API Key + APP Key)
4. A **DeepSeek** API Key

### 1. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory with your API keys:
```env
DEEPSEEK_API_KEY=your_deepseek_api_key
DATADOG_API_KEY=your_datadog_api_key
DATADOG_APP_KEY=your_datadog_app_key
DATADOG_SITE=us5.datadoghq.com  # Change if your Datadog site is different (e.g., datadoghq.com)
```

Start the Python server:
```bash
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
Open a new terminal window in the root directory:
```bash
npm install
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## 🔮 Assumptions & Future Improvements

**Current Assumptions:**
*   **Simulated Environment:** Since I do not have a massive, live Kubernetes cluster to safely break, incidents and logs are heavily simulated. The agent generates *real* mitigation commands, but the execution of those commands is evaluated logically rather than actually run against a live server.
*   **Infrastructure-Level Fixes:** The assumption is that the AIOps agent is mitigating infrastructure issues (restarting pods, clearing caches) rather than committing code patches to business logic.

**Future Improvement Ideas:**
*   **Read-Only Integration with Real Clusters:** Connect the agent to a real, read-only Kubernetes cluster to fetch actual live logs and metrics instead of simulated ones.
*   **Vector Database for Runbooks:** Implement RAG (Retrieval-Augmented Generation) so the agent can query a vector database of previous post-mortems and internal company runbooks before guessing a fix.
*   **Multi-Agent Architecture:** Split the monolithic prompt into multi-agent debates (e.g., one agent proposes a fix, a "Security SRE" agent reviews the fix for safety, and an "Execution" agent runs it).
*   **Human-in-the-Loop Granularity:** Currently, the system requires human approval before execution. Future iterations could allow the agent to auto-execute *low-risk* actions (like clearing a cache) while requiring approval for *high-risk* actions (like dropping a database table).
