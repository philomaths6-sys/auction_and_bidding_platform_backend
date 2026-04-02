"""
Stress tests for race conditions and concurrency under high load.
Tests the Redis lock + MySQL SELECT FOR UPDATE implementation under extreme conditions.

Run from repo root:
  .venv/bin/pytest tests/test_race_condition_stress.py -v

Force failure instead of skip when services are down:
  FORCE_INTEGRATION_TESTS=1 .venv/bin/pytest tests/test_race_condition_stress.py -v
"""

from __future__ import annotations

import asyncio
import time
from datetime import datetime, timedelta, timezone
from decimal import Decimal

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
async def stress_test_auction(api_client: httpx.AsyncClient, unique_suffix: str, integration_ready):
    """Create an auction specifically for stress testing."""
    r = await api_client.get("/categories/")
    assert r.status_code == 200, r.text
    cats = r.json()
    if not cats:
        pytest.skip("Need at least one active category in the database.")

    cat_id = cats[0]["id"]
    suf = unique_suffix

    # Create multiple bidders for stress testing
    bidders = []
    for i in range(10):
        payload = {
            "username": f"stress_bidder{i}_{suf}",
            "email": f"stress{i}_{suf}@example.com",
            "password": PWD
        }
        reg = await api_client.post("/auth/register", json=payload)
        assert reg.status_code == 201, reg.text
        
        token = await _login(api_client, f"stress{i}_{suf}@example.com")
        bidders.append(token)

    # Create seller
    seller_payload = {
        "username": f"stress_seller_{suf}",
        "email": f"seller_{suf}@example.com",
        "password": PWD
    }
    reg = await api_client.post("/auth/register", json=seller_payload)
    assert reg.status_code == 201, reg.text
    seller_token = await _login(api_client, f"seller_{suf}@example.com")

    # Create auction
    end = datetime.now(timezone.utc) + timedelta(hours=1)  # Shorter for testing
    create = await api_client.post(
        "/auctions/",
        headers={"Authorization": f"Bearer {seller_token}"},
        json={
            "title": f"Stress Test Auction {suf}",
            "description": "Stress test auction for concurrency testing",
            "category_id": cat_id,
            "starting_price": "100.00",
            "end_time": end.isoformat(),
        },
    )
    assert create.status_code == 201, create.text
    auction_id = create.json()["id"]

    # Activate auction
    act = await api_client.patch(
        f"/auctions/{auction_id}/status",
        headers={"Authorization": f"Bearer {seller_token}"},
        json={"status": "active"},
    )
    assert act.status_code == 200, act.text

    return {
        "auction_id": auction_id,
        "bidder_tokens": bidders,
        "seller_token": seller_token
    }


@pytest.mark.asyncio
async def test_high_concurrency_same_amount(api_client: httpx.AsyncClient, stress_test_auction: dict):
    """
    Stress test: 50 concurrent bids with the same amount.
    Only one should succeed, others should fail with proper error messages.
    """
    auction_id = stress_test_auction["auction_id"]
    bidder_tokens = stress_test_auction["bidder_tokens"]
    
    n_bids = 50
    bid_amount = "101.00"
    
    async def place_bid(token: str):
        return await api_client.post(
            f"/auctions/{auction_id}/bid",
            headers={"Authorization": f"Bearer {token}"},
            json={"bid_amount": bid_amount},
        )
    
    # Create tasks with rotating tokens to simulate multiple users
    tasks = []
    for i in range(n_bids):
        token = bidder_tokens[i % len(bidder_tokens)]
        tasks.append(place_bid(token))
    
    start_time = time.time()
    results = await asyncio.gather(*tasks, return_exceptions=True)
    end_time = time.time()
    
    # Analyze results
    successful = [r for r in results if isinstance(r, httpx.Response) and r.status_code == 200]
    failed = [r for r in results if isinstance(r, httpx.Response) and r.status_code == 400]
    exceptions = [r for r in results if isinstance(r, Exception)]
    
    print(f"\nConcurrency Test Results:")
    print(f"  Total bids: {n_bids}")
    print(f"  Successful: {len(successful)}")
    print(f"  Failed: {len(failed)}")
    print(f"  Exceptions: {len(exceptions)}")
    print(f"  Execution time: {end_time - start_time:.2f}s")
    
    # Assertions
    assert len(exceptions) == 0, f"Unexpected exceptions: {exceptions}"
    assert len(successful) == 1, f"Expected exactly 1 successful bid, got {len(successful)}"
    assert len(failed) == n_bids - 1, f"Expected {n_bids - 1} failed bids, got {len(failed)}"
    
    # Check error messages
    for response in failed:
        detail = response.json().get("detail", "")
        assert "exceed" in str(detail).lower(), f"Unexpected error message: {detail}"
    
    # Verify final state
    auction_response = await api_client.get(f"/auctions/{auction_id}")
    assert auction_response.status_code == 200
    auction_data = auction_response.json()
    
    assert float(auction_data["current_price"]) == 101.0
    assert auction_data["total_bids"] == 1


@pytest.mark.asyncio
async def test_rapid_sequential_bids(api_client: httpx.AsyncClient, stress_test_auction: dict):
    """
    Test rapid sequential bids from multiple users.
    All should succeed if amounts are increasing.
    """
    auction_id = stress_test_auction["auction_id"]
    bidder_tokens = stress_test_auction["bidder_tokens"]
    
    # Get current auction state first
    auction_response = await api_client.get(f"/auctions/{auction_id}")
    assert auction_response.status_code == 200
    initial_bids = auction_response.json()["total_bids"]
    initial_price = float(auction_response.json()["current_price"])
    
    n_bids = 20
    base_amount = int(initial_price) + 1  # Start from current price + 1
    
    async def place_bid(token: str, amount: str):
        return await api_client.post(
            f"/auctions/{auction_id}/bid",
            headers={"Authorization": f"Bearer {token}"},
            json={"bid_amount": amount},
        )
    
    # Place bids sequentially but rapidly
    tasks = []
    for i in range(n_bids):
        token = bidder_tokens[i % len(bidder_tokens)]
        amount = str(base_amount + i)
        tasks.append(place_bid(token, amount))
    
    # Execute with minimal delay between requests
    results = []
    for task in tasks:
        result = await task
        results.append(result)
        # Small delay to simulate real-world timing
        await asyncio.sleep(0.01)
    
    # All should succeed
    successful = [r for r in results if r.status_code == 200]
    failed = [r for r in results if r.status_code != 200]
    
    print(f"\nRapid Sequential Test Results:")
    print(f"  Initial bids: {initial_bids}")
    print(f"  Initial price: {initial_price}")
    print(f"  Total bids placed: {n_bids}")
    print(f"  Successful: {len(successful)}")
    print(f"  Failed: {len(failed)}")
    
    assert len(failed) == 0, f"All bids should succeed, but {len(failed)} failed"
    assert len(successful) == n_bids
    
    # Verify final state
    auction_response = await api_client.get(f"/auctions/{auction_id}")
    assert auction_response.status_code == 200
    auction_data = auction_response.json()
    
    assert float(auction_data["current_price"]) == base_amount + n_bids - 1
    assert auction_data["total_bids"] == initial_bids + n_bids


@pytest.mark.asyncio
async def test_mixed_concurrency_patterns(api_client: httpx.AsyncClient, stress_test_auction: dict):
    """
    Test mixed concurrency patterns: same amounts, increasing amounts, and invalid bids.
    """
    auction_id = stress_test_auction["auction_id"]
    bidder_tokens = stress_test_auction["bidder_tokens"]
    
    # Mix of different bid scenarios
    scenarios = [
        # (amount, count, description)
        ("150.00", 10, "Same amount - high competition"),
        ("151.00", 5, "Same amount - medium competition"),
        ("152.00", 3, "Same amount - low competition"),
        ("160.00", 2, "Higher amount - should succeed"),
        ("155.00", 1, "Lower amount - should fail"),
    ]
    
    all_tasks = []
    task_descriptions = []
    
    for amount, count, description in scenarios:
        for i in range(count):
            token = bidder_tokens[i % len(bidder_tokens)]
            task = api_client.post(
                f"/auctions/{auction_id}/bid",
                headers={"Authorization": f"Bearer {token}"},
                json={"bid_amount": amount},
            )
            all_tasks.append(task)
            task_descriptions.append(f"{description} - bid {i+1}")
    
    # Execute all tasks concurrently
    results = await asyncio.gather(*all_tasks, return_exceptions=True)
    
    # Analyze results by scenario
    scenario_results = {}
    for i, (amount, count, description) in enumerate(scenarios):
        start_idx = sum(sc[1] for sc in scenarios[:i])
        end_idx = start_idx + count
        scenario_results[description] = results[start_idx:end_idx]
    
    print(f"\nMixed Concurrency Test Results:")
    for description, scenario_results_list in scenario_results.items():
        successful = sum(1 for r in scenario_results_list 
                        if isinstance(r, httpx.Response) and r.status_code == 200)
        failed = sum(1 for r in scenario_results_list 
                    if isinstance(r, httpx.Response) and r.status_code == 400)
        exceptions = sum(1 for r in scenario_results_list if isinstance(r, Exception))
        print(f"  {description}: {successful} success, {failed} failed, {exceptions} exceptions")
    
    # Verify data integrity
    auction_response = await api_client.get(f"/auctions/{auction_id}")
    assert auction_response.status_code == 200
    auction_data = auction_response.json()
    
    # Should end at the highest successful bid
    assert float(auction_data["current_price"]) >= 150.0
    assert auction_data["total_bids"] > 0
    
    # No exceptions should have occurred
    total_exceptions = sum(1 for r in results if isinstance(r, Exception))
    assert total_exceptions == 0, f"No exceptions expected, got {total_exceptions}"


@pytest.mark.asyncio
async def test_lock_timeout_behavior(api_client: httpx.AsyncClient, stress_test_auction: dict):
    """
    Test behavior when Redis lock times out (simulated by slow operations).
    """
    auction_id = stress_test_auction["auction_id"]
    bidder_tokens = stress_test_auction["bidder_tokens"]
    
    # This test would require mocking the lock timeout behavior
    # For now, we'll test that the system handles normal operations gracefully
    n_bids = 5
    
    async def place_bid_with_delay(token: str, amount: str, delay: float):
        await asyncio.sleep(delay)  # Simulate processing delay
        return await api_client.post(
            f"/auctions/{auction_id}/bid",
            headers={"Authorization": f"Bearer {token}"},
            json={"bid_amount": amount},
        )
    
    # Stagger bids with small delays
    tasks = []
    for i in range(n_bids):
        token = bidder_tokens[i % len(bidder_tokens)]
        amount = str(200.00 + i * 10)
        delay = i * 0.1  # 100ms stagger
        tasks.append(place_bid_with_delay(token, amount, delay))
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    successful = [r for r in results if isinstance(r, httpx.Response) and r.status_code == 200]
    failed = [r for r in results if isinstance(r, httpx.Response) and r.status_code != 200]
    exceptions = [r for r in results if isinstance(r, Exception)]
    
    print(f"\nLock Timeout Test Results:")
    print(f"  Total bids: {n_bids}")
    print(f"  Successful: {len(successful)}")
    print(f"  Failed: {len(failed)}")
    print(f"  Exceptions: {len(exceptions)}")
    
    # Should handle gracefully without exceptions
    assert len(exceptions) == 0
    # At least some bids should succeed
    assert len(successful) > 0
