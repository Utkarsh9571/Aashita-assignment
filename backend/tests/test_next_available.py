"""
Comprehensive automated tests for Next Available Slot endpoint and algorithm:
GET /api/rooms/{room_id}/next-available?date=YYYY-MM-DD&duration=N

Test Scenarios:
1. Empty day
2. Slot before first booking
3. Slot exactly before first booking
4. Slot between bookings
5. Exact-size gap
6. Slot after last booking
7. Insufficient gap skipped
8. Fully booked day
9. Multiple gaps where earlier smaller valid gap wins
10. Duration larger than the entire working day
11. Invalid duration (zero or negative) -> 400
12. Invalid room -> 404
13. Invalid date -> 400
14. Adjacent / back-to-back bookings smoothly handled without false gaps
"""


def test_1_next_available_empty_day(client):
    """When a room has no bookings on that date, earliest slot starts at 09:00."""
    res = client.get("/api/rooms/1/next-available?date=2026-12-01&duration=45")
    assert res.status_code == 200
    data = res.json()
    assert data["available"] is True
    assert data["room_id"] == 1
    assert data["date"] == "2026-12-01"
    assert data["duration"] == 45
    assert data["start_time"] == "09:00"
    assert data["end_time"] == "09:45"
    assert data["slot"]["start_time"] == "09:00"
    assert data["slot"]["end_time"] == "09:45"


def test_2_slot_before_first_booking(client):
    """First booking starts at 10:30. A 60-min slot should be found from 09:00 to 10:00."""
    client.post(
        "/api/bookings",
        json={
            "room_id": 2,
            "title": "Late Morning Sync",
            "date": "2026-12-02",
            "start_time": "10:30",
            "end_time": "11:30",
        },
    )
    res = client.get("/api/rooms/2/next-available?date=2026-12-02&duration=60")
    assert res.status_code == 200
    data = res.json()
    assert data["available"] is True
    assert data["start_time"] == "09:00"
    assert data["end_time"] == "10:00"


def test_3_slot_exactly_before_first_booking(client):
    """
    First booking starts at 09:45. Requested duration is 45 mins.
    The gap before the first booking is exactly 45 mins (09:00 to 09:45).
    Should accept the exact gap -> 09:00 to 09:45.
    """
    client.post(
        "/api/bookings",
        json={
            "room_id": 2,
            "title": "09:45 Standup",
            "date": "2026-12-03",
            "start_time": "09:45",
            "end_time": "10:45",
        },
    )
    res = client.get("/api/rooms/2/next-available?date=2026-12-03&duration=45")
    assert res.status_code == 200
    data = res.json()
    assert data["available"] is True
    assert data["start_time"] == "09:00"
    assert data["end_time"] == "09:45"


def test_4_slot_between_bookings(client):
    """
    Booking 1: 09:00 - 10:00
    Booking 2: 11:30 - 13:00
    Gap between is 10:00 to 11:30 (90 mins).
    For duration 45, should return earliest available -> 10:00 to 10:45.
    """
    client.post(
        "/api/bookings",
        json={
            "room_id": 3,
            "title": "Morning Kickoff",
            "date": "2026-12-04",
            "start_time": "09:00",
            "end_time": "10:00",
        },
    )
    client.post(
        "/api/bookings",
        json={
            "room_id": 3,
            "title": "Lunch Session",
            "date": "2026-12-04",
            "start_time": "11:30",
            "end_time": "13:00",
        },
    )
    res = client.get("/api/rooms/3/next-available?date=2026-12-04&duration=45")
    assert res.status_code == 200
    data = res.json()
    assert data["available"] is True
    assert data["start_time"] == "10:00"
    assert data["end_time"] == "10:45"


def test_5_exact_size_gap(client):
    """
    Gap between bookings is exactly 45 minutes:
    Booking 1: 09:00 - 10:00
    Booking 2: 10:45 - 12:00
    Requested duration: 45 min.
    Should accept the exact gap -> 10:00 to 10:45.
    """
    client.post(
        "/api/bookings",
        json={
            "room_id": 4,
            "title": "Slot A",
            "date": "2026-12-05",
            "start_time": "09:00",
            "end_time": "10:00",
        },
    )
    client.post(
        "/api/bookings",
        json={
            "room_id": 4,
            "title": "Slot B",
            "date": "2026-12-05",
            "start_time": "10:45",
            "end_time": "12:00",
        },
    )
    res = client.get("/api/rooms/4/next-available?date=2026-12-05&duration=45")
    assert res.status_code == 200
    data = res.json()
    assert data["available"] is True
    assert data["start_time"] == "10:00"
    assert data["end_time"] == "10:45"


def test_6_slot_after_last_booking(client):
    """
    Day booked from 09:00 to 16:30 continuously.
    Requested duration: 60 mins.
    Remaining gap: 16:30 to 18:00 (90 mins).
    Should find 16:30 to 17:30.
    """
    client.post(
        "/api/bookings",
        json={
            "room_id": 5,
            "title": "Afternoon Workshop",
            "date": "2026-12-06",
            "start_time": "09:00",
            "end_time": "16:30",
        },
    )
    res = client.get("/api/rooms/5/next-available?date=2026-12-06&duration=60")
    assert res.status_code == 200
    data = res.json()
    assert data["available"] is True
    assert data["start_time"] == "16:30"
    assert data["end_time"] == "17:30"


def test_7_insufficient_gap_is_skipped(client):
    """
    Booking 1: 09:00 - 09:30
    Booking 2: 10:00 - 11:00 (Gap between 1 and 2 is only 30 mins)
    Booking 3: 13:00 - 14:00 (Gap between 2 and 3 is 120 mins: 11:00 - 13:00)
    Requested duration: 45 mins.
    The algorithm must skip the insufficient 30-min gap and return 11:00 to 11:45.
    """
    client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Quick Standup",
            "date": "2026-12-07",
            "start_time": "09:00",
            "end_time": "09:30",
        },
    )
    client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Client Call",
            "date": "2026-12-07",
            "start_time": "10:00",
            "end_time": "11:00",
        },
    )
    client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "title": "Afternoon Review",
            "date": "2026-12-07",
            "start_time": "13:00",
            "end_time": "14:00",
        },
    )
    res = client.get("/api/rooms/1/next-available?date=2026-12-07&duration=45")
    assert res.status_code == 200
    data = res.json()
    assert data["available"] is True
    # Must skip 09:30-10:00 (only 30m) and pick 11:00
    assert data["start_time"] == "11:00"
    assert data["end_time"] == "11:45"


def test_8_fully_booked_day(client):
    """
    Day booked from 09:00 to 18:00 continuously.
    Requested duration: 30 mins.
    Should return available=False with a clear message.
    """
    client.post(
        "/api/bookings",
        json={
            "room_id": 5,
            "title": "Full Day Marathon",
            "date": "2026-12-08",
            "start_time": "09:00",
            "end_time": "18:00",
        },
    )
    res = client.get("/api/rooms/5/next-available?date=2026-12-08&duration=30")
    assert res.status_code == 200
    data = res.json()
    assert data["available"] is False
    assert data["start_time"] is None
    assert data["end_time"] is None
    assert "No available slot" in data["message"]


def test_9_multiple_gaps_earlier_smaller_valid_gap_wins(client):
    """
    Gap 1: 10:00 - 10:45 (exactly 45 minutes)
    Gap 2: 12:00 - 15:00 (180 minutes, much larger)
    Requested duration: 45 minutes.
    CRITICAL: The EARLIEST chronological slot must win (10:00 - 10:45), not the larger gap.
    """
    client.post(
        "/api/bookings",
        json={
            "room_id": 2,
            "title": "Part 1",
            "date": "2026-12-09",
            "start_time": "09:00",
            "end_time": "10:00",
        },
    )
    client.post(
        "/api/bookings",
        json={
            "room_id": 2,
            "title": "Part 2",
            "date": "2026-12-09",
            "start_time": "10:45",
            "end_time": "12:00",
        },
    )
    client.post(
        "/api/bookings",
        json={
            "room_id": 2,
            "title": "Part 3",
            "date": "2026-12-09",
            "start_time": "15:00",
            "end_time": "18:00",
        },
    )

    res = client.get("/api/rooms/2/next-available?date=2026-12-09&duration=45")
    assert res.status_code == 200
    data = res.json()
    assert data["available"] is True
    # Earlier slot (10:00) must be chosen over later slot (12:00)
    assert data["start_time"] == "10:00"
    assert data["end_time"] == "10:45"


def test_10_duration_larger_than_entire_working_day(client):
    """
    Working hours: 09:00 - 18:00 (540 minutes total).
    Requested duration: 600 minutes.
    Should return available=False with a message explaining it exceeds working hours.
    """
    res = client.get("/api/rooms/1/next-available?date=2026-12-10&duration=600")
    assert res.status_code == 200
    data = res.json()
    assert data["available"] is False
    assert "exceeds" in data["message"].lower()


def test_11_invalid_duration_zero_or_negative(client):
    """Duration <= 0 must be rejected with 400 Bad Request."""
    res_zero = client.get("/api/rooms/1/next-available?date=2026-12-11&duration=0")
    assert res_zero.status_code == 400
    assert "greater than 0" in res_zero.json()["detail"]

    res_neg = client.get("/api/rooms/1/next-available?date=2026-12-11&duration=-30")
    assert res_neg.status_code == 400
    assert "greater than 0" in res_neg.json()["detail"]


def test_12_invalid_room(client):
    """Non-existent room must return 404 Not Found."""
    res = client.get("/api/rooms/99999/next-available?date=2026-12-12&duration=30")
    assert res.status_code == 404
    assert "does not exist" in res.json()["detail"]


def test_13_invalid_date(client):
    """Invalid date format must return 400 Bad Request."""
    res = client.get("/api/rooms/1/next-available?date=not-a-valid-date&duration=30")
    assert res.status_code == 400
    assert "date" in res.json()["detail"].lower()


def test_14_adjacent_back_to_back_bookings_handled(client):
    """
    Adjacent bookings with zero gap between them:
    Booking 1: 09:00 - 10:00
    Booking 2: 10:00 - 11:00
    Booking 3: 11:00 - 12:00
    Requested duration: 60 mins.
    Must smoothly step over adjacent bookings and find 12:00 to 13:00.
    """
    for start, end in [("09:00", "10:00"), ("10:00", "11:00"), ("11:00", "12:00")]:
        client.post(
            "/api/bookings",
            json={
                "room_id": 3,
                "title": f"Block {start}-{end}",
                "date": "2026-12-13",
                "start_time": start,
                "end_time": end,
            },
        )

    res = client.get("/api/rooms/3/next-available?date=2026-12-13&duration=60")
    assert res.status_code == 200
    data = res.json()
    assert data["available"] is True
    assert data["start_time"] == "12:00"
    assert data["end_time"] == "13:00"
