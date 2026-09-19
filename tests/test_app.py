import os
from pathlib import Path


def register(client, *, next_url="/cursos"):
    return client.post(
        "/auth/register",
        data={
            "name": "Pessoa Teste",
            "email": "pessoa@example.org",
            "password": "SenhaForte123",
            "confirm_password": "SenhaForte123",
            "next": next_url,
        },
        follow_redirects=False,
    )


def test_health_is_reachable_and_not_cached(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.headers["cache-control"] == "no-store"


def test_stats_routes_are_not_captured_as_integer_ids(client):
    assert client.get("/api/publications/stats").json()["total"] == 0
    assert client.get("/api/projects/stats").json()["total"] == 0
    assert client.get("/api/team/stats").json()["total_active"] == 0


def test_unknown_api_route_returns_json_404(client):
    response = client.get("/api/does-not-exist")
    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/json")


def test_protected_pages_redirect_to_login(client):
    response = client.get("/cursos/python", follow_redirects=False)
    assert response.status_code == 303
    assert response.headers["location"].startswith("/login?next=")


def test_lms_endpoints_require_authentication(client):
    assert client.get("/api/courses/python/materials").status_code == 401
    assert client.get("/api/courses/python/forum").status_code == 401
    assert client.post("/api/courses/python/forum/topics", json={"title": "Uma dúvida"}).status_code == 401


def test_registration_sets_secure_session_shape_and_blocks_open_redirect(client):
    response = register(client, next_url="https://attacker.example/steal")
    assert response.status_code == 303
    assert response.headers["location"] == "/cursos"
    cookie = response.headers["set-cookie"]
    assert "HttpOnly" in cookie
    assert "SameSite=lax" in cookie


def test_cross_site_mutations_are_rejected(client):
    response = client.post(
        "/auth/login",
        data={"email": "person@example.org", "password": "Secret123"},
        headers={"Origin": "https://attacker.example", "Sec-Fetch-Site": "cross-site"},
    )
    assert response.status_code == 403


def test_authenticated_pages_and_private_stats_work(client):
    assert register(client).status_code == 303
    assert client.get("/profile").status_code == 200
    assert client.get("/settings").status_code == 200
    assert client.get("/cursos/python/forum").status_code == 200
    assert client.get("/api/contact/stats").status_code == 403
    os.environ["ADMIN_STATS_TOKEN"] = "test-admin-token"
    try:
        assert client.get("/api/contact/stats", headers={"X-Admin-Token": "test-admin-token"}).status_code == 200
    finally:
        os.environ.pop("ADMIN_STATS_TOKEN", None)


def test_password_change_uses_current_password_and_updates_hash(client):
    register(client)
    response = client.post(
        "/auth/change-password",
        json={
            "current_password": "SenhaForte123",
            "new_password": "OutraSenha456",
            "confirm_password": "OutraSenha456",
        },
    )
    assert response.status_code == 200
    client.post("/logout", follow_redirects=False)
    login = client.post(
        "/auth/login",
        data={"email": "pessoa@example.org", "password": "OutraSenha456", "next": "/profile"},
        follow_redirects=False,
    )
    assert login.status_code == 303
    assert login.headers["location"] == "/profile"


def test_auth_responses_are_never_publicly_cached(client):
    response = client.get("/api/auth/status")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"


def test_referenced_core_assets_exist():
    root = Path(__file__).resolve().parents[1]
    required = [
        "web/assets/img/logo/mlep-mark.svg",
        "web/assets/css/course-page.css",
        "web/aula.html",
        "web/forum.html",
        "web/forum-topic.html",
        "web/materiais.html",
        "web/profile.html",
        "web/settings.html",
    ]
    assert all((root / path).is_file() for path in required)
