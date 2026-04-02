from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, users, auctions, bids, comments, watchlist, notifications, payments, ratings, admin, categories

app = FastAPI(
    title='Auction Platform API',
    version='1.0.0',
    description='Enterprise auction platform — FastAPI + MySQL',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(bids.router)
app.include_router(auctions.router)
app.include_router(comments.router)
app.include_router(watchlist.router)
app.include_router(notifications.router)
app.include_router(payments.router)
app.include_router(ratings.router)
app.include_router(admin.router)
app.include_router(categories.router)


@app.on_event('startup')
async def startup():
    from app.utils.scheduler import start_scheduler
    start_scheduler()


@app.on_event('shutdown')
async def shutdown():
    from app.utils.scheduler import scheduler
    scheduler.shutdown()


@app.get('/health')
async def health():
    return {'status': 'ok'}