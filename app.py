from flask import Flask, request, jsonify, render_template
from datetime import datetime, timedelta
# from werkzeug.exceptions import BadRequest # No longer explicitly needed for get_json error handling
# Ensure timecalculator package is discoverable.
# If app.py is at the root, and timecalculator is a dir at the root,
# this import should work when app.py is run from the root.
from timecalculator.core import Time, Duration

app = Flask(__name__)

@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    # A reasonably strict CSP.
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; " # Default policy for fetching resources
        "script-src 'self'; "  # Allows scripts from 'self' (same origin)
        "style-src 'self'; "   # Allows stylesheets from 'self'
        "img-src 'self' data:; " # Allows images from 'self' and data: URIs
        "font-src 'self'; "    # Allows fonts from 'self'
        "connect-src 'self';"  # Allows connections (like fetch, XHR) to 'self' for API calls
    )
    # Optional: HTTP Strict Transport Security (HSTS)
    # response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/calculate_time', methods=['POST'])
def calculate_time_api():
    """
    API endpoint to calculate a new time based on an initial time, duration, and optional days offset.
    Expects a JSON payload with:
    {
        "initial_time": "H:MM AM/PM or HH:MM", (string, required)
        "duration": "D days, H:MM:SS or H:MM:SS or H:MM or :SS", (string, required)
        "days_offset": "N or N" (string or int, optional, defaults to 0)
    }
    Returns a JSON response:
    Success (200):
    {
        "result_string": "Formatted new time with day information", (string)
        "calculated_time": "H:MM AM/PM part of the new time", (string)
        "days_numeric": total_days_passed (int)
    }
    Error (400 for client errors, 500 for server errors):
    {
        "error": "Error message describing the issue" (string)
    }
    """
    data = request.get_json(silent=True) # Use silent=True to prevent Werkzeug from raising 400 for non-JSON or bad JSON
    if not data:
        # Handles cases where:
        # 1. Content-Type header is not 'application/json'.
        # 2. Request body is not valid JSON.
        # 3. Request body is valid JSON 'null'.
        return jsonify({"error": "Invalid JSON payload or Content-Type (must be application/json and valid JSON)"}), 400

    initial_time_str = data.get('initial_time')
    duration_str = data.get('duration')
    # days_offset_str = data.get('days_offset', '0') # Removed
    start_date_str = data.get('start_date') # Optional

    if not initial_time_str:
        return jsonify({"error": "Missing 'initial_time'"}), 400
    if not duration_str:
        return jsonify({"error": "Missing 'duration'"}), 400

    try:
        if not start_date_str:
            # --- Existing logic without start_date ---
            time_obj = Time(initial_time_str)
            duration_obj = Duration(duration_str)

            # days_offset related logic removed
            # days_offset = 0
            # if isinstance(days_offset_str, (int, str)):
            #     try:
            #         days_offset = int(days_offset_str)
            #     except ValueError:
            #         return jsonify({"error": "Invalid format for days_offset, must be a string representing an integer."}), 400
            # else:
            #     return jsonify({"error": "Invalid type for days_offset, must be an integer or a string representing an integer."}), 400

            new_time_obj, days_from_duration = time_obj + duration_obj
            total_days_passed = days_from_duration # Removed + days_offset

            calculated_time_str = str(new_time_obj)
            result_display_str = calculated_time_str

            if total_days_passed == 1:
                result_display_str += " (next day)"
            elif total_days_passed > 1:
                result_display_str += f" ({total_days_passed} days later)"
            elif total_days_passed == -1:
                result_display_str += " (previous day)"
            elif total_days_passed < -1:
                result_display_str += f" ({abs(total_days_passed)} days prior)"

            return jsonify({
                "result_string": result_display_str,
                "calculated_time": calculated_time_str,
                "days_numeric": total_days_passed
            }), 200
        else:
            # --- New logic with start_date ---
            # Parse initial_time_str to get hours and minutes
            time_obj_for_parsing = Time(initial_time_str) # Can raise ValueError
            parsed_hours = time_obj_for_parsing.minutes_from_midnight // 60
            parsed_minutes = time_obj_for_parsing.minutes_from_midnight % 60

            # Parse start_date_str
            try:
                start_datetime_obj = datetime.strptime(start_date_str, '%Y-%m-%d')
            except ValueError: # Catches invalid date format for start_date_str
                return jsonify({"error": f"Invalid start_date format. Expected YYYY-MM-DD, got '{start_date_str}'"}), 400

            # Combine into a full start datetime
            full_start_datetime = start_datetime_obj.replace(
                hour=parsed_hours, minute=parsed_minutes, second=0, microsecond=0
            )

            # Process Duration
            duration_obj = Duration(duration_str) # Can raise ValueError
            duration_timedelta = timedelta(seconds=duration_obj.total_seconds)

            # Apply days_offset if provided and valid. This is an ADDITION to the duration itself.
            # Note: The original logic applied days_offset on top of the duration's days.
            # Here, we add it to the start_datetime before adding the main duration, or add it to the duration_timedelta.
            # Let's add it to duration_timedelta for simplicity, consistent with how Duration might handle "X days".
            # Or, more directly, add to full_start_datetime if it's purely a date shift.
            # The original spec for days_offset was for the non-calendar case.
            # For calendar case, if days_offset is to be supported, it should shift the full_start_datetime.
            # All days_offset logic removed from this path as well.
            # current_days_offset = 0
            # if isinstance(days_offset_str, (int, str)) and days_offset_str != '0': # Only process if not default '0'
            #     try:
            #         current_days_offset = int(days_offset_str)
            #         full_start_datetime += timedelta(days=current_days_offset)
            #     except ValueError:
            #          return jsonify({"error": "Invalid format for days_offset, must be a string representing an integer when used with start_date."}), 400
            # elif not isinstance(days_offset_str, (int, str)) and days_offset_str != '0':
            #      return jsonify({"error": "Invalid type for days_offset, must be an integer or a string representing an integer when used with start_date."}), 400

            # Calculate End Datetime
            end_datetime_obj = full_start_datetime + duration_timedelta

            # Format Output Strings
            start_dt_str_formatted = full_start_datetime.strftime('%Y-%m-%d %I:%M %p')
            end_dt_str_formatted = end_datetime_obj.strftime('%Y-%m-%d %I:%M %p')
            duration_details = str(duration_obj) # e.g., "X days, H:MM:SS"

            return jsonify({
                "start_datetime_str": start_dt_str_formatted,
                "end_datetime_str": end_dt_str_formatted,
                "duration_details_str": duration_details
            }), 200

    except ValueError as e: # Catches errors from Time/Duration init or other ValueErrors like strptime
        return jsonify({"error": f"Error processing time/duration: {str(e)}"}), 400
    # A direct TypeError for days_offset itself is less likely with the new logic.
    # The previous custom TypeError for days_offset is removed in favor of direct int conversion attempt.
    except Exception as e:
        # Log the actual exception on the server side for debugging.
        app.logger.error(f"Unexpected server error: {e}", exc_info=True)
        return jsonify({"error": "An unexpected server error occurred"}), 500

# Custom BadRequest handler (@app.errorhandler(BadRequest)) was removed because
# request.get_json(silent=True) combined with the 'if not data:' check handles
# most common JSON-related client errors by returning a 400 with a specific message.

if __name__ == '__main__':
    # Note: For development only. A production server (e.g., Gunicorn) would be used for deployment.
    # Running on port 8080 as specified.
    app.run(debug=True, host='0.0.0.0', port=8080)
