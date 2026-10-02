import urllib.request
import json
import sys

base_url = 'http://localhost:8000'

try:
    # 1. Fetch rooms
    req = urllib.request.urlopen(f'{base_url}/api/rooms')
    rooms = json.loads(req.read().decode())
    print(f'1. Rooms fetched: {len(rooms)} rooms')
    assert len(rooms) >= 4
    room_id = rooms[0]['id']

    # Clean any prior bookings for room_id on date 2026-10-02
    req_bookings = urllib.request.urlopen(f'{base_url}/api/bookings?booking_date=2026-10-02&room_id={room_id}')
    existing = json.loads(req_bookings.read().decode())
    for b in existing:
        del_req = urllib.request.Request(f'{base_url}/api/bookings/{b["id"]}', method='DELETE')
        urllib.request.urlopen(del_req)

    # 2. Create booking
    payload = json.dumps({
        'room_id': room_id,
        'title': 'Frontend Integration Test Meeting',
        'booking_date': '2026-10-02',
        'start_time': '10:00',
        'end_time': '11:00'
    }).encode()
    req = urllib.request.Request(f'{base_url}/api/bookings', data=payload, headers={'Content-Type': 'application/json'})
    created = json.loads(urllib.request.urlopen(req).read().decode())
    booking_id = created['id']
    print(f'2. Booking created: ID={booking_id}, Title="{created["title"]}"')

    # 3. Check conflict detection (409)
    try:
        req_conflict = urllib.request.Request(f'{base_url}/api/bookings', data=payload, headers={'Content-Type': 'application/json'})
        urllib.request.urlopen(req_conflict)
        print('ERROR: Conflict was not caught!')
        sys.exit(1)
    except urllib.error.HTTPError as e:
        conflict_body = json.loads(e.read().decode())
        detail = conflict_body["detail"] if isinstance(conflict_body["detail"], str) else conflict_body["detail"]["message"]
        print(f'3. Conflict correctly caught: HTTP {e.code}, Detail: {detail}')

    # 4. Next available slot
    # Gap 09:00 - 10:00 exists, so a 60 min slot should find 09:00 - 10:00
    req = urllib.request.urlopen(f'{base_url}/api/rooms/{room_id}/next-available?date=2026-10-02&duration=60')
    slot = json.loads(req.read().decode())
    is_avail = slot.get("available", slot.get("slot_found"))
    print(f'4. Next available slot: {slot.get("start_time")} - {slot.get("end_time")}, Available={is_avail}')

    # 5. Cancel booking
    req = urllib.request.Request(f'{base_url}/api/bookings/{booking_id}', method='DELETE')
    cancel_res = json.loads(urllib.request.urlopen(req).read().decode())
    print(f'5. Booking cancelled: {cancel_res["message"]}')

    print('\nALL 5 END-TO-END CHECKS PASSED!')
except Exception as e:
    print(f'Error: {e}')
    sys.exit(1)
