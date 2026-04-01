"""
scripts/create_first_admin.py
──────────────────────────────
One-time script to bootstrap the first admin user into the database.

Enterprise placement rationale:
  Operational/management scripts live here at the project root alongside
  alembic.ini and requirements.txt — they are NOT application code.

Security measures:
  • Credentials read from env vars (CI/CD) or masked getpass prompts.
  • Password validation mirrors the UserCreate schema rules (min 8 chars).
  • Aborts if any admin already exists — fully idempotent.
  • Wraps all DB writes in a single async transaction (auto-rollback on error).

Usage:
  # Interactive
  python scripts/create_first_admin.py

  # Non-interactive (CI/CD — never commit these values)
  ADMIN_USERNAME=superadmin ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='S3cur3P@ss!' \\
      python scripts/create_first_admin.py
"""

import asyncio
import getpass
import os
import re
import sys

# ─── SECTION: Bootstrap ───────────────────────────────────────────────────────

# Add the project root to sys.path so `app.*` imports resolve when
# running this script from any working directory.
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from sqlalchemy import select
from app.database import AsyncSessionLocal, engine
from app.models.user import User, UserProfile
from app.utils.auth import hash_password

# ─── END SECTION: Bootstrap ───────────────────────────────────────────────────


EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')

# ─── SECTION: Validation (mirrors UserCreate schema rules) (NEW) ──────────────

def validate_email(email: str) -> str:
    email = email.strip().lower()
    if not EMAIL_RE.match(email):
        raise ValueError(f'Invalid email: {email!r}')
    return email


def validate_password(password: str) -> str:
    """
    Minimum rules from UserCreate schema:  len >= 8
    Extra admin hardening:  at least one uppercase + one digit.
    """
    if len(password) < 8:
        raise ValueError('Password must be at least 8 characters (UserCreate schema rule).')
    if not any(c.isupper() for c in password):
        raise ValueError('Admin password must contain at least one uppercase letter.')
    if not any(c.isdigit() for c in password):
        raise ValueError('Admin password must contain at least one digit.')
    return password


def validate_username(username: str) -> str:
    username = username.strip()
    if not username:
        raise ValueError('Username cannot be empty.')
    if len(username) > 50:   # matches Column(String(50)) on User model
        raise ValueError('Username cannot exceed 50 characters.')
    return username

# ─── END SECTION: Validation ──────────────────────────────────────────────────


# ─── SECTION: Credential Collection (NEW) ────────────────────────────────────

def collect_credentials() -> tuple[str, str, str]:
    username = os.environ.get('ADMIN_USERNAME', '').strip()
    email    = os.environ.get('ADMIN_EMAIL',    '').strip()
    password = os.environ.get('ADMIN_PASSWORD', '').strip()

    if username and email and password:
        print('[+] Credentials loaded from environment variables.')
        return username, email, password

    print('=' * 60)
    print('  Auction Platform — First Admin Setup')
    print('  Password will NOT be echoed to the terminal.')
    print('=' * 60)

    if not username:
        username = input('Admin username : ').strip()
    if not email:
        email = input('Admin email    : ').strip()
    if not password:
        password     = getpass.getpass('Admin password : ')
        password_chk = getpass.getpass('Confirm        : ')
        if password != password_chk:
            print('[!] Passwords do not match. Aborting.')
            sys.exit(1)

    return username, email, password

# ─── END SECTION: Credential Collection ──────────────────────────────────────


# ─── SECTION: Database Seed (NEW) ────────────────────────────────────────────

async def create_admin(username: str, email: str, password: str) -> None:
    async with AsyncSessionLocal() as db:
        async with db.begin():

            # Abort if ANY admin already exists.
            existing = (await db.execute(
                select(User).where(User.role == 'admin').limit(1)
            )).scalar_one_or_none()
            if existing:
                print('[!] An admin user already exists. Aborting.')
                print('    Use POST /admin/promote-admin to add more admins.')
                sys.exit(1)

            # Check uniqueness.
            if (await db.execute(select(User).where(User.username == username))).scalar_one_or_none():
                print(f'[!] Username {username!r} already taken. Aborting.')
                sys.exit(1)

            if (await db.execute(select(User).where(User.email == email))).scalar_one_or_none():
                print(f'[!] Email {email!r} already registered. Aborting.')
                sys.exit(1)

            user = User(
                username=username,
                email=email,
                password_hash=hash_password(password),
                role='admin',
                is_verified=True,
            )
            db.add(user)
            await db.flush()
            db.add(UserProfile(user_id=user.id))

    print(f'[✓] Admin user created.')
    print(f'    Username : {username}')
    print(f'    Email    : {email}')
    print(f'    ID       : {user.id}')

# ─── END SECTION: Database Seed ──────────────────────────────────────────────


async def main() -> None:
    try:
        username, email, password = collect_credentials()
        try:
            username = validate_username(username)
            email    = validate_email(email)
            password = validate_password(password)
        except ValueError as exc:
            print(f'[!] Validation error: {exc}')
            sys.exit(1)
        
        await create_admin(username, email, password)
    finally:
        # Cleanly close the connection pool to prevent 'Event loop is closed' 
        # warnings from aiomysql even if the script exited early via sys.exit()
        await engine.dispose()


if __name__ == '__main__':
    asyncio.run(main())
