import re
from typing import Tuple, Optional

class Duration:
    """
    Represents a duration of time.
    Can be initialized from formats like "H:MM:SS", "H:MM", "D days, H:MM:SS",
    "D days, H:MM", or ":SS".
    """

    def __init__(self, duration_str: str):
        """
        Initializes a Duration object from a string.

        Args:
            duration_str: The duration string. Supported formats:
                          "H:MM:SS" (e.g., "1:02:03")
                          "H:MM" (e.g., "1:02")
                          "D days, H:MM:SS" (e.g., "2 days, 1:02:03")
                          "D days, H:MM" (e.g., "3 days, 1:02")
                          ":SS" (e.g., ":05" for 5 seconds)
                          Components must be integers. Days and hours >= 0. 0 <= Minutes, Seconds <= 59.

        Raises:
            ValueError: For invalid formats or out-of-range components.
        """
        self._parsed_days: Optional[int] = None
        self._parsed_hours: Optional[int] = None
        self._parsed_minutes: Optional[int] = None
        self._parsed_seconds: Optional[int] = None

        total_d = 0
        total_h = 0
        total_m = 0
        total_s = 0

        # Pattern 1: Matches optional days part, then hours, minutes, and optional seconds.
        # - (?:(\d+)\s+days?,\s+)? : Optional non-capturing group for "D days, " part. \d+ captures day number.
        # - (\d+): Capturing group for hours (allows multiple digits like "48" for 48 hours).
        # - :(\d{1,2}): Capturing group for minutes (1 or 2 digits).
        # - (?::(\d{1,2}))? : Optional non-capturing group for ":SS" part. \d{1,2} captures seconds.
        pat1 = re.compile(r"^(?:(\d+)\s+days?,\s+)?(\d+):(\d{1,2})(?::(\d{1,2}))?$")
        match1 = pat1.fullmatch(duration_str)

        # Pattern 2: Matches only seconds, formatted as ":SS".
        # - :(\d{1,2})$ : Capturing group for seconds (1 or 2 digits).
        pat2 = re.compile(r"^:(\d{1,2})$")
        match2 = pat2.fullmatch(duration_str)

        if match1:
            days_str, hours_str, minutes_str, seconds_str = match1.groups()
            if days_str:
                total_d = int(days_str)
                self._parsed_days = total_d

            total_h = int(hours_str) # Required for this pattern
            self._parsed_hours = total_h

            total_m = int(minutes_str) # Required for this pattern
            self._parsed_minutes = total_m

            if seconds_str:
                total_s = int(seconds_str)
                self._parsed_seconds = total_s
            elif self._parsed_minutes is not None: # If H:MM format, seconds is 0
                self._parsed_seconds = 0

        elif match2:
            seconds_str, = match2.groups()
            total_s = int(seconds_str)
            self._parsed_seconds = total_s
            # For ":SS" format, other parsed components remain 0 or None
            self._parsed_days = 0
            self._parsed_hours = 0
            self._parsed_minutes = 0
        else:
            raise ValueError(f"Invalid duration string format: {duration_str}")

        # Validate component ranges
        if self._parsed_days is not None and self._parsed_days < 0:
            raise ValueError("Days component must be non-negative.")
        if self._parsed_hours is not None and self._parsed_hours < 0:
            raise ValueError("Hours component must be non-negative.")
        if self._parsed_minutes is not None and not (0 <= self._parsed_minutes <= 59):
            raise ValueError("Minutes component must be between 0 and 59.")
        if self._parsed_seconds is not None and not (0 <= self._parsed_seconds <= 59):
            raise ValueError("Seconds component must be between 0 and 59.")

        # Use the directly parsed values for calculation if they were part of the string
        # Fallback to total_x if a component was not explicitly parsed (e.g. H in :SS)
        calc_d = self._parsed_days if self._parsed_days is not None else 0
        calc_h = self._parsed_hours if self._parsed_hours is not None else 0
        calc_m = self._parsed_minutes if self._parsed_minutes is not None else 0
        calc_s = self._parsed_seconds if self._parsed_seconds is not None else 0

        self._total_seconds: int = (calc_d * 24 * 60 * 60 +
                                   calc_h * 60 * 60 +
                                   calc_m * 60 +
                                   calc_s)

    @property
    def total_seconds(self) -> int:
        """Returns the duration in total seconds."""
        return self._total_seconds

    # Properties to return parsed components
    @property
    def days_part(self) -> Optional[int]:
        """Returns the days component parsed from input string, or None if not specified."""
        return self._parsed_days

    @property
    def hours_part(self) -> Optional[int]:
        """Returns the hours component parsed from input string, or None if not specified."""
        return self._parsed_hours

    @property
    def minutes_part(self) -> Optional[int]:
        """Returns the minutes component parsed from input string, or None if not specified."""
        return self._parsed_minutes

    @property
    def seconds_part(self) -> Optional[int]:
        """Returns the seconds component parsed from input string, or None if not specified."""
        return self._parsed_seconds

    def __str__(self) -> str:
        """Returns the duration canonically as 'D days, H:MM:SS' from total seconds."""
        if self._total_seconds == 0:
            return "0:00:00" # Or "0 days, 0:00:00" for full consistency

        calc_d = self._total_seconds // (24 * 60 * 60)
        remaining_secs = self._total_seconds % (24 * 60 * 60)
        calc_h = remaining_secs // (60 * 60)
        remaining_secs %= (60 * 60)
        calc_m = remaining_secs // 60
        calc_s = remaining_secs % 60

        if calc_d > 0:
            day_str = f"{calc_d} day{'s' if calc_d > 1 else ''}, "
        else:
            day_str = ""
        return f"{day_str}{calc_h}:{str(calc_m).zfill(2)}:{str(calc_s).zfill(2)}"

    def __repr__(self) -> str:
        """Returns a string representation of the Duration object."""
        return f'Duration(total_seconds={self._total_seconds})'

class Time:
    """Represents a specific point in time on a 24-hour clock."""

    def __init__(self, initial_time_str: str):
        """
        Initializes a Time object from a string.

        Args:
            initial_time_str: The time string, supporting two formats:
                              1. "H:MM AM/PM" (12-hour format, e.g., "3:00 PM", "12:30 AM")
                                 - Hours (H) must be 1-12.
                                 - Minutes (MM) must be 00-59.
                                 - Period is AM/PM (case-insensitive).
                              2. "HH:MM" (24-hour format, e.g., "13:00", "00:30")
                                 - Hours (HH) must be 0-23.
                                 - Minutes (MM) must be 00-59.
        Raises:
            ValueError: If initial_time_str does not match either format,
                        if components are not integers, or if hours/minutes are out of valid range.
        """
        # Pattern for "H:MM AM/PM" (12-hour format).
        # - ^(\d{1,2}): Start, hours (1 or 2 digits).
        # - :(\d{2}): Minutes (exactly 2 digits).
        # - \s+(AM|PM)$: Space, then AM or PM (case-insensitive due to flag).
        pat_12hr = re.compile(r"^(\d{1,2}):(\d{2})\s+(AM|PM)$", re.IGNORECASE)

        # Pattern for "HH:MM" (24-hour format).
        # - ^(\d{1,2}): Start, hours (1 or 2 digits).
        # - :(\d{2})$: Minutes (exactly 2 digits), end.
        pat_24hr = re.compile(r"^(\d{1,2}):(\d{2})$")

        match_12hr = pat_12hr.fullmatch(initial_time_str)
        match_24hr = pat_24hr.fullmatch(initial_time_str)

        if match_12hr:
            h_str, m_str, period_str = match_12hr.groups()
            period = period_str.upper()

            try:
                hours_12 = int(h_str)
                minutes = int(m_str)
            except ValueError: # Should not happen if regex matches digits, but good practice
                raise ValueError("Time hours and minutes must be valid integers.")

            if not (1 <= hours_12 <= 12):
                raise ValueError("Time hours must be between 1 and 12 for AM/PM format.")
            if not (0 <= minutes <= 59):
                raise ValueError("Time minutes must be between 00 and 59.")

            # Convert to 24-hour format for internal storage
            hours_24 = hours_12
            if period == 'AM':
                if hours_12 == 12:  # 12 AM (midnight) is 0 hours
                    hours_24 = 0
            elif period == 'PM':
                if hours_12 != 12:  # For 1 PM to 11 PM, add 12 hours
                    hours_24 += 12
                # For 12 PM (noon), hours_24 remains 12 (no change from initial hours_12)

            self._minutes_from_midnight: int = hours_24 * 60 + minutes

        elif match_24hr:
            h_str, m_str = match_24hr.groups()
            try:
                hours_24 = int(h_str)
                minutes = int(m_str)
            except ValueError: # Should not happen
                raise ValueError("Time hours and minutes must be valid integers.")

            if not (0 <= hours_24 <= 23):
                raise ValueError("Time hours must be between 0 and 23 for HH:MM format.")
            if not (0 <= minutes <= 59):
                raise ValueError("Time minutes must be between 00 and 59.") # Consistent message

            self._minutes_from_midnight: int = hours_24 * 60 + minutes
        else:
            raise ValueError("Initial time must be in H:MM AM/PM or HH:MM format.")

        # self._initial_time_str = initial_time_str # Optional: store original for repr if needed


    @classmethod
    def from_minutes(cls, total_minutes_from_midnight: int) -> 'Time':
        """
        Creates a Time object from total minutes from midnight (0-1439).
        Input is assumed to be within a single day (0 to 24*60 - 1).
        """
        if not (0 <= total_minutes_from_midnight <= 1439): # 1439 = 24*60 - 1
            raise ValueError("total_minutes_from_midnight for Time.from_minutes must be between 0 and 1439.")

        hours_24 = total_minutes_from_midnight // 60
        minutes = total_minutes_from_midnight % 60

        period = "AM" if hours_24 < 12 else "PM"

        display_hours_12 = hours_24 % 12
        if display_hours_12 == 0:  # 00:xx (midnight) or 12:xx (noon)
            display_hours_12 = 12

        # Construct the string and use main __init__ for consistency and validation
        # This ensures the internal state is always set via the same validation path.
        time_str = f"{display_hours_12}:{str(minutes).zfill(2)} {period}"
        return cls(time_str)

    @property
    def minutes_from_midnight(self) -> int:
        """Returns the time in minutes from midnight (00:00)."""
        return self._minutes_from_midnight

    def __add__(self, other: 'Duration') -> Tuple['Time', int]:
        """
        Adds a Duration to this Time. Time objects operate at minute precision for their state.
        Seconds from the duration are used in calculation but truncated for the new Time's state.

        Args:
            other: A Duration object.

        Returns:
            A tuple containing:
                - A new Time object representing the resulting time (seconds truncated).
                - An integer representing the number of full 24-hour days passed.
        """
        if not isinstance(other, Duration):
            return NotImplemented

        current_time_seconds_from_midnight = self.minutes_from_midnight * 60
        new_total_seconds_overall = current_time_seconds_from_midnight + other.total_seconds

        days_passed = new_total_seconds_overall // (24 * 60 * 60)
        final_new_time_total_seconds_within_day = new_total_seconds_overall % (24 * 60 * 60)

        # Time class operates on minute precision, so truncate seconds for the new Time object's state
        final_new_time_minutes = final_new_time_total_seconds_within_day // 60

        new_time_obj = Time.from_minutes(final_new_time_minutes)
        return new_time_obj, days_passed

    def __str__(self) -> str:
        """Returns the time in "H:MM AM/PM" format (e.g., "1:30 PM")."""
        hours_24 = self._minutes_from_midnight // 60
        minutes = self._minutes_from_midnight % 60

        period = "AM" if hours_24 < 12 else "PM"

        # Convert 24-hour format to 12-hour format for display
        display_hours_12 = hours_24 % 12
        if display_hours_12 == 0:  # Handles 12 AM (00:xx which is 12 AM) and 12 PM (12:xx which is 12 PM)
            display_hours_12 = 12

        return f"{display_hours_12}:{str(minutes).zfill(2)} {period}"

    def __repr__(self) -> str:
        """Returns a string representation of the Time object, e.g., Time("1:30 PM")."""
        return f'Time("{self.__str__()}")'
