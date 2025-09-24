from flask import Blueprint, Response, jsonify, request
from services.realtime import hub, Position
import time


bp = Blueprint("realtime", __name__)


@bp.get("/api/positions")
def get_positions():
    route_id = request.args.get("route_id", type=int)
    bus_id = request.args.get("bus_id", type=int)
    return jsonify(hub.get_snapshot(route_id=route_id, bus_id=bus_id))


@bp.post("/api/positions")
def post_position():
    data = request.get_json(force=True)
    pos = Position(
        bus_id=int(data["bus_id"]),
        latitude=float(data["latitude"]),
        longitude=float(data["longitude"]),
        heading=float(data.get("heading")) if data.get("heading") is not None else None,
        speed=float(data.get("speed")) if data.get("speed") is not None else None,
        timestamp=float(data.get("timestamp") or time.time()),
    )
    hub.update_position(pos)
    return jsonify({"ok": True})


@bp.get("/api/stream/positions")
def stream_positions():
    sub = hub.subscribe()
    return Response(sub.stream(), mimetype="text/event-stream")


