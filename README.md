# Auction & Bidding Platform Backend

A high-performance, asynchronous auction system built with **FastAPI**, **MySQL 8**, and **Redis**. This platform handles real-time bidding, automatic anti-sniping extensions, and secure user authentication.

---

## 🚀 Features
* **Asynchronous Stack:** High-concurrency architecture using FastAPI and SQLAlchemy (Asyncio).
* **Real-time Bidding:** WebSocket integration for instant price updates across all connected clients.
* **Database Management:** MySQL 8 with Alembic for versioned schema migrations.
* **Security:** JWT-based Authentication and Bcrypt password hashing.
* **Background Jobs:** APScheduler for automated auction closing and winner processing.
* **Concurrency Control:** Redis-based locking to prevent race conditions during heavy bidding.

---

## 🛠️ Tech Stack
* **Framework:** FastAPI
* **Database:** MySQL 8.0 (InnoDB)
* **ORM:** SQLAlchemy 2.0
* **Caching/Locking:** Redis
* **Migrations:** Alembic
* **Authentication:** PyJWT & Passlib (Bcrypt)

---

## 🏃 Getting Started

### 1. Prerequisites
* **Python:** 3.12+
* **Database:** MySQL 8.0+
* **Caching:** Redis Server 7.0+

### 2. Installation & Setup
Clone the repository and set up the virtual environment:

git clone https://github.com/philomaths6-sys/auction_and_bidding_platform_backend.git
cd auction_bid_backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

### 3. Environment Configuration
Create a .env file in the root directory:

DATABASE_URL=mysql+aiomysql://admin:Admin%4021814@localhost:3306/auction_db
DATABASE_URL_SYNC=mysql+pymysql://admin:Admin%4021814@localhost:3306/auction_db
REDIS_URL=redis://localhost:6379
SECRET_KEY=your_generate_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ENVIRONMENT=development

### 4. Database Migrations
Initialize your MySQL schema using Alembic:

# Apply migrations to your local MySQL instance
alembic upgrade head

# IMPORTANT: You must seed at least one category to create auctions
# Run this in your MySQL shell:
# INSERT INTO categories (name, description) VALUES ('Electronics', 'Devices');

### 5. Running the Application

# Start the FastAPI server with auto-reload
uvicorn app.main:app --reload

* **API Home:** http://127.0.0.1:8000
* **Swagger Documentation:** http://127.0.0.1:8000/docs

---

## 📂 Project Structure
├── app/
│   ├── models/       # SQLAlchemy Data Models (User, Auction, Bid, etc.)
│   ├── routers/      # API Route Handlers (Auth, Bids, Auctions)
│   ├── schemas/      # Pydantic Models for Request/Response Validation
│   ├── services/     # Business Logic (Bidding engine, Auction closing)
│   └── utils/        # Auth helpers, Redis client, WebSocket manager
├── migration/        # Alembic environment and version history
├── .env              # Environment secrets (DO NOT COMMIT)
├── .gitignore        # Git exclusion rules
├── alembic.ini       # Alembic config
└── requirements.txt  # Python package dependencies

---

## 🧪 Key API Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | /auth/register | Create a new user account |
| POST | /auth/login | Get JWT access token |
| GET | /auctions/ | Browse active/upcoming auctions |
| POST | /auctions/ | List a new item with images (Requires Auth) |
| POST | /auctions/{id}/bid | Place a bid (Checks for lock & balance) |
| WS | /ws/{id} | Connect to real-time bidding updates |
