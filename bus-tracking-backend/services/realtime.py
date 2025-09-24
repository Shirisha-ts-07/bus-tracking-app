import json
import time
from collections import defaultdict
from dataclasses import dataclass, asdict
from threading import Lock
from typing import Dict, Generator, List, Optional


@dataclass
class Position:
    bus_id: int
    latitude: float
    longitude: float
    heading: Optional[float] = None
    speed: Optional[float] = None
    timestamp: float = 0.0


class RealtimeHub:
    def __init__(self) -> None:
        self._latest: Dict[int, Position] = {}
        self._subscribers: List["Subscriber"] = []
        self._lock = Lock()

    def update_position(self, pos: Position) -> None:
        with self._lock:
            self._latest[pos.bus_id] = pos
            subs = list(self._subscribers)
        data = json.dumps({"type": "position", "payload": asdict(pos)})
        for s in subs:
            s.publish(data)

    def get_snapshot(self, route_id: Optional[int] = None, bus_id: Optional[int] = None):
        with self._lock:
            values = list(self._latest.values())
        if bus_id is not None:
            values = [p for p in values if p.bus_id == bus_id]
        # route filter is a no-op for now until buses link to routes in memory
        return [asdict(v) for v in values]

    def subscribe(self) -> "Subscriber":
        sub = Subscriber()
        with self._lock:
            self._subscribers.append(sub)
        def _on_close():
            with self._lock:
                if sub in self._subscribers:
                    self._subscribers.remove(sub)
        sub.on_close = _on_close
        return sub


class Subscriber:
    def __init__(self) -> None:
        self._buffer: List[str] = []
        self._lock = Lock()
        self._closed = False
        self.on_close = None

    def publish(self, data: str) -> None:
        with self._lock:
            if not self._closed:
                self._buffer.append(data)

    def close(self) -> None:
        with self._lock:
            self._closed = True
        if self.on_close:
            self.on_close()

    def stream(self) -> Generator[str, None, None]:
        try:
            # Initial comment to establish stream
            yield ":ok\n\n"
            while True:
                chunk: Optional[str] = None
                with self._lock:
                    if self._buffer:
                        chunk = self._buffer.pop(0)
                if chunk is None:
                    # heartbeat every 15s
                    yield f":keepalive {int(time.time())}\n\n"
                    time.sleep(15)
                    continue
                yield f"data: {chunk}\n\n"
        finally:
            self.close()


hub = RealtimeHub()


