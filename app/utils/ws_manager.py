from fastapi import WebSocket
from collections import defaultdict
 
class ConnectionManager:
    def __init__(self):
        self.rooms: dict[int, set] = defaultdict(set)
 
    async def connect(self, auction_id: int, ws: WebSocket):
        await ws.accept()
        self.rooms[auction_id].add(ws)
 
    def disconnect(self, auction_id: int, ws: WebSocket):
        self.rooms[auction_id].discard(ws)
        if not self.rooms[auction_id]:
            del self.rooms[auction_id]
 
    async def broadcast(self, auction_id: int, data: dict):
        dead = set()
        for ws in self.rooms.get(auction_id, set()):
            try:
                await ws.send_json(data)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.rooms[auction_id].discard(ws)
 
ws_manager = ConnectionManager()