"""Backward-compatible authentication imports.

The application uses the local authentication implementation in
``app.auth_local``.  Keeping this module avoids breaking older imports while
ensuring there is only one session and cookie implementation.
"""

from app.auth_local import (  # noqa: F401
    AuthenticationError,
    clear_session_cookie,
    create_session_token,
    extract_next_url,
    get_current_user,
    get_current_user_optional,
    get_session_from_request,
    require_auth,
    sanitize_next_url,
    set_session_cookie,
    verify_session_token,
)
