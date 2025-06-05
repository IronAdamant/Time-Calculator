import argparse
import sys
# Assuming core.py is in the same directory or Python path is set up correctly
# For direct execution, Python might need `PYTHONPATH=.` or similar.
# When run as a module (python -m timecalculator.cli), this should work.
from .core import Time, Duration

def setup_parser() -> argparse.ArgumentParser:
    """Sets up the argument parser for the CLI."""
    parser = argparse.ArgumentParser(description="Add a duration to an initial time.")
    parser.add_argument("initial_time",
                        type=str,
                        help="The starting time in 'H:MM AM/PM' format (e.g., \"3:00 PM\").")
    parser.add_argument("duration",
                        type=str,
                        help="The duration to add. Formats: 'H:MM:SS', 'H:MM', 'D days, H:MM:SS', 'D days, H:MM', ':SS'. E.g., \"3:10\", \"1 day, 2:05:30\".")
    parser.add_argument("--days_offset",
                        type=int,
                        default=0,
                        help="Optional number of whole days to add to the result (default: 0).")
    return parser

def main():
    """Main function for the CLI."""
    parser = setup_parser()
    args = parser.parse_args()

    try:
        start_time = Time(args.initial_time)
        duration_to_add = Duration(args.duration)

        # The days_offset is added *after* the Time + Duration calculation.
        # Time + Duration already handles days passed from the duration itself.
        end_time, days_passed_from_duration = start_time + duration_to_add

        total_days_passed = days_passed_from_duration + args.days_offset

        result_str = str(end_time)

        if total_days_passed == 1:
            result_str += ", 1 day later"
        elif total_days_passed > 1:
            result_str += f", {total_days_passed} days later"

        print(result_str)

    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
