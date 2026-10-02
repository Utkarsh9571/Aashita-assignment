def test_docs_available(client):
    """Verify that Swagger UI documentation is available at /docs."""
    response = client.get("/docs")
    assert response.status_code == 200
    assert "swagger-ui" in response.text.lower()


def test_openapi_schema(client):
    """Verify that OpenAPI JSON specification is generated correctly."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    spec = response.json()
    assert spec["info"]["title"] == "Meeting Room Booking System API"
    assert "/api/rooms" in spec["paths"]
    assert "/api/bookings" in spec["paths"]
    assert "/api/rooms/{room_id}/next-available" in spec["paths"]


def test_health_check(client):
    """Verify API health endpoint."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_room_not_found(client):
    """Verify 404 response for non-existent room."""
    response = client.get("/api/rooms/99999")
    assert response.status_code == 404
    assert "was not found" in response.json()["detail"]


def test_next_available_room_not_found(client):
    """Verify 404 for next available on non-existent room."""
    response = client.get("/api/rooms/99999/next-available?date=2026-10-15&duration=30")
    assert response.status_code == 404
    assert "does not exist" in response.json()["detail"]


def test_next_available_invalid_duration(client):
    """Verify 400 for negative or zero duration."""
    response = client.get("/api/rooms/1/next-available?date=2026-10-15&duration=0")
    assert response.status_code == 400


def test_root_endpoint(client):
    """Verify root GET / endpoint returns 200 with service metadata and documentation links."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "Meeting Room Booking System API"
    assert data["status"] == "operational"
    assert data["documentation"] == "/docs"
    assert data["health"] == "/api/health"


def test_frontend_url_cors_settings():
    """Verify that FRONTEND_URL is cleanly parsed and added to allowed CORS origins."""
    from app.core.config import Settings
    s = Settings(FRONTEND_URL="https://my-custom-domain.vercel.app/")
    origins = s.parsed_cors_origins
    assert "https://my-custom-domain.vercel.app" in origins

