import time
from collections import deque

from fastapi import HTTPException


class RateLimiter:
    def __init__(self, max_requests: int = 30, window_seconds: int = 60) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[str, deque[float]] = {}

    def check(self, user_id: str) -> None:
        now = time.monotonic()
        if user_id not in self._requests:
            self._requests[user_id] = deque()

        bucket = self._requests[user_id]

        while bucket and bucket[0] <= now - self.window_seconds:
            bucket.popleft()

        if len(bucket) >= self.max_requests:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Max {self.max_requests} requests per {self.window_seconds}s.",
            )

        bucket.append(now)

    def headers(self, user_id: str) -> dict[str, str]:
        """Return rate limit headers for the given user. Call after check() for accurate remaining count."""
        now = time.monotonic()
        bucket = self._requests.get(user_id, deque())
        while bucket and bucket[0] <= now - self.window_seconds:
            bucket.popleft()
        remaining = max(0, self.max_requests - len(bucket))
        reset_ts = int(time.time() + self.window_seconds)
        if bucket:
            oldest = bucket[0]
            reset_ts = int(time.time() + max(0, oldest + self.window_seconds - now))
        return {
            "X-RateLimit-Limit": str(self.max_requests),
            "X-RateLimit-Remaining": str(remaining),
            "X-RateLimit-Reset": str(reset_ts),
        }
