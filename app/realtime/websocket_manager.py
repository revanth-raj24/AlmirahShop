from fastapi import WebSocket
from typing import List, Dict
import json
import logging

logger = logging.getLogger("fastecom")

class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.admin_connections: List[WebSocket] = []
        self.seller_connections: Dict[int, List[WebSocket]] = {}  # seller_id -> list of websockets

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.admin_connections:
            self.admin_connections.remove(websocket)
        # Remove from seller connections
        for seller_id, connections in list(self.seller_connections.items()):
            if websocket in connections:
                connections.remove(websocket)
                if not connections:
                    del self.seller_connections[seller_id]
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def connect_admin(self, websocket: WebSocket):
        await websocket.accept()
        if websocket not in self.admin_connections:
            self.admin_connections.append(websocket)
        if websocket not in self.active_connections:
            self.active_connections.append(websocket)
        logger.info(f"Admin WebSocket connected. Total admin connections: {len(self.admin_connections)}")

    async def connect_seller(self, websocket: WebSocket, seller_id: int):
        await websocket.accept()
        if websocket not in self.active_connections:
            self.active_connections.append(websocket)
        if seller_id not in self.seller_connections:
            self.seller_connections[seller_id] = []
        if websocket not in self.seller_connections[seller_id]:
            self.seller_connections[seller_id].append(websocket)
        logger.info(f"Seller {seller_id} WebSocket connected. Total seller connections: {len(self.seller_connections.get(seller_id, []))}")

    async def broadcast_to_admin(self, message: dict):
        """Broadcast message to all connected admin clients"""
        if not self.admin_connections:
            logger.debug("No active admin WebSocket connections to broadcast to")
            return
        
        disconnected = []
        for connection in self.admin_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to admin WebSocket: {e}")
                disconnected.append(connection)
        
        # Remove disconnected connections
        for conn in disconnected:
            self.disconnect(conn)

    async def broadcast_to_seller(self, seller_id: int, message: dict):
        """Broadcast message to all connected clients for a specific seller"""
        if seller_id not in self.seller_connections or not self.seller_connections[seller_id]:
            logger.debug(f"No active WebSocket connections for seller {seller_id}")
            return
        
        disconnected = []
        for connection in self.seller_connections[seller_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to seller {seller_id} WebSocket: {e}")
                disconnected.append(connection)
        
        # Remove disconnected connections
        for conn in disconnected:
            self.disconnect(conn)

# Global instance
websocket_manager = WebSocketManager()

