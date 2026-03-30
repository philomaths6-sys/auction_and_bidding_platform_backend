
# 🏷️ Auction & Bidding Platform Backend

A **high-performance, asynchronous auction system** built with **FastAPI**, **MySQL 8**, and **Redis**.
Designed to handle **real-time bidding at scale**, with strong consistency, concurrency control, and secure authentication.

---

## 🚀 Features

### ⚡ Core Capabilities

* **Asynchronous Architecture** — Built using FastAPI + Async SQLAlchemy for high concurrency
* **Real-time Bidding** — WebSocket-based live updates across all connected clients
* **Anti-Sniping Mechanism** — Automatically extends auction time on last-moment bids
* **Concurrent Bid Handling** — Redis locking ensures no race conditions

### 🔐 Security

* JWT-based authentication
* Password hashing with Bcrypt
* Secure token expiration handling

### 🗄️ Data & Storage

* MySQL 8 (InnoDB) for transactional integrity
* Alembic for version-controlled migrations

### ⚙️ Background Processing

* APScheduler for:

  * Auction closing
  * Winner selection
  * Cleanup tasks

---

## 🛠️ Tech Stack

| Layer             | Technology               |
| ----------------- | ------------------------ |
| Backend Framework | FastAPI                  |
| Database          | MySQL 8.0                |
| ORM               | SQLAlchemy 2.0 (Async)   |
| Cache / Locking   | Redis                    |
| Migrations        | Alembic                  |
| Authentication    | PyJWT + Passlib (Bcrypt) |
| Scheduler         | APScheduler              |

---

## 📦 Getting Started

### 1️⃣ Prerequisites

Make sure you have:

* Python **3.12+**
* MySQL **8.0+**
* Redis **7.0+**

---

### 2️⃣ Installation

```bash
# Clone the repository
git clone https://github.com/philomaths6-sys/auction_and_bidding_platform_backend.git

# Navigate into project
cd auction_bid_backend

# Create virtual environment
python -m venv venv

# Activate environment
source venv/bin/activate   # Linux/Mac
venv\Scripts\activate      # Windows

# Install dependencies
pip install -r requirements.txt
```

---

### 3️⃣ Environment Configuration

Create a `.env` file in the root directory:

```env
DATABASE_URL=mysql+aiomysql://username:pass@localhost:3306/auction_db
DATABASE_URL_SYNC=mysql+pymysql://username:pass@localhost:3306/auction_db

REDIS_URL=redis://localhost:6379

SECRET_KEY=your_generate_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

ENVIRONMENT=development
```

---

### 4️⃣ Database Setup

Run migrations:

```bash
alembic upgrade head
```

Seed initial data (required):

```sql
INSERT INTO categories (name, description)
VALUES ('Electronics', 'Devices');
```

---

### 5️⃣ Run the Application

```bash
uvicorn app.main:app --reload
```

---

## 🌐 API Access

* **Base URL:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
* **Swagger Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 📂 Project Structure

```
├── app/
│   ├── models/       # Database Models (User, Auction, Bid)
│   ├── routers/      # API Routes (Auth, Auctions, Bids)
│   ├── schemas/      # Pydantic Schemas
│   ├── services/     # Business Logic Layer
│   └── utils/        # Helpers (Auth, Redis, WebSocket)
│
├── migration/        # Alembic Migrations
├── .env              # Environment Variables (DO NOT COMMIT)
├── alembic.ini       # Alembic Config
├── requirements.txt
```

---

## 🧪 API Endpoints

| Method | Endpoint             | Description                    |
| ------ | -------------------- | ------------------------------ |
| POST   | `/auth/register`     | Register new user              |
| POST   | `/auth/login`        | Login & get JWT                |
| GET    | `/auctions/`         | Get all auctions               |
| POST   | `/auctions/`         | Create auction (Auth required) |
| POST   | `/auctions/{id}/bid` | Place a bid                    |
| WS     | `/ws/{id}`           | Real-time bidding connection   |

---

## ⚡ System Design Highlights

* **Event-driven bidding engine**
* **Redis distributed locks** prevent double bidding conflicts
* **WebSockets scale horizontally** with shared state via Redis
* **Background scheduler ensures auction lifecycle automation**

---

## 🧠 Future Improvements

* Payment gateway integration (Stripe/Razorpay)
* Notification system (Email/SMS/Web Push)
* AI-based fraud detection
* ElasticSearch for advanced auction search
* Kubernetes-based deployment

---

## 🤝 Contributing

Contributions are welcome!

```bash
# Fork the repo
# Create your branch
git checkout -b feature/your-feature

# Commit changes
git commit -m "Add new feature"

# Push and create PR
git push origin feature/your-feature
```

---

## 📄 License

This project is licensed under the **MIT License**.

---
