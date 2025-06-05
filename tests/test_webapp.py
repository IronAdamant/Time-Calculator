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

    # --- Tests for New Duration Inputs and Start Date Functionality ---

    def _construct_duration_str(self, value, unit):
        if unit == "seconds":
            return f"0:00:{int(value):02d}"
        elif unit == "minutes":
            return f"0:{int(value):02d}:00"
        elif unit == "hours":
            return f"{int(value)}:00:00"
        elif unit == "days":
            return f"{int(value)} days, 0:00:00"
        raise ValueError(f"Unknown duration unit: {unit}")

    def test_calculate_with_new_duration_units_no_start_date(self):
        test_cases = [
            {"value": 30, "unit": "seconds", "initial_time": "1:00:00 PM", "expected_time": "1:00 PM", "expected_result": "1:00 PM", "expected_days": 0}, # Duration is 30s, Time class is minute precision.
            {"value": 30, "unit": "seconds", "initial_time": "1:00 PM", "duration_str_override": "0:00:30", "expected_time": "1:00 PM", "expected_result": "1:00 PM", "expected_days": 0}, # Explicit duration string for clarity
            {"value": 2, "unit": "hours", "initial_time": "1:00 PM", "expected_time": "3:00 PM", "expected_result": "3:00 PM", "expected_days": 0},
            {"value": 3, "unit": "days", "initial_time": "1:00 PM", "expected_time": "1:00 PM", "expected_result": "1:00 PM (3 days later)", "expected_days": 3},
            {"value": 90, "unit": "minutes", "initial_time": "2:00 PM", "duration_str_override": "0:90:00", "expected_time": "3:30 PM", "expected_result": "3:30 PM", "expected_days": 0}, # Test with minutes > 59
        ]

        for tc in test_cases:
            duration_str = tc.get("duration_str_override") or self._construct_duration_str(tc["value"], tc["unit"])
            payload = {"initial_time": tc["initial_time"], "duration": duration_str}
            with self.subTest(payload=payload):
                response = self.client.post('/api/calculate_time', json=payload)
                self.assertEqual(response.status_code, 200, msg=f"Failed for {payload}, response: {response.data.decode()}")
                data = json.loads(response.data)
                self.assertEqual(data.get('calculated_time'), tc["expected_time"])
                self.assertEqual(data.get('result_string'), tc["expected_result"])
                self.assertEqual(data.get('days_numeric'), tc["expected_days"])

    def test_calculate_with_start_date(self):
        payload = {
            "initial_time": "10:00 AM",
            "duration": self._construct_duration_str(5, "hours"), # "5:00:00"
            "start_date": "2023-10-26"
        }
        response = self.client.post('/api/calculate_time', json=payload)
        self.assertEqual(response.status_code, 200, msg=response.data.decode())
        data = json.loads(response.data)
        self.assertEqual(data.get('start_datetime_str'), "2023-10-26 10:00 AM")
        self.assertEqual(data.get('end_datetime_str'), "2023-10-26 03:00 PM")
        self.assertEqual(data.get('duration_details_str'), "5:00:00") # Duration class __str__

    def test_calculate_with_start_date_and_days_offset(self):
        payload = {
            "initial_time": "10:00 AM",
            "duration": self._construct_duration_str(2, "hours"), # "2:00:00"
            "start_date": "2023-10-26",
            "days_offset": "1"
        }
        response = self.client.post('/api/calculate_time', json=payload)
        self.assertEqual(response.status_code, 200, msg=response.data.decode())
        data = json.loads(response.data)
        # days_offset (1) is applied to start_date (2023-10-26), so effective start is 2023-10-27
        self.assertEqual(data.get('start_datetime_str'), "2023-10-27 10:00 AM")
        self.assertEqual(data.get('end_datetime_str'), "2023-10-27 12:00 PM")
        self.assertEqual(data.get('duration_details_str'), "2:00:00")

    def test_calculate_with_start_date_and_negative_days_offset(self):
        payload = {
            "initial_time": "01:00 AM", # 1:00
            "duration": self._construct_duration_str(2, "hours"), # "2:00:00"
            "start_date": "2023-10-26",
            "days_offset": "-2"
        }
        response = self.client.post('/api/calculate_time', json=payload)
        self.assertEqual(response.status_code, 200, msg=response.data.decode())
        data = json.loads(response.data)
        self.assertEqual(data.get('start_datetime_str'), "2023-10-24 01:00 AM")
        self.assertEqual(data.get('end_datetime_str'), "2023-10-24 03:00 AM")
        self.assertEqual(data.get('duration_details_str'), "2:00:00")


    def test_calculate_with_start_date_crossing_boundaries(self):
        test_cases = [
            {
                "name": "Month Boundary",
                "payload": {
                    "initial_time": "10:00 PM", "duration": self._construct_duration_str(5, "hours"), # "5:00:00"
                    "start_date": "2023-10-31"
                },
                "expected_start": "2023-10-31 10:00 PM", "expected_end": "2023-11-01 03:00 AM"
            },
            {
                "name": "Year Boundary",
                "payload": {
                    "initial_time": "10:00 PM", "duration": self._construct_duration_str(5, "hours"), # "5:00:00"
                    "start_date": "2023-12-31"
                },
                "expected_start": "2023-12-31 10:00 PM", "expected_end": "2024-01-01 03:00 AM"
            }
        ]
        for tc in test_cases:
            with self.subTest(name=tc["name"], payload=tc["payload"]):
                response = self.client.post('/api/calculate_time', json=tc["payload"])
                self.assertEqual(response.status_code, 200, msg=response.data.decode())
                data = json.loads(response.data)
                self.assertEqual(data.get('start_datetime_str'), tc["expected_start"])
                self.assertEqual(data.get('end_datetime_str'), tc["expected_end"])

    def test_error_invalid_start_date_format(self):
        payload = {
            "initial_time": "10:00 AM",
            "duration": self._construct_duration_str(1, "hours"),
            "start_date": "invalid-date-format"
        }
        response = self.client.post('/api/calculate_time', json=payload)
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn("Invalid start_date format. Expected YYYY-MM-DD", data.get('error', ''))

    def test_error_invalid_days_offset_with_start_date(self):
        payload = {
            "initial_time": "10:00 AM",
            "duration": self._construct_duration_str(1, "hours"),
            "start_date": "2023-10-26",
            "days_offset": "not-an-integer"
        }
        response = self.client.post('/api/calculate_time', json=payload)
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn("Invalid format for days_offset, must be a string representing an integer when used with start_date.", data.get('error', ''))


if __name__ == '__main__':
    unittest.main()
