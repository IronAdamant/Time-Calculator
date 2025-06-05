document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selections ---
    const initialTimeInput = document.getElementById('initial_time');
    const durationInput = document.getElementById('duration');
    const daysOffsetInput = document.getElementById('days_offset');
    const calculateButton = document.getElementById('calculate_button');
    const resultArea = document.getElementById('result_area');
    const initialTimeError = document.getElementById('initial_time_error');
    const durationError = document.getElementById('duration_error');
    const daysOffsetError = document.getElementById('days_offset_error');
    const clearButton = document.getElementById('clear_button');
    const themeToggleButton = document.getElementById('theme_toggle_button');
    const bodyElement = document.body;

    // --- Theme Handling ---
    function applyTheme(theme) {
        if (theme === 'dark') {
            bodyElement.classList.add('dark-theme');
        } else {
            bodyElement.classList.remove('dark-theme');
        }
    }

    const storedTheme = localStorage.getItem('timeCalcTheme');
    if (storedTheme) {
        applyTheme(storedTheme);
    } else {
        applyTheme('light'); // Default to light theme
    }

    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            bodyElement.classList.toggle('dark-theme');
            let newTheme = bodyElement.classList.contains('dark-theme') ? 'dark' : 'light';
            localStorage.setItem('timeCalcTheme', newTheme);
        });
    }

    // --- localStorage Handling for Inputs ---
    const storedInitialTime = localStorage.getItem('timeCalcInitialTime');
    const storedDuration = localStorage.getItem('timeCalcDuration');
    const storedDaysOffset = localStorage.getItem('timeCalcDaysOffset');

    if (storedInitialTime) initialTimeInput.value = storedInitialTime;
    if (storedDuration) durationInput.value = storedDuration;
    if (storedDaysOffset) daysOffsetInput.value = storedDaysOffset;

    // --- Initial Setup ---
    if(initialTimeInput) {
        initialTimeInput.focus(); // Auto-focus on the first input field
    }

    // --- Validation ---
    const initialTimeRegex = /^(\d{1,2}:\d{2}\s*(AM|PM)?|\d{1,2}:\d{2})$/i;
    const durationRegex = /^((\d+\s*days?,\s*)?\d{1,3}:\d{2}(:\d{2})?|:\d{2})$/i;
    const daysOffsetRegex = /^-?\d*$/;

    /**
     * Checks the current validity of all relevant input fields and enables/disables the
     * calculate button accordingly.
     */
    function checkFormValidityAndToggleButtonState() {
        const isInitialTimeCurrentlyValid = !initialTimeError.textContent && initialTimeInput.value.trim() !== '';
        const isDurationCurrentlyValid = !durationError.textContent && durationInput.value.trim() !== '';
        const isDaysOffsetCurrentlyValid = !daysOffsetError.textContent; // Valid if error is empty (value can be empty)

        calculateButton.disabled = !(isInitialTimeCurrentlyValid && isDurationCurrentlyValid && isDaysOffsetCurrentlyValid);
    }

    /**
     * Validates a single input field based on regex and required status.
     * Updates error messages, ARIA attributes, and CSS classes.
     * @param {HTMLInputElement} inputElement - The input field to validate.
     * @param {HTMLElement} errorElement - The span element to display errors for this field.
     * @param {RegExp} regex - The regular expression to test the field's value against.
     * @param {string} errorMessage - The error message to display if regex validation fails.
     * @param {boolean} [isRequired=true] - Whether the field is required to have a value.
     * @returns {boolean} - True if the field is valid, false otherwise.
     */
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
        } else if (value !== '' && !regex.test(value)) { // Only test regex if not empty (and not failed isRequired check)
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
            } else { // If optional and empty, it's not "valid" visually but also not "invalid"
                inputElement.classList.remove('valid');
            }
        }
        checkFormValidityAndToggleButtonState(); // Update button state after each field validation
        return isValid;
    }

    /**
     * Clears validation states (error messages, ARIA attributes, CSS classes) from input fields.
     * @param {Array<Object>} fieldConfigurations - Array of objects, each with inputElement and errorElement.
     */
    function clearInputValidationStates(fieldConfigurations) {
        fieldConfigurations.forEach(config => {
            if (config.errorElement) config.errorElement.textContent = '';
            if (config.inputElement) {
                config.inputElement.classList.remove('invalid', 'valid');
                config.inputElement.removeAttribute('aria-invalid');
                config.inputElement.removeAttribute('aria-describedby');
            }
        });
    }


    // --- Event Listeners ---
    initialTimeInput.addEventListener('input', () => validateField(initialTimeInput, initialTimeError, initialTimeRegex, 'Invalid format. Use H:MM AM/PM or HH:MM.', true));
    durationInput.addEventListener('input', () => validateField(durationInput, durationError, durationRegex, 'Invalid format. Use H:MM:SS, D days, H:MM, etc.', true));
    daysOffsetInput.addEventListener('input', () => validateField(daysOffsetInput, daysOffsetError, daysOffsetRegex, 'Must be an integer (e.g., 1, -2).', false));

    // Initial check for button state on page load after potential localStorage loading
    checkFormValidityAndToggleButtonState();

    // --- API Interaction & Main Logic ---
    calculateButton.addEventListener('click', () => {
        resultArea.textContent = '';
        resultArea.classList.remove('error-message', 'success-message');

        // Perform all validations again before API call (also updates UI and button state)
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

                // Clear validation states on successful calculation
                clearInputValidationStates([
                    {inputElement: initialTimeInput, errorElement: initialTimeError},
                    {inputElement: durationInput, errorElement: durationError},
                    {inputElement: daysOffsetInput, errorElement: daysOffsetError}
                ]);

                localStorage.setItem('timeCalcInitialTime', initialTimeInput.value.trim());
                localStorage.setItem('timeCalcDuration', durationInput.value.trim());
                localStorage.setItem('timeCalcDaysOffset', daysOffsetInput.value.trim());

            } else if (data.error) { // Should typically be caught by !response.ok
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

    clearButton.addEventListener('click', () => {
        initialTimeInput.value = '';
        durationInput.value = '';
        daysOffsetInput.value = '';

        resultArea.textContent = '';
        resultArea.classList.remove('success-message', 'error-message');

        clearInputValidationStates([
            {inputElement: initialTimeInput, errorElement: initialTimeError},
            {inputElement: durationInput, errorElement: durationError},
            {inputElement: daysOffsetInput, errorElement: daysOffsetError}
        ]);

        localStorage.removeItem('timeCalcInitialTime');
        localStorage.removeItem('timeCalcDuration');
        localStorage.removeItem('timeCalcDaysOffset');

        checkFormValidityAndToggleButtonState();

        if(initialTimeInput) {
           initialTimeInput.focus();
        }
    });
});
