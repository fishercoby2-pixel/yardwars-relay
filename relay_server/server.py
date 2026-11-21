"""
Yard Wars v1.1 - Cloud WebSocket Relay (Python AsyncIO Edition)
Pure Python WebSocket relay server with 4-letter room matchmaking.
"""

import asyncio
import json
import os
import random
import string
import sys

PORT = int(os.environ.get("PORT", 8765))
CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
rooms = {}  # room_code -> { "host": ws, "guest": ws }


def generate_code():
    code = "".join(random.choices(CHARS, k=4))
    return generate_code() if code in rooms else code


async def handle_client(websocket):
    client_room = None
    is_host = False

    try:
        async for message in websocket:
            # Handle text/JSON
            if isinstance(message, str):
                try:
                    data = json.loads(message)
                except Exception:
                    continue

                action = data.get("action")
                if action == "create_room":
                    code = (data.get("room_code") or generate_code()).upper()
                    rooms[code] = {"host": websocket, "guest": None}
                    client_room = code
                    is_host = True
                    print(f"[ROOM CREATED] Code: {code}")
                    await websocket.send(json.dumps({
                        "action": "room_created",
                        "room_code": code,
                        "is_host": True
                    }))

                elif action == "join_room":
                    code = (data.get("room_code") or "").upper().strip()
                    if code not in rooms:
                        await websocket.send(json.dumps({
                            "action": "error",
                            "message": f"Room '{code}' does not exist."
                        }))
                        continue
                    room = rooms[code]
                    if room["guest"] is not None:
                        await websocket.send(json.dumps({
                            "action": "error",
                            "message": f"Room '{code}' is already full."
                        }))
                        continue

                    room["guest"] = websocket
                    client_room = code
                    is_host = False
                    print(f"[ROOM JOINED] Guest paired in Room: {code}")

                    await websocket.send(json.dumps({
                        "action": "room_joined",
                        "room_code": code,
                        "is_host": False
                    }))
                    if room["host"]:
                        await room["host"].send(json.dumps({
                            "action": "peer_joined",
                            "room_code": code
                        }))

                elif action == "game_action":
                    if client_room and client_room in rooms:
                        room = rooms[client_room]
                        opponent = room["guest"] if is_host else room["host"]
                        if opponent:
                            await opponent.send(message)

                elif action == "ping":
                    await websocket.send(json.dumps({"action": "pong"}))

            # Handle binary packets directly
            elif isinstance(message, bytes):
                if client_room and client_room in rooms:
                    room = rooms[client_room]
                    opponent = room["guest"] if is_host else room["host"]
                    if opponent:
                        await opponent.send(message)

    except Exception as e:
        print(f"[ERROR] {e}")
    finally:
        if client_room and client_room in rooms:
            room = rooms[client_room]
            print(f"[DISCONNECT] {'Host' if is_host else 'Guest'} left room {client_room}")
            opponent = room["guest"] if is_host else room["host"]
            if opponent:
                try:
                    await opponent.send(json.dumps({
                        "action": "peer_left",
                        "message": "Host closed room." if is_host else "Opponent left."
                    }))
                except Exception:
                    pass
            if is_host:
                del rooms[client_room]
            else:
                room["guest"] = None


async def main():
    try:
        import websockets
    except ImportError:
        print("Please install websockets: pip install websockets")
        return

    print("====================================================")
    print(f"  YARD WARS v1.1 - CLOUD RELAY SERVER (Python)")
    print(f"  Listening on port {PORT}")
    print("====================================================")
    async with websockets.serve(handle_client, "0.0.0.0", PORT):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
