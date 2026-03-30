from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

scheduler = AsyncIOScheduler()

def start_scheduler():
    from app.services.auction_service import close_ended_auctions
    scheduler.add_job(
        close_ended_auctions,
        trigger=IntervalTrigger(seconds=30),
        id='close_auctions',
        replace_existing=True
    )
    scheduler.start()