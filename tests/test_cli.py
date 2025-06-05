import unittest
import subprocess
import sys
import os

class TestCLI(unittest.TestCase):

    # Helper to run the CLI command
    def run_cli(self, args_list):
        # Ensure the command is constructed to run the cli module correctly
        # The path to cli.py needs to be resolvable or use module execution
        # Using -m timecalculator.cli is generally more robust if the package structure is correct
        # and the parent directory of timecalculator is in PYTHONPATH (which it should be for tests)
        command = [sys.executable, "-m", "timecalculator.cli"] + args_list
        # print(f"Running command: {' '.join(command)}") # For debugging test setup
        return subprocess.run(command, capture_output=True, text=True)

    def test_successful_run(self):
        result = self.run_cli(["5:00 PM", "3:10"])
        self.assertEqual(result.returncode, 0, f"CLI Error: {result.stderr}")
        self.assertEqual(result.stdout.strip(), "8:10 PM")

    def test_successful_run_with_days_offset(self):
        result = self.run_cli(["10:00 PM", "2:30", "--days_offset", "1"])
        self.assertEqual(result.returncode, 0, f"CLI Error: {result.stderr}")
        self.assertEqual(result.stdout.strip(), "12:30 AM, 2 days later")

    def test_successful_run_duration_with_days_and_seconds(self):
        result = self.run_cli(["10:00 AM", "1 day, 2:05:30"])
        # Time class truncates seconds, so 2:05:30 effectively means 2 hours 5 minutes for Time state
        # Duration itself is 1 day, 2h, 5m, 30s.
        # Initial: 10:00 AM (600 minutes from midnight)
        # Duration: 1 day + 2*60 + 5 minutes + 30 seconds = 1 day + 125 minutes + 30 seconds
        # Total seconds from midnight for initial time: 600 * 60 = 36000 seconds
        # Total duration in seconds: (1 * 24 * 3600) + (2 * 3600) + (5 * 60) + 30 = 86400 + 7200 + 300 + 30 = 93930 seconds
        # Combined seconds: 36000 + 93930 = 129930 seconds
        # Days passed: 129930 // 86400 = 1 day
        # Seconds into the new day: 129930 % 86400 = 43530 seconds
        # Minutes into the new day (for Time object): 43530 // 60 = 725.5 -> 725 minutes (due to truncation)
        # 725 minutes from midnight: 12 hours and 5 minutes -> 12:05 PM
        self.assertEqual(result.returncode, 0, f"CLI Error: {result.stderr}")
        self.assertEqual(result.stdout.strip(), "12:05 PM, 1 day later")

    def test_invalid_initial_time_format(self):
        result = self.run_cli(["invalid", "1:00"])
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(result.stderr.strip().startswith("Error: Initial time must be in H:MM AM/PM or HH:MM format."), f"Actual stderr: {result.stderr}")

    def test_invalid_initial_time_value(self):
        result = self.run_cli(["13:00 PM", "1:00"]) # Hour out of 1-12 range for AM/PM format
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(result.stderr.strip().startswith("Error: Time hours must be between 1 and 12 for AM/PM format."), f"Actual stderr: {result.stderr}")

    def test_invalid_duration_format(self):
        result = self.run_cli(["1:00 PM", "invalid_duration"])
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(result.stderr.strip().startswith("Error: Invalid duration string format: invalid_duration"), f"Actual stderr: {result.stderr}")

    def test_invalid_duration_value(self):
        result = self.run_cli(["1:00 PM", "1:60"]) # Minute component out of 0-59 range
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(result.stderr.strip().startswith("Error: Minutes component must be between 0 and 59."), f"Actual stderr: {result.stderr}")

    def test_main_example_from_prompt(self):
        # python timecalculator/cli.py "5:00 PM" "150:35"
        result = self.run_cli(["5:00 PM", "150:35"])
        self.assertEqual(result.returncode, 0, f"CLI Error: {result.stderr}")
        self.assertEqual(result.stdout.strip(), "11:35 PM, 6 days later")

    def test_example2_from_prompt(self):
        # python timecalculator/cli.py "8:00 AM" "2 days, 3:00:55"
        # Duration: 2 days, 3h, 0m, 55s
        # Initial: 8:00 AM (480 mins from midnight)
        # Time.__add__ will truncate the 55s.
        # End time: 8:00 AM + 3:00 = 11:00 AM
        # Days passed: 2 days
        result = self.run_cli(["8:00 AM", "2 days, 3:00:55"])
        self.assertEqual(result.returncode, 0, f"CLI Error: {result.stderr}")
        self.assertEqual(result.stdout.strip(), "11:00 AM, 2 days later")

    def test_example3_from_prompt_with_days_offset(self):
        # python timecalculator/cli.py "11:30 PM" "1:00:00" --days_offset 1
        # Initial: 11:30 PM
        # Duration: 1:00:00 (1 hour)
        # Time + Duration: 11:30 PM + 1 hour = 12:30 AM, 1 day later (days_passed_from_duration = 1)
        # days_offset = 1
        # total_days_passed = 1 (from duration) + 1 (from offset) = 2
        result = self.run_cli(["11:30 PM", "1:00:00", "--days_offset", "1"])
        self.assertEqual(result.returncode, 0, f"CLI Error: {result.stderr}")
        self.assertEqual(result.stdout.strip(), "12:30 AM, 2 days later")

    def test_example4_invalid_from_prompt(self):
        # python timecalculator/cli.py "bad" "1:00"
        result = self.run_cli(["bad", "1:00"])
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(result.stderr.strip().startswith("Error: Initial time must be in H:MM AM/PM or HH:MM format."), f"Actual stderr: {result.stderr}")

    # Tests for 24-hour format initial_time in CLI
    def test_cli_initial_time_24hr_afternoon(self):
        result = self.run_cli(["13:00", "1:00"])
        self.assertEqual(result.returncode, 0, f"CLI Error: {result.stderr}")
        self.assertEqual(result.stdout.strip(), "2:00 PM")

    def test_cli_initial_time_24hr_early_am(self):
        result = self.run_cli(["00:30", "2:00"])
        self.assertEqual(result.returncode, 0, f"CLI Error: {result.stderr}")
        self.assertEqual(result.stdout.strip(), "2:30 AM")

    def test_cli_initial_time_invalid_24hr_hour_too_high(self):
        result = self.run_cli(["24:00", "1:00"])
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(result.stderr.strip().startswith("Error: Time hours must be between 0 and 23 for HH:MM format."), f"Actual stderr: {result.stderr}")

    def test_cli_initial_time_invalid_format_ambiguous(self):
        result = self.run_cli(["13:00PM", "1:00"]) # Invalid, not HH:MM, not H:MM AM/PM
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(result.stderr.strip().startswith("Error: Initial time must be in H:MM AM/PM or HH:MM format."), f"Actual stderr: {result.stderr}")


if __name__ == "__main__":
    # This allows running tests directly from this file if needed,
    # but `python -m unittest tests.test_cli` is standard.
    unittest.main()
