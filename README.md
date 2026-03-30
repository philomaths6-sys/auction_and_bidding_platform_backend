# Auction & Bidding Platform Backend

A high-performance, asynchronous auction system built with **FastAPI**, **MySQL 8**, and **Redis**. This platform supports real-time bidding, automatic auction extensions (anti-sniping), and secure user authentication.

## 🚀 Features
* **Asynchronous Stack:** Built with FastAPI and SQLAlchemy (Asyncio) for high concurrency.
* **Real-time Bidding:** WebSocket integration for instant price updates.
* **Database Management:** MySQL 8 with Alembic for versioned migrations.
* **Security:** JWT Authentication and Bcrypt password hashing.
* **Background Tasks:** APScheduler for automated auction lifecycle management (closing ended auctions).
* **Concurrency Control:** Redis-based locking to prevent race conditions during high-volume bidding.

---

## 🛠️ Tech Stack
* **Framework:** FastAPI
* **Database:** MySQL 8 (InnoDB)
* **ORM:** SQLAlchemy 2.0
* **Task Queue/Cache:** Redis
* **Migrations:** Alembic
* **Authentication:** PyJWT & Passlib

---

## 🏃 Getting Started

### 1. Prerequisites
* Python 3.12+
* MySQL 8.0+
* Redis Server

### 2. Installation & Setup
Clone the repository and set up the virtual environment:
```bash
git clone [https://github.com/philomaths6-sys/auction_and_bidding_platform_backend.git](https://github.com/philomaths6-sys/auction_and_bidding_platform_backend.git)
cd auction_and_bidding_platform_backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
