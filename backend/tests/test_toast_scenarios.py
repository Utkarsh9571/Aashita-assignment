"""
Tests verifying backend response payloads for UI toast notifications and conflict messages.
Uses the isolated client fixture to ensure zero database pollution.
"""


def test_toast_scenario_conflict_detail(client):
    """Verify 409 returns exact conflict message and conflicting_booking structure"""
    # 1. Create a booking
    res1 = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Existing Board Meeting",
            "booking_date": "2026-11-20",
            "start_time": "14:00",
            "end_time": "15:30",
        },
    )
    assert res1.status_code == 201
    booking1 = res1.json()

    # 2. Attempt overlapping booking
    res2 = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Overlapping Sync",
            "booking_date": "2026-11-20",
            "start_time": "14:30",
            "end_time": "16:00",
        },
    )
    assert res2.status_code == 409
    body = res2.json()

    # CRITICAL: Verify exact human-readable message and conflict info
    assert "detail" in body
    assert "conflicting_booking" in body
    assert "Existing Board Meeting" in body["detail"]
    assert "14:00 - 15:30" in body["detail"]
    assert body["conflicting_booking"]["id"] == booking1["id"]
    assert body["conflicting_booking"]["title"] == "Existing Board Meeting"

    # Clean up
    client.delete(f"/api/bookings/{booking1['id']}")


def test_toast_scenario_room_not_found(client):
    """Verify 404 on non-existent room returns helpful message"""
    res = client.post(
        "/api/bookings",
        json={
            "room_id": 99999,
            "title": "Ghost Room Meeting",
            "booking_date": "2026-11-20",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )
    assert res.status_code == 404
    body = res.json()
    assert "detail" in body
    assert "99999" in body["detail"]


def test_toast_scenario_booking_not_found(client):
    """Verify 404 on cancellation of non-existent booking returns helpful message"""
    res = client.delete("/api/bookings/999999")
    assert res.status_code == 404
    body = res.json()
    assert "detail" in body
    assert "999999" in body["detail"]


def test_toast_scenario_validation_errors(client):
    """Verify 400 returns clear human-readable business validation messages"""
    # Start after end
    res = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Backwards Meeting",
            "booking_date": "2026-11-20",
            "start_time": "15:00",
            "end_time": "14:00",
        },
    )
    assert res.status_code == 400
    assert "strictly after" in res.json()["detail"].lower()

    # Outside working hours
    res2 = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Midnight Meeting",
            "booking_date": "2026-11-20",
            "start_time": "08:00",
            "end_time": "09:00",
        },
    )
    assert res2.status_code == 400
    assert "opening hours" in res2.json()["detail"].lower()


def test_toast_scenario_next_available_messages(client):
    """Verify next available returns clear messages when room not found, duration invalid, or slot computed"""
    # Invalid duration
    res = client.get("/api/rooms/1/next-available?date=2026-11-20&duration=0")
    assert res.status_code == 400
    assert "greater than 0" in res.json()["detail"]

    # Non-existent room
    res2 = client.get("/api/rooms/99999/next-available?date=2026-11-20&duration=30")
    assert res2.status_code == 404
    assert "99999" in res2.json()["detail"]

    # Valid slot search
    res3 = client.get("/api/rooms/1/next-available?date=2026-11-20&duration=45")
    assert res3.status_code == 200
    body = res3.json()
    assert body["available"] is True
    assert "09:00" in body["start_time"]
    assert "Available slot found" in body["message"]
