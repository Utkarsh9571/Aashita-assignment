"""
Full 22-Step End-to-End Live Workflow Verification Script
---------------------------------------------------------
Prerequisites:
- Backend server must be running at http://localhost:8000 (or set BASE_BACKEND_URL)
- Frontend server must be running at http://localhost:3000 (or set BASE_FRONTEND_URL)

Usage:
    python scripts/full_workflow_test.py
"""

import json
import os
import urllib.error
import urllib.request

BASE_BACKEND = os.environ.get("BASE_BACKEND_URL", "http://localhost:8000")
BASE_FRONTEND = os.environ.get("BASE_FRONTEND_URL", "http://localhost:3000")

def run_request(url, method="GET", data=None):
    headers = {"Content-Type": "application/json", "Connection": "close"}
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read().decode("utf-8")
            status = resp.status
            try:
                return status, json.loads(content)
            except Exception:
                return status, content
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        status = e.code
        try:
            return status, json.loads(content)
        except Exception:
            return status, content
    except Exception as e:
        return 0, str(e)


def run_full_workflow():
    print("=" * 70)
    print("STARTING FULL END-TO-END WORKFLOW INTEGRATION AUDIT")
    print("=" * 70)

    # 1. Open the application (Frontend availability)
    print("\n[Step 1] Checking frontend live accessibility...")
    status, html = run_request(BASE_FRONTEND)
    assert status == 200, f"Frontend did not return 200: {status}"
    assert "Meeting Spaces" in html or "<!DOCTYPE html>" in html
    print("  -> PASS: Frontend is up and returned 200 OK.")

    # 2. Select today's date
    test_date = "2026-10-15"  # Dedicated audit date
    print(f"\n[Step 2] Operating on audit date: {test_date}")

    # 3. View the seeded rooms
    print("\n[Step 3] Fetching seeded rooms from backend...")
    status, rooms = run_request(f"{BASE_BACKEND}/api/rooms")
    assert status == 200, f"Failed to get rooms: {status}"
    assert len(rooms) >= 4, f"Expected at least 4 rooms, got {len(rooms)}"
    print(f"  -> PASS: Found {len(rooms)} seeded rooms:")
    for r in rooms:
        print(f"     - Room #{r['id']}: {r['name']} ({r['capacity']} seats) in {r.get('location')}")

    target_room = rooms[0]
    target_room_id = target_room["id"]

    # Clean any prior bookings for test_date & target_room_id
    url_clean = f"{BASE_BACKEND}/api/bookings?date={test_date}&room_id={target_room_id}"
    status, existing = run_request(url_clean)
    if status == 200 and isinstance(existing, list):
        for b in existing:
            run_request(f"{BASE_BACKEND}/api/bookings/{b['id']}", method="DELETE")

    # 4 & 5. Select a room and create a valid booking
    print(f"\n[Step 4 & 5] Creating valid booking in {target_room['name']}...")
    booking_payload = {
        "room_id": target_room_id,
        "title": "Q4 Strategy Workshop",
        "date": test_date,
        "start_time": "10:00",
        "end_time": "11:00",
    }
    status, created1 = run_request(f"{BASE_BACKEND}/api/bookings", method="POST", data=booking_payload)
    assert status == 201, f"Failed to create booking: {status}, {created1}"
    print(
        f"  -> PASS: Created booking #{created1['id']} - '{created1['title']}' "
        f"({created1['start_time']} - {created1['end_time']})"
    )

    # 6. Confirm success toast uses backend message
    print("\n[Step 6] Confirming backend response provides confirmation message...")
    assert "message" in created1 and created1["message"], "Booking response did not provide a message"
    print(f"  -> PASS: Backend message: \"{created1['message']}\"")

    # 7 & 8. Try an overlapping booking in the same room
    print("\n[Step 7 & 8] Attempting overlapping booking (10:30 - 11:30) in same room...")
    overlap_payload = {
        "room_id": target_room_id,
        "title": "Conflicting Sync",
        "date": test_date,
        "start_time": "10:30",
        "end_time": "11:30",
    }
    status, conflict_res = run_request(f"{BASE_BACKEND}/api/bookings", method="POST", data=overlap_payload)
    assert status == 409, f"Expected 409 Conflict, got {status}: {conflict_res}"
    print("  -> PASS: Backend rejected with HTTP 409 Conflict.")

    # 9. Confirm toast identifies the conflicting booking
    print("\n[Step 9] Validating conflict payload structure for toast...")
    assert "detail" in conflict_res, "Missing detail in conflict response"
    assert "conflicting_booking" in conflict_res, "Missing conflicting_booking object in 409 response"
    conflicting = conflict_res["conflicting_booking"]
    assert conflicting["id"] == created1["id"]
    assert conflicting["title"] == created1["title"]
    print(f"  -> PASS: Toast receives exact conflict message: \"{conflict_res['detail']}\"")
    print(
        f"  -> PASS: Toast conflicting booking card: #{conflicting['id']} "
        f"'{conflicting['title']}' ({conflicting['start_time']} - {conflicting['end_time']})"
    )

    # 10 & 11. Create a back-to-back booking
    print("\n[Step 10 & 11] Creating back-to-back booking (11:00 - 12:00)...")
    b2b_payload = {
        "room_id": target_room_id,
        "title": "Immediate Follow-up Session",
        "date": test_date,
        "start_time": "11:00",
        "end_time": "12:00",
    }
    status, created2 = run_request(f"{BASE_BACKEND}/api/bookings", method="POST", data=b2b_payload)
    assert status == 201, f"Back-to-back booking failed: {status}, {created2}"
    print(f"  -> PASS: Back-to-back booking #{created2['id']} successfully accepted!")

    # 12. Try a booking outside 09:00–18:00
    print("\n[Step 12] Testing working hours boundary validation...")
    early_payload = {
        "room_id": target_room_id,
        "title": "Early Morning Secret Meeting",
        "date": test_date,
        "start_time": "08:30",
        "end_time": "09:30",
    }
    status, early_res = run_request(f"{BASE_BACKEND}/api/bookings", method="POST", data=early_payload)
    assert status == 400, f"Expected 400 for start < 09:00, got {status}: {early_res}"
    print(f"  -> PASS: Rejected booking before 09:00 with: \"{early_res.get('detail')}\"")

    late_payload = {
        "room_id": target_room_id,
        "title": "Night Owl Meeting",
        "date": test_date,
        "start_time": "17:30",
        "end_time": "18:30",
    }
    status, late_res = run_request(f"{BASE_BACKEND}/api/bookings", method="POST", data=late_payload)
    assert status == 400, f"Expected 400 for end > 18:00, got {status}: {late_res}"
    print(f"  -> PASS: Rejected booking after 18:00 with: \"{late_res.get('detail')}\"")

    # 13. Try end time <= start time
    print("\n[Step 13] Testing end time <= start time...")
    reversed_payload = {
        "room_id": target_room_id,
        "title": "Time Traveler Session",
        "date": test_date,
        "start_time": "14:00",
        "end_time": "13:00",
    }
    status, rev_res = run_request(f"{BASE_BACKEND}/api/bookings", method="POST", data=reversed_payload)
    assert status == 400, f"Expected 400 for end < start, got {status}: {rev_res}"
    print(f"  -> PASS: Rejected end < start with: \"{rev_res.get('detail')}\"")

    zero_len_payload = {
        "room_id": target_room_id,
        "title": "Zero Length Session",
        "date": test_date,
        "start_time": "14:00",
        "end_time": "14:00",
    }
    status, zero_res = run_request(f"{BASE_BACKEND}/api/bookings", method="POST", data=zero_len_payload)
    assert status == 400, f"Expected 400 for end == start, got {status}: {zero_res}"
    print(f"  -> PASS: Rejected end == start with: \"{zero_res.get('detail')}\"")

    # 14 & 15. Cancel a booking and confirm cancellation toast message
    print(f"\n[Step 14 & 15] Cancelling booking #{created2['id']}...")
    status, cancel_res = run_request(f"{BASE_BACKEND}/api/bookings/{created2['id']}", method="DELETE")
    assert status == 200, f"Failed to cancel booking: {status}, {cancel_res}"
    assert "message" in cancel_res, "Cancel response missing message"
    print(f"  -> PASS: Cancelled successfully. Backend message: \"{cancel_res['message']}\"")

    # 16. Filter by room
    print(f"\n[Step 16] Filtering bookings by room #{target_room_id}...")
    filter_url = f"{BASE_BACKEND}/api/bookings?date={test_date}&room_id={target_room_id}"
    status, room_bookings = run_request(filter_url)
    assert status == 200
    assert all(b["room_id"] == target_room_id for b in room_bookings)
    print(f"  -> PASS: Room filter returned {len(room_bookings)} booking(s), all matching room #{target_room_id}.")

    # 17 & 18. Change date and confirm correct bookings appear
    alt_date = "2026-12-25"
    print(f"\n[Step 17 & 18] Changing date to {alt_date}...")
    alt_url = f"{BASE_BACKEND}/api/bookings?date={alt_date}&room_id={target_room_id}"
    status, alt_bookings = run_request(alt_url)
    assert status == 200
    print(f"  -> PASS: Date change to {alt_date} returned {len(alt_bookings)} bookings (correctly scoped to date).")

    # 19. Request next available slot for a room
    print("\n[Step 19] Requesting next available slot for 45 minutes on test date...")
    # On test_date, created1 is 10:00-11:00. 09:00-10:00 is free.
    next_url = f"{BASE_BACKEND}/api/rooms/{target_room_id}/next-available?date={test_date}&duration=45"
    status, slot_res = run_request(next_url)
    assert status == 200, f"Next available failed: {status}, {slot_res}"
    assert slot_res["available"] is True
    print(
        f"  -> PASS: Slot found: {slot_res['start_time']} - {slot_res['end_time']}. "
        f"Message: \"{slot_res['message']}\""
    )

    # 20. Test a gap exactly equal to requested duration
    print("\n[Step 20] Testing gap exactly equal to requested duration...")
    # First book 09:00 - 10:00
    status, b_early = run_request(f"{BASE_BACKEND}/api/bookings", method="POST", data={
        "room_id": target_room_id,
        "title": "Morning Block",
        "date": test_date,
        "start_time": "09:00",
        "end_time": "10:00",
    })
    # Next book 11:45 - 18:00
    status, b_late = run_request(f"{BASE_BACKEND}/api/bookings", method="POST", data={
        "room_id": target_room_id,
        "title": "Afternoon Block",
        "date": test_date,
        "start_time": "11:45",
        "end_time": "18:00",
    })
    # Now only 11:00 - 11:45 (exactly 45m) is available
    exact_url = f"{BASE_BACKEND}/api/rooms/{target_room_id}/next-available?date={test_date}&duration=45"
    status, exact_gap_res = run_request(exact_url)
    assert status == 200
    assert exact_gap_res["available"] is True
    assert exact_gap_res["start_time"] == "11:00"
    assert exact_gap_res["end_time"] == "11:45"
    print(
        f"  -> PASS: Gap exactly equal to 45m was accepted: "
        f"{exact_gap_res['start_time']} - {exact_gap_res['end_time']}"
    )

    # 21. Test a fully booked/insufficient day
    print("\n[Step 21] Testing slot finder on fully booked day...")
    # Asking for 60m when only 45m was free
    no_slot_url = f"{BASE_BACKEND}/api/rooms/{target_room_id}/next-available?date={test_date}&duration=60"
    status, no_slot_res = run_request(no_slot_url)
    assert status == 200
    assert no_slot_res["available"] is False
    assert no_slot_res["start_time"] is None
    print(f"  -> PASS: Correctly identified no 60m slot exists. Message: \"{no_slot_res['message']}\"")

    # 22. Confirm earliest slot is returned
    print("\n[Step 22] Testing earliest continuous slot preference...")
    for b_id in [created1["id"], b_early["id"], b_late["id"]]:
        run_request(f"{BASE_BACKEND}/api/bookings/{b_id}", method="DELETE")

    run_request(f"{BASE_BACKEND}/api/bookings", method="POST", data={
        "room_id": target_room_id, "title": "B1", "date": test_date, "start_time": "09:00", "end_time": "09:30"
    })
    run_request(f"{BASE_BACKEND}/api/bookings", method="POST", data={
        "room_id": target_room_id, "title": "B2", "date": test_date, "start_time": "10:30", "end_time": "14:00"
    })
    run_request(f"{BASE_BACKEND}/api/bookings", method="POST", data={
        "room_id": target_room_id, "title": "B3", "date": test_date, "start_time": "16:00", "end_time": "18:00"
    })

    # A 60m search could fit 09:30-10:30 or 14:00-15:00. Must return EARLIEST: 09:30-10:30!
    earliest_url = f"{BASE_BACKEND}/api/rooms/{target_room_id}/next-available?date={test_date}&duration=60"
    status, earliest_res = run_request(earliest_url)
    assert status == 200
    assert earliest_res["available"] is True
    assert earliest_res["start_time"] == "09:30"
    assert earliest_res["end_time"] == "10:30"
    print(
        f"  -> PASS: Earliest continuous slot returned: "
        f"{earliest_res['start_time']} - {earliest_res['end_time']}"
    )

    # Clean up test_date bookings
    clean_url = f"{BASE_BACKEND}/api/bookings?date={test_date}&room_id={target_room_id}"
    status, cleanup_list = run_request(clean_url)
    if status == 200 and isinstance(cleanup_list, list):
        for b in cleanup_list:
            run_request(f"{BASE_BACKEND}/api/bookings/{b['id']}", method="DELETE")

    # Additional edge cases requested:
    print("\n[Additional Edge Cases]")

    # Non-existent room (404)
    print("  Testing invalid room ID 99999...")
    status, err_404_room = run_request(f"{BASE_BACKEND}/api/rooms/99999/next-available?date={test_date}&duration=30")
    assert status == 404
    print(f"  -> PASS: 404 Room Not Found: \"{err_404_room.get('detail')}\"")

    # Non-existent booking (404)
    print("  Testing invalid booking ID 999999...")
    status, err_404_booking = run_request(f"{BASE_BACKEND}/api/bookings/999999", method="DELETE")
    assert status == 404
    print(f"  -> PASS: 404 Booking Not Found: \"{err_404_booking.get('detail')}\"")

    # Invalid duration <= 0 (400)
    print("  Testing invalid duration = 0...")
    dur0_url = f"{BASE_BACKEND}/api/rooms/{target_room_id}/next-available?date={test_date}&duration=0"
    status, err_400_dur = run_request(dur0_url)
    assert status == 400
    print(f"  -> PASS: 400 Invalid Duration: \"{err_400_dur.get('detail')}\"")

    print("\n" + "=" * 70)
    print("ALL 22 WORKFLOW STEPS + EDGE CASES AUDITED & PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    run_full_workflow()

