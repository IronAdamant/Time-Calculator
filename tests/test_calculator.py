import unittest
import sys
import os

# Adjust the Python path to include the root directory for module imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from timecalculator.calculator import add_time

class TestAddTime(unittest.TestCase):
    def test_same_period(self):
        self.assertEqual(add_time("3:30 PM", "2:12"), "5:42 PM")

    def test_pm_to_am(self):
        self.assertEqual(add_time("11:00 PM", "2:30"), "1:30 AM, 1 day later")

    def test_am_to_pm(self):
        self.assertEqual(add_time("10:00 AM", "3:00"), "1:00 PM")

    def test_midnight_crossing(self):
        self.assertEqual(add_time("8:00 PM", "4:30"), "12:30 AM, 1 day later")

    def test_noon_crossing(self):
        self.assertEqual(add_time("11:50 AM", "0:20"), "12:10 PM")

    def test_many_hours_duration(self):
        self.assertEqual(add_time("5:00 PM", "150:35"), "11:35 PM, 6 days later")

    def test_duration_just_over_one_day(self):
        self.assertEqual(add_time("10:00 AM", "25:00"), "11:00 AM, 1 day later")

    def test_with_days_parameter(self):
        self.assertEqual(add_time("2:00 AM", "1:00", 3), "3:00 AM, 3 days later")

    def test_with_days_parameter_and_time_crossing_midnight(self):
        self.assertEqual(add_time("10:00 PM", "4:00", 1), "2:00 AM, 2 days later")

    def test_exactly_24_hours_duration(self):
        self.assertEqual(add_time("10:00 AM", "24:00"), "10:00 AM, 1 day later")

    def test_exactly_12_hours_duration_am_to_pm(self):
        self.assertEqual(add_time("10:00 AM", "12:00"), "10:00 PM")

    def test_exactly_12_hours_duration_pm_to_am(self):
        self.assertEqual(add_time("10:00 PM", "12:00"), "10:00 AM, 1 day later")

    # Error Handling Tests
    def test_invalid_initial_time_format_no_space(self):
        with self.assertRaisesRegex(ValueError, "Initial time must be in H:MM AM/PM or HH:MM format."):
            add_time("5:00PM", "1:00")

    def test_invalid_initial_time_format_wrong_period_case(self):
        # Regex `(AM|PM)` (case insensitive) directly catches this.
        with self.assertRaisesRegex(ValueError, "Initial time must be in H:MM AM/PM or HH:MM format."):
            add_time("5:00 XM", "1:00")

    def test_invalid_initial_time_format_incomplete_period(self):
        with self.assertRaisesRegex(ValueError, "Initial time must be in H:MM AM/PM or HH:MM format."):
            add_time("5:00 A", "1:00")

    def test_invalid_initial_time_non_numeric_hour(self):
        # Regex `\d{1,2}:\d{2}` catches this.
        with self.assertRaisesRegex(ValueError, "Initial time must be in H:MM AM/PM or HH:MM format."):
            add_time("A:00 PM", "1:00")

    def test_invalid_initial_time_non_numeric_minute(self):
        # Regex `\d{1,2}:\d{2}` catches this.
        with self.assertRaisesRegex(ValueError, "Initial time must be in H:MM AM/PM or HH:MM format."):
            add_time("5:AA PM", "1:00")

    def test_invalid_duration_format_separator(self):
        with self.assertRaisesRegex(ValueError, "Invalid duration string format: 1-00"):
            add_time("5:00 PM", "1-00")

    def test_invalid_duration_non_numeric_hour(self):
        # Regex `^\d{1,}:\d{2}$` catches this.
        with self.assertRaisesRegex(ValueError, "Invalid duration string format: A:00"):
            add_time("5:00 PM", "A:00")

    def test_invalid_duration_non_numeric_minute(self):
        # Regex `^\d{1,}:\d{2}$` catches this.
        with self.assertRaisesRegex(ValueError, "Invalid duration string format: 1:AA"):
            add_time("5:00 PM", "1:AA")

    def test_initial_time_missing_minutes(self):
        with self.assertRaisesRegex(ValueError, "Initial time must be in H:MM AM/PM or HH:MM format."):
            add_time("5 PM", "1:00")

    def test_duration_missing_minutes(self):
        with self.assertRaisesRegex(ValueError, "Invalid duration string format: 1"):
            add_time("5:00 PM", "1")

    def test_hours_out_of_typical_range_initial(self): # e.g. 13:00 PM
        # This should be caught by the H:MM AM/PM format if H is \d{1,2}
        # The current validation for initial time parses H and M then period.
        # int("13") is fine. 13:00 PM becomes 13+12 = 25 hours in _initial_time_to_minutes.
        # This is not explicitly an error by current rules, but leads to interesting behavior.
        # Let's test current behavior. 13:00 PM is treated as 1 PM.
        # (13 % 12 + 12 * (period.upper() == 'PM')) -> (1 + 12*1) = 13
        # So, 13:00 PM is correctly 13:00.
        # However, the regex is \d{1,2}. Let's assume H must be 1-12.
        # The problem statement says "H:MM AM/PM". It doesn't restrict H to 1-12 explicitly in validation.
        # The conversion logic `initial_hours % 12` handles it.
        # For now, let's assume the current behavior is acceptable as per parsing.
        # If H must be 1-12, then the regex `^\d{1,2}` and int conversion is not enough.
        # A specific check `if not (1 <= initial_hours <= 12): raise ValueError` would be needed.
        # This test is more of an observation. No assertRaise for now.
        # self.assertEqual(add_time("13:00 PM", "1:00"), "2:00 PM") # 13:00 PM is treated as 1:00 PM
        # This is because int("13") is 13. In _initial_time_to_minutes:
        # hours = 13, period = PM. if period == 'PM' and hours != 12: hours += 12 -> hours becomes 25.
        # This is an issue with _initial_time_to_minutes. It should use the parsed int(_initial_hours_str) from add_time
        # or ensure hours are within 1-12 range first.
        # The validation in add_time:
        # _initial_hours = int(_initial_hours_str) does not check range.
        # The conversion in add_time (before refactor):
        # (initial_hours % 12 + 12 * (period.upper() == 'PM'))
        # For 13:00 PM: (13 % 12 + 12 * 1) = (1 + 12) = 13. Correct.
        # For 12:00 PM: (12 % 12 + 12 * 1) = (0 + 12) = 12. Correct.
        # For 12:00 AM: (12 % 12 + 12 * 0) = 0. Correct.
        # The refactored _initial_time_to_minutes:
        # hours = int(time_parts[0]) -> 13
        # if period == 'PM' and hours != 12: hours += 12 -> 13 + 12 = 25. This is the problem.
        # It should be:
        # if period == 'PM' and hours != 12: hours_24 = hours + 12 else: hours_24 = hours
        # if period == 'AM' and hours == 12: hours_24 = 0
        # No, the original formula for initial_total_minutes was more robust:
        # initial_total_minutes = (initial_hours % 12 + 12 * (period.upper() == 'PM')) * 60 + initial_minutes
        # Let's assume the problem lies in _initial_time_to_minutes and fix it there if tests fail.
        # For now, I'll write the test based on expected behavior of "13:00 PM" being invalid if strict,
        # or "1:00 PM" if lenient due to modulo.
        # The problem description "H:MM AM/PM" usually implies H is 1-12.
        # The current regex `\d{1,2}` allows 0-99.
        # The current int conversion doesn't check range.
        # The specific ValueError for "Initial time hours and minutes must be integers" is for type, not range.
        # I'll add a test for this case expecting a ValueError, assuming H must be 1-12.
        # This might require a change in calculator.py's validation.
        # With the new Time class, "13:00 PM" should raise a ValueError
        # because hours_12 must be between 1 and 12.
        with self.assertRaisesRegex(ValueError, "Time hours must be between 1 and 12."):
            add_time("13:00 PM", "1:00")

    def test_minutes_out_of_range_initial(self): # e.g. 5:60 PM
        # Similar to hours, MM is \d{2}, allowing 00-99.
        # int("60") is fine. This should be an error.
        # add_time's validation doesn't check minute range (0-59).
        # _initial_time_to_minutes also just converts int.
        # This will also be an observation for now.
        # Expected: ValueError
        # With the new Time class, "5:60 PM" should raise a ValueError
        # because minutes must be between 00 and 59.
        with self.assertRaisesRegex(ValueError, "Time minutes must be between 00 and 59."):
            add_time("5:60 PM", "1:00")

    def test_duration_minutes_out_of_range(self): # e.g. 1:60
        # With the new Duration class, "1:60" should raise a ValueError
        # because minutes must be between 00 and 59.
        with self.assertRaisesRegex(ValueError, "Minutes component must be between 0 and 59."):
            add_time("5:00 PM", "1:60")


    # Tests for new Duration formats (including seconds and days)
    def test_duration_with_seconds_truncation1(self):
        self.assertEqual(add_time("1:00 PM", "0:00:29"), "1:00 PM")

    def test_duration_with_seconds_truncation2(self):
        self.assertEqual(add_time("1:00 PM", "0:00:59"), "1:00 PM")

    def test_duration_minute_rollover_from_seconds(self):
        self.assertEqual(add_time("1:00 PM", "0:01:00"), "1:01 PM")

    def test_duration_hms_format_truncation(self):
        self.assertEqual(add_time("1:00 PM", "1:02:03"), "2:02 PM") # Seconds 03 are truncated

    def test_duration_with_days_and_hms(self):
        self.assertEqual(add_time("10:00 AM", "2 days, 1:00:00"), "11:00 AM, 2 days later")

    def test_duration_with_zero_days_and_hms_truncation(self):
        self.assertEqual(add_time("10:00 AM", "0 days, 1:00:30"), "11:00 AM") # Seconds 30 truncated

    def test_duration_seconds_no_minute_change(self):
        self.assertEqual(add_time("11:59 AM", "0:00:59"), "11:59 AM")

    def test_duration_seconds_cause_minute_change_at_noon(self):
        self.assertEqual(add_time("11:59 AM", "0:01:00"), "12:00 PM")

    def test_duration_seconds_at_almost_midnight_no_change(self):
        # Time is H:MM, so 11:59 PM. Adding 1 sec doesn't change the minute.
        self.assertEqual(add_time("11:59 PM", "0:00:01"), "11:59 PM")

    def test_duration_seconds_at_almost_midnight_still_no_change(self):
        self.assertEqual(add_time("11:59 PM", "0:00:59"), "11:59 PM")

    def test_duration_seconds_cause_minute_change_at_midnight(self):
        self.assertEqual(add_time("11:59 PM", "0:01:00"), "12:00 AM, 1 day later")

    def test_duration_only_seconds_format(self):
        self.assertEqual(add_time("1:00 PM", ":30"), "1:00 PM") # 30 seconds, truncated

    def test_duration_only_seconds_format_causing_rollover(self):
        # self.assertEqual(add_time("1:00 PM", ":60"), "1:01 PM") # This was the old line causing error
                                                                 # However, my Duration class validates seconds component 0-59.
                                                                 # So this should be a ValueError.
        # Update: The Duration class was specified to validate seconds component 0-59.
        with self.assertRaisesRegex(ValueError, "Seconds component must be between 0 and 59."):
            add_time("1:00 PM", ":60")

    def test_duration_invalid_minutes_component_range_with_seconds(self):
        with self.assertRaisesRegex(ValueError, "Minutes component must be between 0 and 59."):
            add_time("1:00 PM", "0:60:30")

    def test_duration_invalid_format_days_seconds_only(self):
        # My regex for Duration does not support "D days, :SS"
        with self.assertRaisesRegex(ValueError, "Invalid duration string format"):
            add_time("1:00 PM", "1 day, :30")

    def test_duration_invalid_chars_in_hms(self):
        # This will be caught by int() conversion within Duration or by regex pattern itself.
        # The current regex `\d+:\d{1,2}(?::\d{1,2})?` should fail for "1:AA:30"
        with self.assertRaisesRegex(ValueError, "Invalid duration string format"): # Or specific int conversion error if regex was more lenient
            add_time("1:00 PM", "1:AA:30")

    # Tests for 24-hour format initial_time
    def test_initial_time_24hr_format_afternoon(self):
        self.assertEqual(add_time("13:00", "1:00"), "2:00 PM")

    def test_initial_time_24hr_format_midnight_early_am(self):
        self.assertEqual(add_time("00:30", "2:00"), "2:30 AM")

    def test_initial_time_24hr_format_crossing_midnight(self):
        self.assertEqual(add_time("23:00", "2:00"), "1:00 AM, 1 day later")

    def test_initial_time_invalid_24hr_hour_too_high(self):
        with self.assertRaisesRegex(ValueError, "Time hours must be between 0 and 23 for HH:MM format."):
            add_time("24:00", "1:00")

    def test_initial_time_invalid_24hr_minute_too_high(self):
        # This will be caught by "Time minutes must be between 00 and 59."
        with self.assertRaisesRegex(ValueError, "Time minutes must be between 00 and 59."):
            add_time("13:60", "1:00")

    def test_initial_time_ambiguous_format_fallback(self):
        # Test a format that could be HH:MM but is invalid for it, and also not AM/PM
        # e.g. "13:00 XM" - should fail parsing before specific HH:MM or AM/PM logic
        with self.assertRaisesRegex(ValueError, "Initial time must be in H:MM AM/PM or HH:MM format."):
            add_time("13:00 XM", "1:00")


if __name__ == "__main__":
    unittest.main()
