

def test_next_available_empty_day(client):
    """When a room has no bookings on that date, earliest slot starts at 09:00."""
    res = client.get("/api/rooms/1/next-available?date=2026-12-01&duration=45")
    assert res.status_code == 200
    data = res.json()
    assert data["available"] is True
    assert data["slot"]["start_time"] == "09:00"
    assert data["slot"]["end_time"] == "09:45"


def test_next_available_gap_before_first_booking(client):
    """First booking starts at 10:30. A 60-min slot should be found from 09:00 to 10:00."""
    client.post(
        "/api/bookings",
        json={
            "room_id": 2,
            "title": "Late Morning Standup",
            "date": "2026-12-02",
            "start_time": "10:30",
            "end_time": "11:30",
        },
    )
    res = client.get("/api/rooms/2/next-available?date=2026-12-02&duration=60")
    assert res.status_code == 200
    data = res.json()
    assert data["available"] is True
    assert data["slot"]["start_time"] == "09:00"
    assert data["slot"]["end_time"] == "10:00"


def test_next_available_gap_between_bookings(client):
    """
    Booking 1: 09:00 - 10:00
    Booking 2: 11:00 - 12:00
    A 45-min slot should fit in the 10:00 - 11:00 gap -> 10:00 to 10:45.
    """
    client.post(
        "/api/bookings",
        json={
            "room_id": 3,
            "title": "Morning Kickoff",
            "date": "2026-12-03",
            "start_time": "09:00",
            "end_time": "10:00",
        },
    )
    client.post(
        "/api/bookings",
        json={
            "room_id": 3,
            "title": "Midday Review",
            "date": "2026-12-03",
            "start_time": "11:00",
            "end_time": "12:00",
        },
    )
    res = client.get("/api/rooms/3/next-available?date=2026-12-03&duration=45")
    assert res.status_code == 200
    data = res.json()
    assert data["available"] is True
    assert data["slot"]["start_time"] == "10:00"
    assert data["slot"]["end_time"] == "10:45"


def test_next_available_gap_exact_duration(client):
    """
    Gap between bookings is exactly 45 minutes:
    Booking 1: 09:00 - 10:00
    Booking 2: 10:45 - 12:00
    Duration requested: 45 min.
    Should accept the exact gap -> 10:00 to 10:45.
    """
    client.post(
        "/api/bookings",
        json={
            "room_id": 4,
            "title": "Slot A",
            "date": "2026-12-04",
            "start_time": "09:00",
            "end_time": "10:00",
        },
    )
    client.post(
        "/api/bookings",
        json={
            "room_id": 4,
            "title": "Slot B",
            "date": "2026-12-04",
            "start_time": "10:45",
            "end_time": "12:00",
        },
    )
    res = client.get("/api/rooms/4/next-available?date=2026-12-04&duration=45")
    assert res.status_code == 200
    data = res.json()
    assert data["available"] is True
    assert data["slot"]["start_time"] == "10:00"
    assert data["slot"]["end_time"] == "10:45"


def test_next_available_gap_after_last_booking(client):
    """
    Day booked from 09:00 to 17:00 continuously.
    Requested duration: 45 mins.
    Should find 17:00 to 17:45 before 18:00 close.
    """
    client.post(
        "/api/bookings",
        json={
            "room_id": 5,
            "title": "All Day Hackathon",
            "date": "2026-12-05",
            "start_time": "09:00",
            "end_time": "17:00",
        },
    )
    res = client.get("/api/rooms/5/next-available?date=2026-12-05&duration=45")
    assert res.status_code == 200
    data = res.json()
    assert data["available"] is True
    assert data["slot"]["start_time"] == "17:00"
    assert data["slot"]["end_time"] == "17:45"


def test_next_available_fully_booked(client):
    """
    Day booked from 09:00 to 18:00 continuously.
    Requested duration: 30 mins.
    Should return available=False.
    """
    client.post(
        "/api/bookings",
        json={
            "room_id": 5,
            "title": "Full Day Marathon",
            "date": "2026-12-06",
            "start_time": "09:00",
            "end_time": "18:00",
        },
    )
    res = client.get("/api/rooms/5/next-available?date=2026-12-06&duration=30")
    assert res.status_code == 200
    data = res.json()
    assert data["available"] is False
    assert data["slot"] is None
    assert "No available slot" in data["message"]
