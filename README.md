# Web-Based Time Calculator

## Description

A web application that allows users to calculate a new time by adding a duration (including days, hours, minutes, and seconds) to an initial start time. It supports various time input formats, provides real-time client-side validation, and includes user experience enhancements like theme selection and input persistence.

## Features

*   Calculates a future or past time based on a start time and a duration.
*   **Flexible Time Input:** Accepts initial time in "H:MM AM/PM" (12-hour) or "HH:MM" (24-hour) formats.
*   **Versatile Duration Input:** Accepts duration in various formats like "H:MM", "H:MM:SS", "D days, H:MM", "D days, H:MM:SS", and just seconds (e.g., ":SS").
*   **Day Offsets:** Supports adding an additional offset in whole days.
*   **Client-Side Validation:** Real-time feedback for input formats as users type, disabling the calculate button if inputs are invalid.
*   **Light/Dark Mode:** User-selectable themes for visual preference, persisted using localStorage.
*   **Remember Inputs:** Last used valid inputs are saved via localStorage and pre-filled on revisit.
*   **Clear Functionality:** Easily clear all inputs and results.
*   **Basic Accessibility:** Includes ARIA attributes for better screen reader compatibility and keyboard navigation considerations.
*   **Flask Backend API:** Time calculations are handled by a Python Flask backend.
*   **Unit Tests:** Includes unit tests for both the core time calculation logic and the backend API.

## Technologies Used

*   **Backend:** Python, Flask
*   **Frontend:** HTML, CSS, JavaScript
*   **Core Logic:** Python (custom `Time` and `Duration` classes)
*   **Testing:** Python `unittest` module

## Setup and Installation

1.  **Prerequisites:**
    *   Python 3.7+
    *   `pip` (Python package installer)

2.  **Clone the Repository:**
    ```bash
    git clone <repository_url> # Replace <repository_url> with the actual URL
    cd <repository_directory_name>
    ```

3.  **Create a Virtual Environment (Recommended):**
    ```bash
    python -m venv venv
    ```
    Activate the virtual environment:
    *   Windows: `venv\Scripts\activate`
    *   macOS/Linux: `source venv/bin/activate`

4.  **Install Dependencies:**
    Currently, the main dependency is Flask.
    ```bash
    pip install Flask
    ```

## Running the Application

1.  **Start the Flask Development Server:**
    Ensure your virtual environment is activated.
    ```bash
    python app.py
    ```
    Alternatively, you can use the Flask CLI (if Flask is installed and `app.py` is set up for it, e.g. by setting `FLASK_APP=app.py`):
    ```bash
    flask run --host=0.0.0.0 --port=8080
    ```
    The application typically runs on `http://localhost:8080` or `http://0.0.0.0:8080`. The console output will indicate the exact address.

2.  **Access in Browser:**
    Open your web browser and navigate to the address shown in the terminal (e.g., `http://localhost:8080`).

## Running Unit Tests

Ensure your virtual environment is activated.

1.  **Core Time Logic Tests:**
    ```bash
    python -m unittest tests.test_calculator
    ```

2.  **Web Application API Tests:**
    ```bash
    python -m unittest tests.test_webapp
    ```
3.  **CLI Tool Tests (if applicable):**
    ```bash
    python -m unittest tests.test_cli
    ```


## Project Structure (Overview)

-   `app.py`: Main Flask application file (backend server and API).
-   `timecalculator/`: Directory containing the core time calculation logic.
    -   `core.py`: Defines the `Time` and `Duration` classes.
    -   `calculator.py`: Contains the `add_time` function (primarily uses `core.py`).
    -   `cli.py`: Command Line Interface for the calculator.
-   `static/`: Contains frontend static files.
    -   `style.css`: CSS styles for the web interface.
    -   `script.js`: JavaScript for frontend interactivity.
-   `templates/`: Contains HTML templates.
    -   `index.html`: The main HTML page for the application.
-   `tests/`: Contains unit tests.
    -   `test_calculator.py`: Tests for the core time logic in `timecalculator/core.py`.
    -   `test_webapp.py`: Tests for the Flask API endpoints in `app.py`.
    -   `test_cli.py`: Tests for the command-line interface.
-   `README.md`: This file.
