import unittest
import json
import sys
import os

# Adjust sys.path to ensure 'app' and 'timecalculator' are discoverable
# Assuming tests directory is at the root, and app.py is at the root.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app # Flask app instance from app.py

class TestAPI(unittest.TestCase):

    def setUp(self):
        """Set up test client before each test."""
        app.testing = True
        self.client = app.test_client()

    # Test Methods for Successful Calculations
    def test_calculate_simple(self):
        payload = {"initial_time": "2:00 PM", "duration": "1:30"}
        response = self.client.post('/api/calculate_time', json=payload)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data.get('result_string'), "3:30 PM")
        self.assertEqual(data.get('calculated_time'), "3:30 PM")
        self.assertEqual(data.get('days_numeric'), 0)

    def test_calculate_crossing_midnight_with_offset(self):
        payload = {"initial_time": "10:00 PM", "duration": "3:30:30", "days_offset": "1"}
        response = self.client.post('/api/calculate_time', json=payload)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data.get('result_string'), "1:30 AM (2 days later)")
        self.assertEqual(data.get('calculated_time'), "1:30 AM")
        self.assertEqual(data.get('days_numeric'), 2)

    def test_calculate_24hr_input_and_duration_days_seconds(self):
        payload = {"initial_time": "23:00", "duration": "2 days, 2:05:30"}
        response = self.client.post('/api/calculate_time', json=payload)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        # Initial: 23:00. Duration: 2 days, 2h, 5m, 30s.
        # Time obj state is minute-precision, so 23:00 + 2h05m = 1:05 AM (+1 day from duration time part)
        # Days from duration: 2 days (from "2 days" part) + 1 day (from 23:00 + 2:05 crossing midnight) = 3 days.
        self.assertEqual(data.get('result_string'), "1:05 AM (3 days later)")
        self.assertEqual(data.get('calculated_time'), "1:05 AM")
        self.assertEqual(data.get('days_numeric'), 3)

    def test_calculate_negative_offset(self):
        payload = {"initial_time": "1:00 AM", "duration": "1:00", "days_offset": "-1"}
        response = self.client.post('/api/calculate_time', json=payload)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        # 1:00 AM + 1:00 = 2:00 AM (days_from_duration = 0)
        # total_days_passed = 0 + (-1) = -1
        self.assertEqual(data.get('result_string'), "2:00 AM (previous day)")
        self.assertEqual(data.get('calculated_time'), "2:00 AM")
        self.assertEqual(data.get('days_numeric'), -1)

    # Test Methods for Error Handling
    def test_error_missing_initial_time(self):
        payload = {"duration": "1:00"}
        response = self.client.post('/api/calculate_time', json=payload)
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn("Missing 'initial_time'", data.get('error', ''))

    def test_error_missing_duration(self):
        payload = {"initial_time": "1:00 PM"}
        response = self.client.post('/api/calculate_time', json=payload)
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn("Missing 'duration'", data.get('error', ''))

    def test_error_invalid_initial_time_format(self):
        payload = {"initial_time": "bad-time", "duration": "1:00"}
        response = self.client.post('/api/calculate_time', json=payload)
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn("Initial time must be in H:MM AM/PM or HH:MM format.", data.get('error', ''))

    def test_error_invalid_duration_format(self):
        payload = {"initial_time": "1:00 PM", "duration": "bad-duration"}
        response = self.client.post('/api/calculate_time', json=payload)
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn("Invalid duration string format: bad-duration", data.get('error', ''))

    def test_error_invalid_days_offset_type_string(self):
        payload = {"initial_time": "1:00 PM", "duration": "1:00", "days_offset": "abc"}
        response = self.client.post('/api/calculate_time', json=payload)
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn("Invalid format for days_offset, must be a string representing an integer.", data.get('error', ''))

    def test_error_invalid_days_offset_type_float(self):
        payload = {"initial_time": "1:00 PM", "duration": "1:00", "days_offset": 1.5}
        response = self.client.post('/api/calculate_time', json=payload)
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn("Invalid type for days_offset, must be an integer or a string representing an integer.", data.get('error', ''))

    def test_error_malformed_json(self):
        response = self.client.post('/api/calculate_time',
                                    data="not json {",
                                    content_type="application/json")
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertEqual(data.get('error'), "Invalid JSON payload or Content-Type (must be application/json and valid JSON)")

    def test_error_no_json_payload(self):
        # This occurs when Content-Type is not application/json or data is malformed
        response = self.client.post('/api/calculate_time', data="some data", content_type="text/plain")
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertEqual(data.get('error'), "Invalid JSON payload or Content-Type (must be application/json and valid JSON)")


if __name__ == '__main__':
    unittest.main()
