from typing import Optional
from .core import Time, Duration

# Removed re import as validation is now in core.py

def add_time(initial_time_str: str, duration_str: str, days_param: Optional[int] = 0) -> str:
  """
  Adds a duration to an initial time, optionally across several days.

  Args:
    initial_time_str: The starting time in "H:MM AM/PM" format (e.g., "3:00 PM").
                      Validation (format, ranges) is performed by the Time class.
    duration_str: The duration to add, in "H:MM" format (e.g., "3:10").
                  Validation (format, ranges) is performed by the Duration class.
    days_param: Optional. An integer representing the number of additional full days
                to add. Defaults to 0 if None or not provided.

  Returns:
    The calculated new time as a string in the format "H:MM AM/PM".
    If the calculation results in one or more days later, the string will
    append ", N day later" or ", N days later".

  Raises:
    ValueError: Propagated from Time/Duration classes if input strings are invalid.
                Specific messages depend on the validation in Time/Duration.
  """

  # Create Time and Duration objects. This step also handles validation.
  # ValueErrors from Time/Duration constructors will propagate up.
  initial_time_obj = Time(initial_time_str)
  duration_obj = Duration(duration_str)

  # Add the duration to the initial time using Time's __add__ method
  new_time_obj, days_passed_from_duration = initial_time_obj + duration_obj

  # Account for the optional days_param
  # Ensure days_param is treated as 0 if None
  current_days_param = days_param if days_param is not None else 0
  total_days_passed = days_passed_from_duration + current_days_param

  # Format the output string
  result_time_str = str(new_time_obj) # Uses Time.__str__

  if total_days_passed == 1:
    result_time_str += ", 1 day later"
  elif total_days_passed > 1:
    result_time_str += f", {total_days_passed} days later"

  return result_time_str
