def test_list_rooms(client):
    """Verify that seeded rooms are returned."""
    response = client.get("/api/rooms")
    assert response.status_code == 200
    rooms = response.json()
    assert len(rooms) >= 5
    names = [r["name"] for r in rooms]
    assert "Boardroom Alpha" in names
    assert "Creative Lab" in names


def test_create_booking_success(client):
    """Test standard booking creation within working hours."""
    payload = {
        "room_id": 1,
        "title": "Quarterly Strategy Review",
        "date": "2026-10-15",
        "start_time": "10:00",
        "end_time": "11:30",
    }
    response = client.post("/api/bookings", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Quarterly Strategy Review"
    assert data["room_id"] == 1
    assert data["date"] == "2026-10-15"
    assert data["start_time"] == "10:00"
    assert data["end_time"] == "11:30"
    assert "id" in data


def test_get_booking_by_id(client):
    """Verify retrieving a single booking by ID (200) and not found (404)."""
    create_res = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "One-on-One",
            "date": "2026-10-16",
            "start_time": "14:00",
            "end_time": "15:00",
        },
    )
    assert create_res.status_code == 201
    booking_id = create_res.json()["id"]

    # 200 OK
    get_res = client.get(f"/api/bookings/{booking_id}")
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "One-on-One"

    # 404 Not Found
    not_found_res = client.get("/api/bookings/99999")
    assert not_found_res.status_code == 404
    assert "not found" in not_found_res.json()["detail"].lower()


def test_create_booking_room_not_found(client):
    """Attempting to book a non-existent room returns 404."""
    res = client.post(
        "/api/bookings",
        json={
            "room_id": 99999,
            "title": "Ghost Room Meeting",
            "date": "2026-10-16",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )
    assert res.status_code == 404
    assert "does not exist" in res.json()["detail"].lower()


def test_create_booking_whitespace_title_rejected(client):
    """Attempting to book with only whitespace title returns 400."""
    res = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "   ",
            "date": "2026-10-16",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )
    assert res.status_code == 400
    assert "whitespace" in res.json()["detail"].lower()


def test_create_booking_missing_fields(client):
    """Missing mandatory fields returns 400 Bad Request."""
    res = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            # title missing
            "date": "2026-10-16",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )
    assert res.status_code == 400
    assert "title" in res.json()["detail"].lower()


def test_booking_validation_outside_hours(client):
    """Verify booking before 09:00 or after 18:00 is rejected with 400."""
    # Before 09:00
    res1 = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Early Bird",
            "date": "2026-10-15",
            "start_time": "08:30",
            "end_time": "09:30",
        },
    )
    assert res1.status_code == 400
    assert "cannot be before opening hours (09:00)" in res1.json()["detail"]

    # After 18:00
    res2 = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Late Night",
            "date": "2026-10-15",
            "start_time": "17:30",
            "end_time": "18:30",
        },
    )
    assert res2.status_code == 400
    assert "cannot exceed closing hours (18:00)" in res2.json()["detail"]


def test_booking_validation_invalid_order(client):
    """Verify start_time >= end_time is rejected with 400."""
    res = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Time Machine Meeting",
            "date": "2026-10-15",
            "start_time": "14:00",
            "end_time": "13:00",
        },
    )
    assert res.status_code == 400
    assert "must be strictly after start time" in res.json()["detail"]


def test_back_to_back_bookings_allowed(client):
    """
    CRITICAL REQUIREMENT: Back-to-back bookings MUST be allowed!
    E.g., 10:00 - 11:00 and 11:00 - 12:00 in the same room.
    """
    first_res = client.post(
        "/api/bookings",
        json={
            "room_id": 2,
            "title": "Session 1",
            "date": "2026-10-20",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )
    assert first_res.status_code == 201

    second_res = client.post(
        "/api/bookings",
        json={
            "room_id": 2,
            "title": "Session 2",
            "date": "2026-10-20",
            "start_time": "11:00",
            "end_time": "12:00",
        },
    )
    assert second_res.status_code == 201


def test_conflict_partial_overlap_beginning(client):
    """Existing 10:00-11:00, new 09:30-10:30 -> Conflict 409."""
    base = client.post(
        "/api/bookings",
        json={
            "room_id": 3,
            "title": "Base Booking",
            "date": "2026-10-22",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )
    assert base.status_code == 201

    conflict = client.post(
        "/api/bookings",
        json={
            "room_id": 3,
            "title": "Overlap Start",
            "date": "2026-10-22",
            "start_time": "09:30",
            "end_time": "10:30",
        },
    )
    assert conflict.status_code == 409
    body = conflict.json()
    assert "Base Booking" in body["detail"]
    assert body["conflicting_booking"]["title"] == "Base Booking"
    assert body["conflicting_booking"]["start_time"] == "10:00"
    assert body["conflicting_booking"]["end_time"] == "11:00"


def test_conflict_partial_overlap_end(client):
    """Existing 10:00-11:00, new 10:30-11:30 -> Conflict 409."""
    client.post(
        "/api/bookings",
        json={
            "room_id": 3,
            "title": "Base Booking",
            "date": "2026-10-23",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )
    conflict = client.post(
        "/api/bookings",
        json={
            "room_id": 3,
            "title": "Overlap End",
            "date": "2026-10-23",
            "start_time": "10:30",
            "end_time": "11:30",
        },
    )
    assert conflict.status_code == 409
    assert "conflicting_booking" in conflict.json()


def test_conflict_new_fully_contains_existing(client):
    """Existing 10:00-11:00, new 09:30-11:30 -> Conflict 409."""
    client.post(
        "/api/bookings",
        json={
            "room_id": 4,
            "title": "Inner Booking",
            "date": "2026-10-24",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )
    conflict = client.post(
        "/api/bookings",
        json={
            "room_id": 4,
            "title": "Outer Booking",
            "date": "2026-10-24",
            "start_time": "09:30",
            "end_time": "11:30",
        },
    )
    assert conflict.status_code == 409
    assert conflict.json()["conflicting_booking"]["title"] == "Inner Booking"


def test_conflict_existing_fully_contains_new(client):
    """Existing 09:30-11:30, new 10:00-11:00 -> Conflict 409."""
    client.post(
        "/api/bookings",
        json={
            "room_id": 4,
            "title": "Long Session",
            "date": "2026-10-25",
            "start_time": "09:30",
            "end_time": "11:30",
        },
    )
    conflict = client.post(
        "/api/bookings",
        json={
            "room_id": 4,
            "title": "Short Session",
            "date": "2026-10-25",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )
    assert conflict.status_code == 409
    assert conflict.json()["conflicting_booking"]["title"] == "Long Session"


def test_conflict_identical_time_ranges(client):
    """Existing 10:00-11:00, new 10:00-11:00 -> Conflict 409."""
    client.post(
        "/api/bookings",
        json={
            "room_id": 5,
            "title": "First Booker",
            "date": "2026-10-26",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )
    conflict = client.post(
        "/api/bookings",
        json={
            "room_id": 5,
            "title": "Second Booker",
            "date": "2026-10-26",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )
    assert conflict.status_code == 409
    assert conflict.json()["conflicting_booking"]["title"] == "First Booker"


def test_cancel_booking(client):
    """Create a booking then cancel it successfully."""
    create_res = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Temporary Sync",
            "date": "2026-10-27",
            "start_time": "15:00",
            "end_time": "16:00",
        },
    )
    booking_id = create_res.json()["id"]

    del_res = client.delete(f"/api/bookings/{booking_id}")
    assert del_res.status_code == 200
    assert "successfully cancelled" in del_res.json()["message"]

    # Try deleting again -> 404
    del_res2 = client.delete(f"/api/bookings/{booking_id}")
    assert del_res2.status_code == 404


def test_filter_bookings_by_room_and_date(client):
    """Test filtering bookings by date and room."""
    # Create bookings in room 1 and room 2 on date 2026-11-01
    client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Room 1 Meeting",
            "date": "2026-11-01",
            "start_time": "09:00",
            "end_time": "10:00",
        },
    )
    client.post(
        "/api/bookings",
        json={
            "room_id": 2,
            "title": "Room 2 Meeting",
            "date": "2026-11-01",
            "start_time": "09:00",
            "end_time": "10:00",
        },
    )

    # Filter by date only
    res_date = client.get("/api/bookings?date=2026-11-01")
    assert res_date.status_code == 200
    titles = [b["title"] for b in res_date.json()]
    assert "Room 1 Meeting" in titles
    assert "Room 2 Meeting" in titles

    # Filter by date AND room_id
    res_room1 = client.get("/api/bookings?date=2026-11-01&room_id=1")
    assert res_room1.status_code == 200
    assert len(res_room1.json()) == 1
    assert res_room1.json()[0]["title"] == "Room 1 Meeting"

    # Filter with non-existent room_id -> 404
    res_invalid_room = client.get("/api/bookings?room_id=99999")
    assert res_invalid_room.status_code == 404


def test_get_room_bookings_endpoint(client):
    """Test GET /api/rooms/{room_id}/bookings endpoint with date filter."""
    client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Special Session",
            "date": "2026-11-05",
            "start_time": "11:00",
            "end_time": "12:00",
        },
    )

    res = client.get("/api/rooms/1/bookings?date=2026-11-05")
    assert res.status_code == 200
    assert len(res.json()) >= 1
    assert any(b["title"] == "Special Session" for b in res.json())

    # Non-existent room -> 404
    res_404 = client.get("/api/rooms/99999/bookings")
    assert res_404.status_code == 404


def test_date_filtering_excludes_other_dates(client):
    """
    Verify that GET /api/bookings?date=YYYY-MM-DD returns ONLY bookings for that date.
    Bookings on different dates must NEVER be returned.
    Also verifies that the booking_date alias behaves identically.
    """
    target_date = "2026-11-10"
    other_date = "2026-11-11"
    unbooked_date = "2099-01-01"

    # Create a booking on target_date
    res1 = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Target Day Session",
            "date": target_date,
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )
    assert res1.status_code == 201

    # Create a booking on other_date
    res2 = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Other Day Session",
            "date": other_date,
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )
    assert res2.status_code == 201

    # 1. Query by canonical date parameter
    res_target = client.get(f"/api/bookings?date={target_date}")
    assert res_target.status_code == 200
    target_items = res_target.json()
    assert len(target_items) == 1
    assert target_items[0]["title"] == "Target Day Session"
    assert target_items[0]["date"] == target_date

    # 2. Query for date with no bookings -> must return empty list, never leaking other dates
    res_empty = client.get(f"/api/bookings?date={unbooked_date}")
    assert res_empty.status_code == 200
    assert len(res_empty.json()) == 0

    # 3. Query via booking_date alias -> must filter identically
    res_alias = client.get(f"/api/bookings?booking_date={target_date}")
    assert res_alias.status_code == 200
    assert len(res_alias.json()) == 1
    assert res_alias.json()[0]["title"] == "Target Day Session"

    res_alias_empty = client.get(f"/api/bookings?booking_date={unbooked_date}")
    assert res_alias_empty.status_code == 200
    assert len(res_alias_empty.json()) == 0


def test_room_and_date_filtering_combined(client):
    """Verify that filtering by both room_id and date strictly isolates the intersection."""
    test_d1 = "2026-11-20"
    test_d2 = "2026-11-21"

    # Room 1 on Day 1
    client.post(
        "/api/bookings",
        json={"room_id": 1, "title": "R1-D1", "date": test_d1, "start_time": "09:00", "end_time": "10:00"},
    )
    # Room 1 on Day 2
    client.post(
        "/api/bookings",
        json={"room_id": 1, "title": "R1-D2", "date": test_d2, "start_time": "09:00", "end_time": "10:00"},
    )
    # Room 2 on Day 1
    client.post(
        "/api/bookings",
        json={"room_id": 2, "title": "R2-D1", "date": test_d1, "start_time": "09:00", "end_time": "10:00"},
    )

    # Combined filter: room 1 + Day 1
    res = client.get(f"/api/bookings?room_id=1&date={test_d1}")
    assert res.status_code == 200
    results = res.json()
    assert len(results) == 1
    assert results[0]["title"] == "R1-D1"
    assert results[0]["room_id"] == 1
    assert results[0]["date"] == test_d1

