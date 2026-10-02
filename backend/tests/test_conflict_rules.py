"""
Comprehensive automated tests for all 16 booking conflict and boundary rules.

Required Test Scenarios:
1. No existing booking -> allowed
2. Partial overlap at beginning -> 409 conflict
3. Partial overlap at end -> 409 conflict
4. New booking completely contains existing booking -> 409 conflict
5. Existing booking completely contains new booking -> 409 conflict
6. Identical time ranges -> 409 conflict
7. Same start, different end -> 409 conflict
8. Same end, different start -> 409 conflict
9. Exact back-to-back before existing booking -> 201 allowed
10. Exact back-to-back after existing booking -> 201 allowed
11. Different room, same time -> 201 allowed
12. Same room, different date -> 201 allowed
13. Start before 09:00 -> 400 rejected
14. End after 18:00 -> 400 rejected
15. End equal to start -> 400 rejected
16. End before start -> 400 rejected
"""


def test_1_no_existing_booking_allowed(client):
    """Rule 1: When no conflicting booking exists in the room on that date, booking is allowed."""
    payload = {
        "room_id": 1,
        "title": "First Meeting of the Day",
        "date": "2026-11-10",
        "start_time": "09:00",
        "end_time": "10:00",
    }
    res = client.post("/api/bookings", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "First Meeting of the Day"
    assert data["room_id"] == 1
    assert data["start_time"] == "09:00"
    assert data["end_time"] == "10:00"


def test_2_partial_overlap_at_beginning(client):
    """
    Rule 2: Existing 10:00-11:00. New booking 09:30-10:30 overlaps the beginning of the existing booking.
    Must be rejected with HTTP 409 and identify the existing booking.
    """
    # Create base booking
    base_res = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Core Sync",
            "date": "2026-11-11",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )
    assert base_res.status_code == 201
    base_id = base_res.json()["id"]

    # Attempt overlapping booking (starts before, ends inside)
    res = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Overlapping Beginning",
            "date": "2026-11-11",
            "start_time": "09:30",
            "end_time": "10:30",
        },
    )
    assert res.status_code == 409
    body = res.json()
    assert "Core Sync" in body["detail"]
    assert "10:00" in body["detail"]
    assert "11:00" in body["detail"]
    assert body["conflicting_booking"]["id"] == base_id
    assert body["conflicting_booking"]["title"] == "Core Sync"
    assert body["conflicting_booking"]["start_time"] == "10:00"
    assert body["conflicting_booking"]["end_time"] == "11:00"


def test_3_partial_overlap_at_end(client):
    """
    Rule 3: Existing 10:00-11:00. New booking 10:30-11:30 overlaps the end of the existing booking.
    Must be rejected with HTTP 409.
    """
    client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Existing Session",
            "date": "2026-11-12",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )

    res = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Overlapping End",
            "date": "2026-11-12",
            "start_time": "10:30",
            "end_time": "11:30",
        },
    )
    assert res.status_code == 409
    body = res.json()
    assert body["conflicting_booking"]["title"] == "Existing Session"


def test_4_new_booking_completely_contains_existing(client):
    """
    Rule 4: Existing 10:00-11:00. New booking 09:30-11:30 completely encloses the existing one.
    Must be rejected with HTTP 409.
    """
    client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Inner Existing",
            "date": "2026-11-13",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )

    res = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Enclosing New",
            "date": "2026-11-13",
            "start_time": "09:30",
            "end_time": "11:30",
        },
    )
    assert res.status_code == 409
    body = res.json()
    assert body["conflicting_booking"]["title"] == "Inner Existing"


def test_5_existing_booking_completely_contains_new(client):
    """
    Rule 5: Existing 09:30-11:30. New booking 10:00-11:00 is completely inside existing one.
    Must be rejected with HTTP 409.
    """
    client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Enclosing Existing",
            "date": "2026-11-14",
            "start_time": "09:30",
            "end_time": "11:30",
        },
    )

    res = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Inner New",
            "date": "2026-11-14",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )
    assert res.status_code == 409
    body = res.json()
    assert body["conflicting_booking"]["title"] == "Enclosing Existing"


def test_6_identical_time_ranges(client):
    """
    Rule 6: Existing 10:00-11:00. New booking 10:00-11:00 has exact identical time.
    Must be rejected with HTTP 409.
    """
    client.post(
        "/api/bookings",
        json={
            "room_id": 2,
            "title": "First Booker",
            "date": "2026-11-15",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )

    res = client.post(
        "/api/bookings",
        json={
            "room_id": 2,
            "title": "Second Booker",
            "date": "2026-11-15",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )
    assert res.status_code == 409
    body = res.json()
    assert body["conflicting_booking"]["title"] == "First Booker"


def test_7_same_start_different_end(client):
    """
    Rule 7: Existing 10:00-11:00.
    Case A: New booking 10:00-11:30 (starts at same time, ends later) -> 409.
    Case B: New booking 10:00-10:30 (starts at same time, ends earlier) -> 409.
    """
    client.post(
        "/api/bookings",
        json={
            "room_id": 2,
            "title": "Reference 10-11",
            "date": "2026-11-16",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )

    # Longer duration
    res_longer = client.post(
        "/api/bookings",
        json={
            "room_id": 2,
            "title": "Same Start Longer",
            "date": "2026-11-16",
            "start_time": "10:00",
            "end_time": "11:30",
        },
    )
    assert res_longer.status_code == 409

    # Shorter duration
    res_shorter = client.post(
        "/api/bookings",
        json={
            "room_id": 2,
            "title": "Same Start Shorter",
            "date": "2026-11-16",
            "start_time": "10:00",
            "end_time": "10:30",
        },
    )
    assert res_shorter.status_code == 409


def test_8_same_end_different_start(client):
    """
    Rule 8: Existing 10:00-11:00.
    Case A: New booking 09:30-11:00 (starts earlier, ends at same time) -> 409.
    Case B: New booking 10:30-11:00 (starts later, ends at same time) -> 409.
    """
    client.post(
        "/api/bookings",
        json={
            "room_id": 2,
            "title": "Reference 10-11",
            "date": "2026-11-17",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )

    # Starts earlier
    res_earlier = client.post(
        "/api/bookings",
        json={
            "room_id": 2,
            "title": "Starts Earlier Same End",
            "date": "2026-11-17",
            "start_time": "09:30",
            "end_time": "11:00",
        },
    )
    assert res_earlier.status_code == 409

    # Starts later
    res_later = client.post(
        "/api/bookings",
        json={
            "room_id": 2,
            "title": "Starts Later Same End",
            "date": "2026-11-17",
            "start_time": "10:30",
            "end_time": "11:00",
        },
    )
    assert res_later.status_code == 409


def test_9_exact_back_to_back_before_existing_allowed(client):
    """
    Rule 9: Existing 11:00-12:00. New booking 10:00-11:00 ends exactly when existing begins.
    MUST BE ALLOWED (201 Created).
    """
    client.post(
        "/api/bookings",
        json={
            "room_id": 3,
            "title": "Second Slot (11:00-12:00)",
            "date": "2026-11-18",
            "start_time": "11:00",
            "end_time": "12:00",
        },
    )

    res = client.post(
        "/api/bookings",
        json={
            "room_id": 3,
            "title": "First Slot (10:00-11:00)",
            "date": "2026-11-18",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )
    assert res.status_code == 201
    assert res.json()["start_time"] == "10:00"
    assert res.json()["end_time"] == "11:00"


def test_10_exact_back_to_back_after_existing_allowed(client):
    """
    Rule 10: Existing 10:00-11:00. New booking 11:00-12:00 starts exactly when existing ends.
    MUST BE ALLOWED (201 Created).
    """
    client.post(
        "/api/bookings",
        json={
            "room_id": 3,
            "title": "First Slot (10:00-11:00)",
            "date": "2026-11-19",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )

    res = client.post(
        "/api/bookings",
        json={
            "room_id": 3,
            "title": "Second Slot (11:00-12:00)",
            "date": "2026-11-19",
            "start_time": "11:00",
            "end_time": "12:00",
        },
    )
    assert res.status_code == 201
    assert res.json()["start_time"] == "11:00"
    assert res.json()["end_time"] == "12:00"


def test_11_different_room_same_time_allowed(client):
    """
    Rule 11: Room 1 has booking 10:00-11:00. Booking Room 2 at 10:00-11:00 on the same date
    MUST BE ALLOWED (201 Created).
    """
    res1 = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Room 1 Meeting",
            "date": "2026-11-20",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )
    assert res1.status_code == 201

    res2 = client.post(
        "/api/bookings",
        json={
            "room_id": 2,
            "title": "Room 2 Meeting Simultaneous",
            "date": "2026-11-20",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )
    assert res2.status_code == 201
    assert res2.json()["room_id"] == 2


def test_12_same_room_different_date_allowed(client):
    """
    Rule 12: Room 1 has booking 10:00-11:00 on Date A. Booking Room 1 at 10:00-11:00 on Date B
    MUST BE ALLOWED (201 Created).
    """
    res_date_a = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Date A Meeting",
            "date": "2026-11-21",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )
    assert res_date_a.status_code == 201

    res_date_b = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Date B Meeting Same Time",
            "date": "2026-11-22",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )
    assert res_date_b.status_code == 201
    assert res_date_b.json()["date"] == "2026-11-22"


def test_13_start_before_0900_rejected(client):
    """
    Rule 13: Booking starting before 09:00 (e.g., 08:30-09:30) must be rejected with 400.
    """
    res = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Pre-Dawn Meeting",
            "date": "2026-11-23",
            "start_time": "08:30",
            "end_time": "09:30",
        },
    )
    assert res.status_code == 400
    assert "cannot be before opening hours (09:00)" in res.json()["detail"]


def test_14_end_after_1800_rejected(client):
    """
    Rule 14: Booking ending after 18:00 (e.g., 17:30-18:30) must be rejected with 400.
    """
    res = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Overtime Session",
            "date": "2026-11-24",
            "start_time": "17:30",
            "end_time": "18:30",
        },
    )
    assert res.status_code == 400
    assert "cannot exceed closing hours (18:00)" in res.json()["detail"]


def test_15_end_equal_to_start_rejected(client):
    """
    Rule 15: Booking where end_time == start_time (zero duration, e.g. 10:00-10:00) must be rejected with 400.
    """
    res = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Instantaneous Meeting",
            "date": "2026-11-25",
            "start_time": "10:00",
            "end_time": "10:00",
        },
    )
    assert res.status_code == 400
    detail = res.json()["detail"].lower()
    assert "equal" in detail or "after" in detail


def test_16_end_before_start_rejected(client):
    """
    Rule 16: Booking where end_time < start_time (inverted time, e.g. 11:00-10:00) must be rejected with 400.
    """
    res = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Backward Meeting",
            "date": "2026-11-26",
            "start_time": "11:00",
            "end_time": "10:00",
        },
    )
    assert res.status_code == 400
    assert "must be strictly after start time" in res.json()["detail"]
