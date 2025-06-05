document.addEventListener('DOMContentLoaded', () => {
    const initialTimeInput = document.getElementById('initial_time');
    const durationInput = document.getElementById('duration');
    const daysOffsetInput = document.getElementById('days_offset');
    const calculateButton = document.getElementById('calculate_button');
    const resultArea = document.getElementById('result_area');

    // Error span elements
    const initialTimeError = document.getElementById('initial_time_error');
    const durationError = document.getElementById('duration_error');
    const daysOffsetError = document.getElementById('days_offset_error');

    // Clear button
    const clearButton = document.getElementById('clear_button');

    // Theme Toggle Elements
    const themeToggleButton = document.getElementById('theme_toggle_button');
    const bodyElement = document.body;

    // --- Theme Handling ---
    function applyTheme(theme) {
        if (theme === 'dark') {
            bodyElement.classList.add('dark-theme');
            // themeToggleButton.textContent = '☀️'; // Example for icon change
        } else {
            bodyElement.classList.remove('dark-theme');
            // themeToggleButton.textContent = '🌓'; // Example for icon change
        }
    }

    // Load and apply stored theme on page load
    const storedTheme = localStorage.getItem('timeCalcTheme');
    if (storedTheme) {
        applyTheme(storedTheme);
    } else {
        applyTheme('light'); // Default to light theme
    }

    // Event Listener for Theme Toggle
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            bodyElement.classList.toggle('dark-theme');
            let newTheme = 'light';
            if (bodyElement.classList.contains('dark-theme')) {
                newTheme = 'dark';
            }
            localStorage.setItem('timeCalcTheme', newTheme);
            // applyTheme(newTheme); // Call applyTheme if button text/icon needs update based on theme
        });
    }

    // --- Load Stored Input Values ---
    const storedInitialTime = localStorage.getItem('timeCalcInitialTime');
    const storedDuration = localStorage.getItem('timeCalcDuration');
    const storedDaysOffset = localStorage.getItem('timeCalcDaysOffset');

    if (storedInitialTime) {
        initialTimeInput.value = storedInitialTime;
    }
    if (storedDuration) {
        durationInput.value = storedDuration;
    }
    if (storedDaysOffset) {
        daysOffsetInput.value = storedDaysOffset;
    }

    // Auto-focus on the first input field
    if(initialTimeInput) {
        initialTimeInput.focus();
    }

    // --- Validation Functions ---
    const initialTimeRegex = /^(\d{1,2}:\d{2}\s*(AM|PM)?|\d{1,2}:\d{2})$/i;
    const durationRegex = /^((\d+\s*days?,\s*)?\d{1,3}:\d{2}(:\d{2})?|:\d{2})$/i;
    const daysOffsetRegex = /^-?\d*$/;

    function checkFormValidityAndToggleButtonState() {
        const isInitialTimeCurrentlyValid = !initialTimeError.textContent && initialTimeInput.value.trim() !== '';
        const isDurationCurrentlyValid = !durationError.textContent && durationInput.value.trim() !== '';
        const isDaysOffsetCurrentlyValid = !daysOffsetError.textContent;

        if (isInitialTimeCurrentlyValid && isDurationCurrentlyValid && isDaysOffsetCurrentlyValid) {
            calculateButton.disabled = false;
        } else {
            calculateButton.disabled = true;
        }
    }

    function validateField(inputElement, errorElement, regex, errorMessage, isRequired = true) {
        const value = inputElement.value.trim();
        let isValid = true;

        if (isRequired && value === '') {
            errorElement.textContent = `${inputElement.previousElementSibling.textContent.replace(':','')} cannot be empty.`;
            inputElement.classList.add('invalid');
            inputElement.classList.remove('valid');
            inputElement.setAttribute('aria-invalid', 'true');
            inputElement.setAttribute('aria-describedby', errorElement.id);
            isValid = false;
        } else if (value !== '' && !regex.test(value)) {
            errorElement.textContent = errorMessage;
            inputElement.classList.add('invalid');
            inputElement.classList.remove('valid');
            inputElement.setAttribute('aria-invalid', 'true');
            inputElement.setAttribute('aria-describedby', errorElement.id);
            isValid = false;
        } else {
            errorElement.textContent = '';
            inputElement.classList.remove('invalid');
            inputElement.removeAttribute('aria-describedby');
            inputElement.removeAttribute('aria-invalid');
            if (value !== '') {
                inputElement.classList.add('valid');
            } else {
                inputElement.classList.remove('valid');
            }
        }
        checkFormValidityAndToggleButtonState();
        return isValid;
    }

    // --- Event Listeners for Live Validation (on 'input') ---
    initialTimeInput.addEventListener('input', () => validateField(initialTimeInput, initialTimeError, initialTimeRegex, 'Invalid format. Use H:MM AM/PM or HH:MM.', true));
    durationInput.addEventListener('input', () => validateField(durationInput, durationError, durationRegex, 'Invalid format. Use H:MM:SS, D days, H:MM, etc.', true));
    daysOffsetInput.addEventListener('input', () => validateField(daysOffsetInput, daysOffsetError, daysOffsetRegex, 'Must be an integer (e.g., 1, -2).', false));

    // Initial check for button state on page load
    checkFormValidityAndToggleButtonState();

    // --- Calculate Button Logic ---
    calculateButton.addEventListener('click', () => {
        resultArea.textContent = '';
        resultArea.classList.remove('error-message', 'success-message');

        const isInitialTimeValid = validateField(initialTimeInput, initialTimeError, initialTimeRegex, 'Invalid format. Use H:MM AM/PM or HH:MM.', true);
        const isDurationValid = validateField(durationInput, durationError, durationRegex, 'Invalid format. Use H:MM:SS, D days, H:MM, etc.', true);
        const isDaysOffsetValid = validateField(daysOffsetInput, daysOffsetError, daysOffsetRegex, 'Must be an integer (e.g., 1, -2).', false);

        if (!isInitialTimeValid || !isDurationValid || !isDaysOffsetValid) {
            resultArea.textContent = 'Please correct the errors in the fields above.';
            resultArea.classList.add('error-message');
            return;
        }

        const requestData = {
            initial_time: initialTimeInput.value.trim(),
            duration: durationInput.value.trim()
        };
        const daysOffsetValue = daysOffsetInput.value.trim();
        if (daysOffsetValue !== '') {
            requestData.days_offset = daysOffsetValue;
        }

        calculateButton.disabled = true;
        calculateButton.textContent = 'Calculating...';

        fetch('/api/calculate_time', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.error || `Server error: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.result_string) {
                resultArea.textContent = data.result_string;
                resultArea.classList.add('success-message');
                initialTimeInput.classList.remove('valid');
                durationInput.classList.remove('valid');
                daysOffsetInput.classList.remove('valid');
                // Ensure ARIA attributes are cleared on success too
                initialTimeInput.removeAttribute('aria-invalid');
                initialTimeInput.removeAttribute('aria-describedby');
                durationInput.removeAttribute('aria-invalid');
                durationInput.removeAttribute('aria-describedby');
                daysOffsetInput.removeAttribute('aria-invalid');
                daysOffsetInput.removeAttribute('aria-describedby');


                localStorage.setItem('timeCalcInitialTime', initialTimeInput.value.trim());
                localStorage.setItem('timeCalcDuration', durationInput.value.trim());
                localStorage.setItem('timeCalcDaysOffset', daysOffsetInput.value.trim());

            } else if (data.error) {
                resultArea.textContent = `Error: ${data.error}`;
                resultArea.classList.add('error-message');
            }
        })
        .catch(error => {
            resultArea.textContent = `Error: ${error.message || 'Failed to fetch. Check network or server.'}`;
            resultArea.classList.add('error-message');
        })
        .finally(() => {
            calculateButton.textContent = 'Calculate';
            checkFormValidityAndToggleButtonState();
        });
    });

    // --- Clear Button Logic ---
    clearButton.addEventListener('click', () => {
        initialTimeInput.value = '';
        durationInput.value = '';
        daysOffsetInput.value = '';

        resultArea.textContent = '';
        resultArea.classList.remove('success-message', 'error-message');

        const errorSpans = [initialTimeError, durationError, daysOffsetError];
        errorSpans.forEach(span => {
            if(span) span.textContent = '';
        });

        const inputFields = [initialTimeInput, durationInput, daysOffsetInput];
        inputFields.forEach(input => {
            input.classList.remove('invalid', 'valid');
            input.removeAttribute('aria-invalid');
            input.removeAttribute('aria-describedby');
        });

        localStorage.removeItem('timeCalcInitialTime');
        localStorage.removeItem('timeCalcDuration');
        localStorage.removeItem('timeCalcDaysOffset');

        checkFormValidityAndToggleButtonState();

        if(initialTimeInput) {
           initialTimeInput.focus();
        }
    });
});
