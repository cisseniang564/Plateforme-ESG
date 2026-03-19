#!/usr/bin/env python3
"""Test script for Celery workers."""

print("=" * 70)
print("Celery Worker Test")
print("=" * 70)

# Test 1: Simple Addition
print("\n[Test 1] Simple Addition")
print("-" * 70)

from workers.tasks import add

result = add.delay(10, 20)
print(f"Task ID: {result.id}")
print(f"Status: {result.status}")

try:
    answer = result.get(timeout=10)
    print(f"Result: 10 + 20 = {answer}")
    print("✅ Test 1 PASSED")
except Exception as e:
    print(f"❌ Test 1 FAILED: {e}")

# Test 2: Email Task
print("\n[Test 2] Email Task (Mock)")
print("-" * 70)

from workers.tasks import send_email_task

result = send_email_task.delay(
    to="test@example.com",
    subject="Test Email",
    body="This is a test email from Celery"
)

print(f"Task ID: {result.id}")

try:
    email_result = result.get(timeout=10)
    print(f"Email status: {email_result['status']}")
    print(f"Sent to: {email_result['to']}")
    print("✅ Test 2 PASSED")
except Exception as e:
    print(f"❌ Test 2 FAILED: {e}")

# Test 3: Data Processing with Progress
print("\n[Test 3] Data Processing (with progress)")
print("-" * 70)

from workers.tasks import process_data_upload
import time

result = process_data_upload.delay(
    upload_id="550e8400-e29b-41d4-a716-446655440000",
    tenant_id="660e8400-e29b-41d4-a716-446655440001"
)

print(f"Task ID: {result.id}")
print("Processing...")

# Monitor progress
progress_count = 0
while not result.ready():
    if result.state == 'PROGRESS':
        info = result.info
        progress_msg = f"  [{info['current']}/{info['total']}] {info['status']}"
        if progress_count == 0 or info['current'] != progress_count:
            print(progress_msg)
            progress_count = info['current']
    time.sleep(0.5)

try:
    final_result = result.get(timeout=10)
    print(f"\nProcessing completed:")
    print(f"  - Status: {final_result['status']}")
    print(f"  - Rows processed: {final_result['rows_processed']}")
    print(f"  - Errors: {final_result['errors']}")
    print("✅ Test 3 PASSED")
except Exception as e:
    print(f"❌ Test 3 FAILED: {e}")

# Summary
print("\n" + "=" * 70)
print("🎉 All Celery tests completed!")
print("=" * 70)
print("\nNext steps:")
print("  1. Open Flower: http://localhost:5555")
print("  2. View worker logs: docker-compose logs -f celery-worker")
print("  3. Check task history in Flower UI")
print("")
