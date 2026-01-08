# Jinsoku

**Jinsoku (迅速)** – meaning *swift/quick* in Japanese – is a **web-based platform for Windows Event Log analysis and automated threat hunting**.

This project is developed as part of my **Final Year Project (FYP)**.  
Jinsoku provides a **Docker-based environment** with a web interface that automates the execution of **Hayabusa** and **Takajo** and presents the results in an easy-to-read format.

---

# 📌 Project Title

**Jinsoku: A Web-Based Platform for Windows Event Log Analysis and Threat Hunting Automation**

---

## 🎯 Introduction

Jinsoku is a dedicated web application platform for **Windows Event Log analysis** designed to assist:

- DFIR professionals  
- Blue teamers  
- System administrators  

The platform integrates community-driven DFIR tools:

- **Hayabusa** – fast detection & threat hunting  
- **Takajo** – post-processing and enrichment  

These tools are orchestrated automatically through a **web interface** and **Docker environment** to streamline the incident response workflow.

---

## 🎯 Aim

To design, develop, and evaluate a **secure, efficient, and user-friendly web-based log analysis & threat hunting platform** that:

- Automates detection pipelines  
- Accelerates incident response  
- Enhances threat visibility in Windows environments  

---

## 📚 Objectives

- Build a **modern web application platform** for Windows log analysis  
- Design an **automation pipeline** for:
  - Log ingestion  
  - Threat hunting  
  - Result processing  
- Integrate and orchestrate:
  - **Hayabusa**
  - **Takajo**
- Automate **report generation**:
  - Detected threats  
  - MITRE ATT&CK TTPs  
  - Event timeline  

---

## 👥 Target Users

- DFIR personnel  
- System administrators  
- Junior blue teamers  
- SOC analysts  

---

## ⚙️ Current Implementation

✔ Fully containerized **Docker environment**  
✔ Web interface to upload logs  
✔ Automated execution pipeline:
```

EVTX Logs → Hayabusa → Takajo → Results Dashboard

```
✔ Visualization of Takajo output files  
✔ Prototype platform for demonstration  

---

## 🏗 Architecture Overview

```

User → Web UI → Bash Scripts → Hayabusa → Takajo → Results → Dashboard

```

---

## 📂 Repository Structure

```

Jinsoku/
├── backend/         # API and script execution logic
├── frontend/        # Web UI
├── scripts/         # Automation bash scripts
├── tools/           # Hayabusa & Takajo
├── data/            # Sample logs
├── docker-compose.yml
└── README.md

````

---

## 🛠 Tech Stack

| Layer | Technology |
|--------|------------|
| Backend | Python / Node.js |
| Frontend | HTML, CSS, JS / React |
| DFIR Tools | Hayabusa, Takajo |
| Automation | Bash |
| Container | Docker |
| OS | Linux |

---

# 🚀 Installation (Docker)

```bash
git clone https://github.com/Agentkiller9/Jinsoku.git
cd Jinsoku
docker-compose up --build
````

Access web interface:

```
http://localhost:PORT
```

---

# 📖 Usage

1. Upload Windows EVTX logs
2. Click **Start Analysis**
3. System executes:

   * Hayabusa scan
   * Takajo enrichment
4. Results displayed:

   * Alerts
   * Timeline
   * CSV/JSON outputs
5. Download reports

---

# 🧪 Testing

```bash
docker-compose up --build
```

---

# 📌 FYP Redesign Plan

This current version is a **prototype**.
The platform will be **rebuilt from scratch** with improved architecture and features.

## Phase 1 – Automation Scripts

* Develop **interactive bash scripts**
* Automate:

  * Hayabusa execution
  * Takajo chaining
  * Result parsing
* Support:

  * Custom parameters
  * Preset hunting profiles

## Phase 2 – Web GUI Platform

* Build a **dedicated web interface**:

  * Script controller
  * Log uploader
  * Result viewer
* Implement:

  * Case management
  * Evidence tracking
  * Analyst notes

## Phase 3 – Case-Based Investigation

* Convert platform into:

  * Case-based system
* Each case includes:

  * Logs
  * Findings
  * Timeline
  * Notes
  * Reports

## Phase 4 – Additional Features Ideas

Planned integrations:

✔ VirusTotal API
✔ AI Chatbot:

* Q&A for logs
* Sigma rule explanation
* Report summarization

✔ Sigma Tools:

* Sigma rule generator
* Rule validation
* Rule testing

✔ Smart Reporting:

* Executive summary
* Technical appendix
* Risk scoring

---

# 📊 Future Enhancements

* Multi-user authentication
* RBAC (role-based access)
* SOC dashboard
* Alert severity scoring
* Cloud deployment

---

## 🤝 Contributions

This is an academic project.
Suggestions and improvements are welcome.

---

## 📜 License

MIT License

---

## 👨‍🎓 Author

**Mugtaba Shaikeldin**
Final Year Cybersecurity Student
Asia Pacific University (APU)

---

## 🙏 Acknowledgements

* YamatoSecurity – Hayabusa & Takajo
* Academic supervisors

---

## 📬 Contact

GitHub: [https://github.com/Agentkiller9](https://github.com/Agentkiller9)

