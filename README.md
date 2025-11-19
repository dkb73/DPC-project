# 🕹️ Distributed Real-Time Tic-Tac-Toe
![aws diagram](https://github.com/user-attachments/assets/22847919-318b-4cd5-9dca-94d5a96b0c64)

A real-time, multiplayer Tic-Tac-Toe game developed as part of the **Distributed and Parallel Computing** course.  
The system supports **multiple concurrent game sessions**, built using **Flask-SocketIO**, and deployed on **AWS** using Docker.

---

## 🚀 System Architecture (OOP Design)
![oops diagram](https://github.com/user-attachments/assets/8e69f66a-2da9-482e-a8f9-93c62d35ac05)

The backend is structured using Object-Oriented principles to ensure **session isolation**, **clean state management**, and **scalability**.

### **Core Components**

#### **1. Server**
- Central controller of the entire application.
- Maintains:
  - `activeGamingRooms` – list of all game rooms currently running
  - `connectedPortalUsers` – list of all connected players via sockets
- Handles core socket events like **connect**, **disconnect**, **join**, and **turn**.

#### **2. GameRoom (1:N)**
- Represents a single active match.
- Enforces **2-player limit**.
- Ensures each game instance is fully isolated from others.

#### **3. Player (1:2)**
- Represents a connected user.
- Stores:
  - Unique Socket ID (`sid`)
  - Assigned mark (**X** or **O**)
  - Player readiness/intent to start

#### **4. GameState (1:1)**
- Dedicated logic handler for each GameRoom.
- Maintains:
  - **Board matrix**
  - Turn validation
  - Win/Draw detection via `update_board()`

---

## ☁️ Cloud Infrastructure (AWS Deployment)

The game is deployed using a containerized ci-cd pipeline on AWS via github-actions for reliability and portability.

### **Infrastructure Services**

#### **AWS ECR**
- Private container registry.
- Stores versioned `tic-tac-toe-app` Docker images.

#### **AWS IAM**
- Secure role-based permissions.
- Allows EC2 to pull images from ECR **without exposing credentials**.

### **Compute Layer**

#### **EC2 Instance (t3.micro)**
- Runs the Docker daemon and executes the game server container.

#### **Game Server Container**
- Runs the Flask-SocketIO backend on port **5000**.
- Maintains in-memory state for all active game sessions.

---

## 🛠️ Tech Stack

- **Language:** Python 3.9+
- **Framework:** Flask, Flask-SocketIO
- **Deployment:** Docker, AWS EC2, AWS ECR

---
