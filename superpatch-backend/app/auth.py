from fastapi import HTTPException
from app.db.supabase_client import get_supabase_client


async def validate_request(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization.removeprefix("Bearer ")

    try:
        client = get_supabase_client()
        user_response = client.auth.get_user(token)
        user_id = user_response.user.id
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: no user ID")
        return str(user_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Token validation failed: {exc}") from exc
