"""
Integration tests: concurrent bid placement (Redis lock + MySQL SELECT FOR UPDATE).

Requires working .env (DATABASE_URL, REDIS_URL, SECRET_KEY, ALGORITHM, DATABASE_URL_SYNC, ENVIRONMENT)
and at least one active category in MySQL.

Run from repo root:
  .venv/bin/pytest tests/test_bid_concurrency.py -v

Force failure instead of skip when services are down:
  FORCE_INTEGRATION_TESTS=1 .venv/bin/pytest tests/test_bid_concurrency.py -v
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

import httpx
import pytest
import pytest_asyncio


PWD = "TestPass1a"


async def _login(client: httpx.AsyncClient, email: str) -> str:
    r = await client.post(
        "/auth/login",
        data={"username": email, "password": PWD},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest_asyncio.fixture
async def api_client(integration_ready):
    from app.main import app

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest_asyncio.fixture
async def live_auction_for_bids(api_client: httpx.AsyncClient, unique_suffix: str, integration_ready):
    r = await api_client.get("/categories/")
    assert r.status_code == 200, r.text
    cats = r.json()
    if not cats:
        pytest.skip("Need at least one active category in the database.")

    cat_id = cats[0]["id"]
    suf = unique_suffix

    for payload in (
        {"username": f"seller{suf}", "email": f"seller{suf}@example.com", "password": PWD},
        {"username": f"bidder1{suf}", "email": f"b1{suf}@example.com", "password": PWD},
        {"username": f"bidder2{suf}", "email": f"b2{suf}@example.com", "password": PWD},
    ):
        reg = await api_client.post("/auth/register", json=payload)
        assert reg.status_code == 201, reg.text

    seller_tok = await _login(api_client, f"seller{suf}@example.com")
    b1_tok = await _login(api_client, f"b1{suf}@example.com")
    b2_tok = await _login(api_client, f"b2{suf}@example.com")

    end = datetime.now(timezone.utc) + timedelta(days=7)
    create = await api_client.post(
        "/auctions/",
        headers={"Authorization": f"Bearer {seller_tok}"},
        json={
            "title": f"Concurrency {suf}",
            "description": "integration test auction",
            "category_id": cat_id,
            "starting_price": "100.00",
            "end_time": end.isoformat(),
        },
    )
    assert create.status_code == 201, create.text
    auction_id = create.json()["id"]

    act = await api_client.patch(
        f"/auctions/{auction_id}/status",
        headers={"Authorization": f"Bearer {seller_tok}"},
        json={"status": "active"},
    )
    assert act.status_code == 200, act.text

    return {
        "auction_id": auction_id,
        "bidder1_token": b1_tok,
        "bidder2_token": b2_tok,
    }


@pytest.mark.asyncio
async def test_concurrent_identical_bids_only_one_wins(
    api_client: httpx.AsyncClient,
    live_auction_for_bids: dict,
):
    """
    Many parallel POSTs with the same minimum raise: only one should commit at 101;
    the rest must lose against the updated current_price (Redis + FOR UPDATE).
    """
    aid = live_auction_for_bids["auction_id"]
    tok = live_auction_for_bids["bidder1_token"]
    n = 15

    async def place():
        return await api_client.post(
            f"/auctions/{aid}/bid",
            headers={"Authorization": f"Bearer {tok}"},
            json={"bid_amount": "101.00"},
        )

    results = await asyncio.gather(*[place() for _ in range(n)])
    ok = [r for r in results if r.status_code == 200]
    bad = [r for r in results if r.status_code == 400]

    assert len(ok) == 1, f"expected exactly one 200, got {len(ok)}: {[r.text for r in ok]}"
    assert len(bad) == n - 1
    for r in bad:
        detail = r.json().get("detail", "")
        if isinstance(detail, list):
            msg = " ".join(str(x.get("msg", x)) for x in detail)
        else:
            msg = str(detail)
        assert "exceed" in msg.lower(), r.text

    ga = await api_client.get(f"/auctions/{aid}")
    assert ga.status_code == 200
    body = ga.json()
    assert float(body["current_price"]) == 101.0
    assert body["total_bids"] == 1


@pytest.mark.asyncio
async def test_concurrent_two_bidders_same_increment_one_failure(
    api_client: httpx.AsyncClient,
    live_auction_for_bids: dict,
):
    """Two different bidders both bid 101 from 100 — one succeeds, one fails."""
    aid = live_auction_for_bids["auction_id"]
    t1 = live_auction_for_bids["bidder1_token"]
    t2 = live_auction_for_bids["bidder2_token"]

    async def p1():
        return await api_client.post(
            f"/auctions/{aid}/bid",
            headers={"Authorization": f"Bearer {t1}"},
            json={"bid_amount": "101.00"},
        )

    async def p2():
        return await api_client.post(
            f"/auctions/{aid}/bid",
            headers={"Authorization": f"Bearer {t2}"},
            json={"bid_amount": "101.00"},
        )

    r1, r2 = await asyncio.gather(p1(), p2())
    codes = sorted([r1.status_code, r2.status_code])
    assert codes == [200, 400]

    ga = await api_client.get(f"/auctions/{aid}")
    assert ga.status_code == 200
    assert ga.json()["total_bids"] == 1


@pytest.mark.asyncio
async def test_sequential_bids_both_succeed(
    api_client: httpx.AsyncClient,
    live_auction_for_bids: dict,
):
    aid = live_auction_for_bids["auction_id"]
    tok = live_auction_for_bids["bidder1_token"]
    h = {"Authorization": f"Bearer {tok}"}

    r1 = await api_client.post(f"/auctions/{aid}/bid", headers=h, json={"bid_amount": "105.00"})
    assert r1.status_code == 200, r1.text
    r2 = await api_client.post(f"/auctions/{aid}/bid", headers=h, json={"bid_amount": "110.00"})
    assert r2.status_code == 200, r2.text

    ga = await api_client.get(f"/auctions/{aid}")
    assert float(ga.json()["current_price"]) == 110.0
    assert ga.json()["total_bids"] == 2
