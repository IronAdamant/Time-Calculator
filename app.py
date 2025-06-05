from flask import Flask, request, jsonify, render_template
# from werkzeug.exceptions import BadRequest # No longer explicitly needed for get_json error handling
# Ensure timecalculator package is discoverable.
# If app.py is at the root, and timecalculator is a dir at the root,
# this import should work when app.py is run from the root.
from timecalculator.core import Time, Duration

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/calculate_time', methods=['POST'])
def calculate_time_api():
    data = request.get_json(silent=True) # Use silent=True
    if not data:
        # This now handles:
        # 1. Content-Type is not application/json (get_json returns None)
        # 2. Content-Type is application/json, but data is malformed (get_json returns None)
        # 3. Content-Type is application/json, but data is 'null' (get_json returns None) or empty.
        return jsonify({"error": "Invalid JSON payload or Content-Type (must be application/json and valid JSON)"}), 400

    initial_time_str = data.get('initial_time')
    duration_str = data.get('duration')
    days_offset_str = data.get('days_offset', '0') # Default to '0' as a string

    if not initial_time_str:
        return jsonify({"error": "Missing 'initial_time'"}), 400
    if not duration_str:
        return jsonify({"error": "Missing 'duration'"}), 400

    try:
        time_obj = Time(initial_time_str)
        duration_obj = Duration(duration_str)

        days_offset = 0 # Default
        # days_offset_str comes from data.get('days_offset', '0')
        # So it will be a string '0' by default, or actual value from JSON if provided.

        if isinstance(days_offset_str, (int, str)):
            try:
                days_offset = int(days_offset_str) # Handles int, or string like "1", "-2"
            except ValueError: # Handles string like "abc"
                return jsonify({"error": "Invalid format for days_offset, must be a string representing an integer."}), 400
        else: # It's a float, boolean, list, dict etc. from JSON
            return jsonify({"error": "Invalid type for days_offset, must be an integer or a string representing an integer."}), 400

        new_time_obj, days_from_duration = time_obj + duration_obj
        total_days_passed = days_from_duration + days_offset

        calculated_time_str = str(new_time_obj)
        result_display_str = calculated_time_str

        # Update display string based on total_days_passed
        if total_days_passed == 1:
            result_display_str += " (next day)"
        elif total_days_passed > 1:
            result_display_str += f" ({total_days_passed} days later)"
        elif total_days_passed == -1:
            result_display_str += " (previous day)"
        elif total_days_passed < -1:
            result_display_str += f" ({abs(total_days_passed)} days prior)"
        # No suffix if total_days_passed is 0

        return jsonify({
            "result_string": result_display_str,
            "calculated_time": calculated_time_str,
            "days_numeric": total_days_passed
        }), 200

    except ValueError as e: # Catches errors from Time/Duration init
        return jsonify({"error": str(e)}), 400
    # TypeError from int() if days_offset_str is e.g. a list is already caught by the new days_offset logic returning 400.
    # A direct TypeError for days_offset itself is less likely with the new logic.
    # The previous custom TypeError for days_offset is removed in favor of direct int conversion attempt.
    except Exception as e:
        # Log the exception server-side
        app.logger.error(f"Unexpected error: {e}", exc_info=True)
        return jsonify({"error": "An unexpected server error occurred"}), 500

# Removed custom BadRequest handler as silent=True for get_json handles it via 'if not data:'

if __name__ == '__main__':
    # Note: For development only. A production server (e.g., Gunicorn) would be used for deployment.
    # Running on port 8080 as specified.
    app.run(debug=True, host='0.0.0.0', port=8080)
