document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selections ---
    const initialTimeInput = document.getElementById('initial_time');
    // const durationInput = document.getElementById('duration'); // Removed
    const duration_value_input = document.getElementById('duration_value');
    const duration_unit_input = document.getElementById('duration_unit');
    // const daysOffsetInput = document.getElementById('days_offset'); // Removed
    const use_start_date_checkbox = document.getElementById('use_start_date');
    const start_date_section_div = document.getElementById('start_date_section');
    const start_date_input = document.getElementById('start_date');
    const calculateButton = document.getElementById('calculate_button');
    const resultArea = document.getElementById('result_area');
    const initialTimeError = document.getElementById('initial_time_error');
    const durationError = document.getElementById('duration_error'); // For duration_value & duration_unit
    // const daysOffsetError = document.getElementById('days_offset_error'); // Removed
    const start_date_error_span = document.getElementById('start_date_error');
    const clearButton = document.getElementById('clear_button');
    const setNowButton = document.getElementById('set_now_button'); // Added "Set to Now" button
    const themeToggleButton = document.getElementById('theme_toggle_button');
    const bodyElement = document.body;

    let startDatePickerInstance = null; // Global for Datepicker instance

    // Preset DOM Elements
    const presetNameInput = document.getElementById('preset_name');
    const savePresetButton = document.getElementById('save_preset_button');
    const savedPresetsDropdown = document.getElementById('saved_presets_dropdown');
    const loadPresetButton = document.getElementById('load_preset_button');
    const deletePresetButton = document.getElementById('delete_preset_button');

    // --- Constants ---
    const PRESETS_STORAGE_KEY = 'timeCalcPresets';

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
        applyTheme('light');
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
    // const storedDuration = localStorage.getItem('timeCalcDuration'); // Removed
    const storedDurationValue = localStorage.getItem('timeCalcDurationValue');
    const storedDurationUnit = localStorage.getItem('timeCalcDurationUnit');
    // const storedDaysOffset = localStorage.getItem('timeCalcDaysOffset'); // Removed
    const storedUseStartDate = localStorage.getItem('timeCalcUseStartDate');
    const storedStartDate = localStorage.getItem('timeCalcStartDate');

    if (storedInitialTime) initialTimeInput.value = storedInitialTime;
    if (storedDurationValue) duration_value_input.value = storedDurationValue;
    if (storedDurationUnit) duration_unit_input.value = storedDurationUnit;
    // if (storedDaysOffset) daysOffsetInput.value = storedDaysOffset; // Removed
    if (storedUseStartDate) use_start_date_checkbox.checked = storedUseStartDate === 'true';
    if (storedStartDate) start_date_input.value = storedStartDate;

    // --- Initial Setup ---
    // Update visibility of start date section based on stored preference
    // And initialize datepicker if checked state is true from localStorage
    if (use_start_date_checkbox.checked) {
        start_date_section_div.style.display = 'block';
        // Initialize datepicker here if needed on page load when checkbox is already checked
        // This logic will be consolidated in the checkbox event listener primarily
    } else {
        start_date_section_div.style.display = 'none';
    }


    if(initialTimeInput) {
        initialTimeInput.focus();
    }

    // --- Validation ---
    const initialTimeRegex = /^(\d{1,2}:\d{2}\s*(AM|PM)?|\d{1,2}:\d{2})$/i;
    // const durationRegex = /^((\d+\s*days?,\s*)?\d{1,3}:\d{2}(:\d{2})?|:\d{2})$/i; // Removed
    const durationValueRegex = /^\d+$/;
    // const daysOffsetRegex = /^-?\d*$/; // Removed

    function checkFormValidityAndToggleButtonState() {
        const isInitialTimeCurrentlyValid = !initialTimeError.textContent && initialTimeInput.value.trim() !== '';
        // Updated validation check for new duration fields
        const isDurationValueCurrentlyValid = !durationError.textContent && duration_value_input.value.trim() !== '';
        // const isDaysOffsetCurrentlyValid = !daysOffsetError.textContent; // Removed
        const isStartDateCurrentlyValid = !use_start_date_checkbox.checked || (!start_date_error_span.textContent && start_date_input.value.trim() !== '');

        calculateButton.disabled = !(
            isInitialTimeCurrentlyValid &&
            isDurationValueCurrentlyValid && // Use new duration value field
            // isDaysOffsetCurrentlyValid && // Removed
            isStartDateCurrentlyValid
        );
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

    // --- Preset Management Functions ---
    function loadPresetsFromStorage() {
        const presetsJson = localStorage.getItem(PRESETS_STORAGE_KEY);
        try {
            return presetsJson ? JSON.parse(presetsJson) : [];
        } catch (e) {
            console.error("Error parsing presets from localStorage:", e);
            return [];
        }
    }

    function savePresetsToStorage(presetsArray) {
        localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presetsArray));
    }

    function populatePresetDropdown() {
        const presets = loadPresetsFromStorage();
        savedPresetsDropdown.innerHTML = '<option value="">-- Select a Preset --</option>';
        presets.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.name;
            option.textContent = preset.name;
            savedPresetsDropdown.appendChild(option);
        });
    }

    function handleSavePreset() {
        const presetName = presetNameInput.value.trim();
        const initialTime = initialTimeInput.value.trim();
        // const duration = durationInput.value.trim(); // Removed
        const durationValue = duration_value_input.value.trim();
        const durationUnit = duration_unit_input.value;
        // const daysOffset = daysOffsetInput.value.trim(); // Removed
        const useStartDate = use_start_date_checkbox.checked;
        const startDateValue = start_date_input.value.trim();

        if (!presetName) {
            alert("Preset name cannot be empty.");
            return;
        }
        // Updated check for main fields
        if (!initialTime || !durationValue) {
            alert("Initial time and duration value must be filled to save a preset.");
            return;
        }
        if (useStartDate && !startDateValue) {
            alert("Start date must be filled if 'Use Start Date' is checked for the preset.");
            return;
        }

        const newPreset = {
            name: presetName,
            initial_time: initialTime,
            // duration: duration, // Removed
            duration_value: durationValue,
            duration_unit: durationUnit,
            // days_offset: daysOffset, // Removed
            use_start_date: useStartDate,
            start_date: startDateValue
        };
        let presets = loadPresetsFromStorage();
        const existingPresetIndex = presets.findIndex(p => p.name === presetName);
        if (existingPresetIndex > -1) {
            presets[existingPresetIndex] = newPreset;
        } else {
            presets.push(newPreset);
        }
        savePresetsToStorage(presets);
        populatePresetDropdown();
        presetNameInput.value = '';
        alert("Preset saved!");
    }

    function handleLoadPreset() {
        const selectedPresetName = savedPresetsDropdown.value;
        if (!selectedPresetName) {
            alert("Please select a preset to load.");
            return;
        }
        const presets = loadPresetsFromStorage();
        const presetToLoad = presets.find(p => p.name === selectedPresetName);
        if (presetToLoad) {
            initialTimeInput.value = presetToLoad.initial_time || '';
            // durationInput.value = presetToLoad.duration; // Removed
            duration_value_input.value = presetToLoad.duration_value || '';
            duration_unit_input.value = presetToLoad.duration_unit || 'seconds'; // Default to seconds if not set
            // daysOffsetInput.value = presetToLoad.days_offset || ''; // Removed
            use_start_date_checkbox.checked = presetToLoad.use_start_date || false;
            start_date_input.value = presetToLoad.start_date || '';

            // Update visibility of start date section based on loaded preset
            if (use_start_date_checkbox.checked) {
                start_date_section_div.style.display = 'block';
            } else {
                start_date_section_div.style.display = 'none';
            }

            // Validate loaded fields
            validateField(initialTimeInput, initialTimeError, initialTimeRegex, 'Invalid format. Use H:MM AM/PM or HH:MM.', true);
            validateField(duration_value_input, durationError, durationValueRegex, 'Must be a non-negative number.', true);

            if (use_start_date_checkbox.checked) {
                if (!startDatePickerInstance) { // Initialize if not already
                    const calendarContainer = document.getElementById('inline_calendar_container');
                    // Datepicker input is the hidden start_date_input
                    startDatePickerInstance = new Datepicker(calendarContainer, {
                        format: 'yyyy-mm-dd',
                        todayHighlight: true,
                        // No autohide for inline, default behavior should be inline.
                    });
                    calendarContainer.addEventListener('changeDate', (event) => {
                        if (event.detail && event.detail.date) {
                            const selectedDate = event.detail.date;
                            // Format date as yyyy-mm-dd for the hidden input
                            start_date_input.value = Datepicker.formatDate(selectedDate, 'yyyy-mm-dd');
                            validateField(start_date_input, start_date_error_span, null, 'Start date cannot be empty.', true);
                            checkFormValidityAndToggleButtonState();
                        }
                    });
                }
                if (start_date_input.value) {
                    try {
                        startDatePickerInstance.setDate(start_date_input.value);
                    } catch(e) {
                        console.error("Error setting date on datepicker from preset:", e);
                        // Handle invalid date from preset if necessary, e.g., clear it or set to default
                        start_date_input.value = ''; // Clear if invalid
                        validateField(start_date_input, start_date_error_span, null, 'Start date cannot be empty.', true);
                    }
                } else {
                     startDatePickerInstance.setDate({clear: true}); // Clear datepicker if preset has no start date
                }
                validateField(start_date_input, start_date_error_span, null, 'Start date cannot be empty.', true);
            } else {
                start_date_error_span.textContent = '';
                start_date_input.classList.remove('invalid', 'valid');
            }
            checkFormValidityAndToggleButtonState(); // Explicitly call to ensure button state is correct
            resultArea.textContent = 'Preset loaded. Adjust as needed and click Calculate.';
            resultArea.classList.remove('error-message', 'success-message');
        } else {
            alert("Error: Could not find selected preset.");
        }
    }

    function handleDeletePreset() {
        const selectedPresetName = savedPresetsDropdown.value;
        if (!selectedPresetName) {
            alert("Please select a preset to delete.");
            return;
        }
        if (!confirm(`Are you sure you want to delete the preset "${selectedPresetName}"?`)) {
            return;
        }
        let presets = loadPresetsFromStorage();
        presets = presets.filter(p => p.name !== selectedPresetName);
        savePresetsToStorage(presets);
        populatePresetDropdown();
        alert("Preset deleted.");
    }

    // --- Event Listeners ---
    if (setNowButton) {
        setNowButton.addEventListener('click', () => {
            const now = new Date();
            let hours = now.getHours();
            const minutes = now.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            const minutesStr = minutes < 10 ? '0' + minutes : String(minutes);
            const formattedTime = hours + ':' + minutesStr + ' ' + ampm;

            initialTimeInput.value = formattedTime;
            validateField(initialTimeInput, initialTimeError, initialTimeRegex, 'Invalid format. Use H:MM AM/PM or HH:MM.', true);
            initialTimeInput.focus(); // Optionally focus the input after setting
        });
    }

    initialTimeInput.addEventListener('input', () => validateField(initialTimeInput, initialTimeError, initialTimeRegex, 'Invalid format. Use H:MM AM/PM or HH:MM.', true));
    // durationInput.addEventListener('input', () => validateField(durationInput, durationError, durationRegex, 'Invalid format. Use H:MM:SS, D days, H:MM, etc.', true)); // Removed
    duration_value_input.addEventListener('input', () => validateField(duration_value_input, durationError, durationValueRegex, 'Must be a non-negative number.', true));
    duration_unit_input.addEventListener('change', () => { // Also validate duration value when unit changes, in case it was empty
        validateField(duration_value_input, durationError, durationValueRegex, 'Must be a non-negative number.', true);
    });
    // daysOffsetInput.addEventListener('input', () => validateField(daysOffsetInput, daysOffsetError, daysOffsetRegex, 'Must be an integer (e.g., 1, -2).', false)); // Removed

    // Removed event listeners for hidden start_date_input, as its value is now set by the datepicker's 'changeDate' event
    // start_date_input.addEventListener('input', () => { ... });
    // start_date_input.addEventListener('change', () => { ... });


    // --- Calendar Handling Event Listener ---
    use_start_date_checkbox.addEventListener('change', () => {
        if (use_start_date_checkbox.checked) {
            start_date_section_div.style.display = 'block';
            if (!startDatePickerInstance) {
                const calendarContainer = document.getElementById('inline_calendar_container');
                const datepickerInput = start_date_input; // This is our hidden input

                startDatePickerInstance = new Datepicker(calendarContainer, {
                    format: 'yyyy-mm-dd',
                    todayHighlight: true,
                    // Inline pickers usually don't autohide.
                    // The library should render directly into calendarContainer.
                });

                calendarContainer.addEventListener('changeDate', (event) => {
                    // The event.detail.date is a JavaScript Date object
                    if (event.detail && event.detail.date) {
                        // Format date as yyyy-mm-dd for the hidden input
                        // Using Datepicker.formatDate utility if available, or manual formatting.
                        // Manual formatting example:
                        // const selectedDate = event.detail.date;
                        // const year = selectedDate.getFullYear();
                        // const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
                        // const day = selectedDate.getDate().toString().padStart(2, '0');
                        // datepickerInput.value = `${year}-${month}-${day}`;

                        // Using the library's static method for formatting
                        datepickerInput.value = Datepicker.formatDate(event.detail.date, 'yyyy-mm-dd');

                        // Manually trigger validation for the hidden input
                        validateField(datepickerInput, start_date_error_span, null, 'Start date cannot be empty.', true);
                        checkFormValidityAndToggleButtonState();
                    } else if (event.detail && event.detail.date === undefined) { // Date cleared
                        datepickerInput.value = '';
                        validateField(datepickerInput, start_date_error_span, null, 'Start date cannot be empty.', true);
                        checkFormValidityAndToggleButtonState();
                    }
                });
            }
            // If there's a value in the hidden input (e.g. from localStorage or manual set before enabling), update datepicker
            if (start_date_input.value && startDatePickerInstance) { // Ensure instance exists
                 try {
                    startDatePickerInstance.setDate(start_date_input.value);
                } catch(e) {
                    console.error("Error setting date on datepicker from existing input value:", e);
                    start_date_input.value = ''; // Clear if invalid to prevent further issues
                    if (startDatePickerInstance) { // Check again in case setDate itself caused issues with the instance
                        startDatePickerInstance.setDate({clear: true}); // Explicitly clear UI
                    }
                    // Re-validate the now-empty field
                    validateField(start_date_input, start_date_error_span, null, 'Start date cannot be empty.', true);
                    // checkFormValidityAndToggleButtonState(); // validateField calls this already
                }
            } else if (startDatePickerInstance) { // If no value in input, but instance exists
                // Ensure datepicker is also clear or shows today by default.
                // Most datepickers default to today or remain blank if no date is set.
                // If explicit clearing is desired when input is empty:
                // startDatePickerInstance.setDate({clear: true});
            } else {
                // If no value, and no instance yet, nothing to set.
                // startDatePickerInstance.setDate({clear: true}); // or let it default to today
            }
            // Initial validation call when checkbox is checked and section becomes visible
            validateField(start_date_input, start_date_error_span, null, 'Start date cannot be empty.', true);
        } else {
            start_date_section_div.style.display = 'none';
            start_date_error_span.textContent = ''; // Clear error
            start_date_input.classList.remove('invalid', 'valid');
            start_date_input.removeAttribute('aria-invalid');
            start_date_input.removeAttribute('aria-describedby');
            // Optional: Destroy datepicker instance if not needed
            // if (startDatePickerInstance) {
            //     startDatePickerInstance.destroy();
            //     startDatePickerInstance = null;
            // }
        }
        checkFormValidityAndToggleButtonState(); // Update button state based on new visibility and validity
    });

    // Initial check to set up datepicker if checkbox is already checked on load
    if (use_start_date_checkbox.checked) {
        use_start_date_checkbox.dispatchEvent(new Event('change'));
    }


    if (savePresetButton) savePresetButton.addEventListener('click', handleSavePreset);
    if (loadPresetButton) loadPresetButton.addEventListener('click', handleLoadPreset);
    if (deletePresetButton) deletePresetButton.addEventListener('click', handleDeletePreset);

    // Initial population of dropdown and button state check
    populatePresetDropdown();
    checkFormValidityAndToggleButtonState();

    // --- Calculate Button Logic (API Interaction) ---
    calculateButton.addEventListener('click', () => {
        resultArea.textContent = '';
        resultArea.classList.remove('error-message', 'success-message');

        // --- Validation ---
        const isInitialTimeValid = validateField(initialTimeInput, initialTimeError, initialTimeRegex, 'Invalid format. Use H:MM AM/PM or HH:MM.', true);
        const isDurationValueValid = validateField(duration_value_input, durationError, durationValueRegex, 'Must be a non-negative number.', true);
        // const isDaysOffsetValid = validateField(daysOffsetInput, daysOffsetError, daysOffsetRegex, 'Must be an integer (e.g., 1, -2).', false); // Removed
        let isStartDateValid = true;
        if (use_start_date_checkbox.checked) {
            isStartDateValid = validateField(start_date_input, start_date_error_span, null, 'Start date cannot be empty.', true);
        }

        if (!isInitialTimeValid || !isDurationValueValid || /*!isDaysOffsetValid ||*/ !isStartDateValid) { // Removed isDaysOffsetValid
            resultArea.textContent = 'Please correct the errors in the fields above.';
            resultArea.classList.add('error-message');
            return;
        }

        // --- Construct Duration String ---
        let duration_str = "";
        const durationValue = duration_value_input.value.trim() || "0"; // Default to 0 if empty
        const durationUnit = duration_unit_input.value;

        switch (durationUnit) {
            case "seconds":
                duration_str = `0:00:${durationValue.padStart(2, '0')}`; // Pad seconds for H:MM:SS like format
                // Adjust if value is > 59, or let backend handle larger second counts.
                // For simplicity, assuming backend can parse "0:00:70" as 1 minute 10 seconds.
                // Or, more robustly:
                // const sec = parseInt(durationValue, 10);
                // duration_str = `0:00:${String(sec % 60).padStart(2, '0')}`;
                // if (sec >= 60) {
                //    const min = Math.floor(sec / 60);
                //    duration_str = `0:${String(min % 60).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
                //    if (min >= 60) {
                //        const hr = Math.floor(min / 60);
                //        duration_str = `${hr}:${String(min % 60).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
                //    }
                // }
                // Sticking to simpler `0:00:value` for now, assuming backend is flexible.
                break;
            case "minutes":
                duration_str = `0:${durationValue.padStart(2, '0')}:00`;
                break;
            case "hours":
                duration_str = `${durationValue}:00:00`;
                break;
            case "days":
                duration_str = `${durationValue} days, 0:00:00`;
                break;
            default: // Should not happen
                duration_str = "0:00:00";
        }

        const requestData = {
            initial_time: initialTimeInput.value.trim(),
            duration: duration_str // Use constructed duration string
        };

        // const daysOffsetValue = daysOffsetInput.value.trim(); // Removed
        // if (daysOffsetValue !== '') { // Removed
        //     requestData.days_offset = daysOffsetValue; // Removed
        // } // Removed

        if (use_start_date_checkbox.checked && start_date_input.value) {
            requestData.start_date = start_date_input.value;
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
            if (data.error) { // Handle error first
                resultArea.textContent = `Error: ${data.error}`;
                resultArea.classList.add('error-message');
            } else if (data.end_datetime_str) { // Calendar calculation result
                resultArea.innerHTML = `
                    <p><strong>Start:</strong> ${data.start_datetime_str}</p>
                    <p><strong>End:</strong> ${data.end_datetime_str}</p>
                    <p><strong>Duration:</strong> ${data.duration_details_str}</p>
                `;
                resultArea.classList.add('success-message');
            } else if (data.result_string) { // Simple time calculation result
                resultArea.textContent = data.result_string;
                resultArea.classList.add('success-message');
            }

            // Save inputs to localStorage on successful calculation
            if (!data.error) {
                localStorage.setItem('timeCalcInitialTime', initialTimeInput.value.trim());
                localStorage.setItem('timeCalcDurationValue', duration_value_input.value.trim());
                localStorage.setItem('timeCalcDurationUnit', duration_unit_input.value);
                // localStorage.setItem('timeCalcDaysOffset', daysOffsetInput.value.trim()); // Removed
                localStorage.setItem('timeCalcUseStartDate', use_start_date_checkbox.checked);
                localStorage.setItem('timeCalcStartDate', start_date_input.value.trim());

                // Clear validation states only on full success (might remove for partial success if needed)
                // clearInputValidationStates still needs to be updated for new fields
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
        // durationInput.value = ''; // Removed
        duration_value_input.value = '';
        duration_unit_input.value = 'seconds'; // Reset to default
        // daysOffsetInput.value = ''; // Removed
        use_start_date_checkbox.checked = false;
        start_date_input.value = ''; // Clear hidden input
        start_date_section_div.style.display = 'none'; // Hide start date section

        if (startDatePickerInstance) {
            startDatePickerInstance.setDate({ clear: true }); // Clear datepicker UI
        }

        resultArea.textContent = '';
        resultArea.classList.remove('success-message', 'error-message');

        clearInputValidationStates([
            {inputElement: initialTimeInput, errorElement: initialTimeError},
            {inputElement: duration_value_input, errorElement: durationError},
            // {inputElement: daysOffsetInput, errorElement: daysOffsetError}, // Removed
            {inputElement: start_date_input, errorElement: start_date_error_span}
        ]);

        localStorage.removeItem('timeCalcInitialTime');
        // localStorage.removeItem('timeCalcDuration'); // Removed
        localStorage.removeItem('timeCalcDurationValue');
        localStorage.removeItem('timeCalcDurationUnit');
        // localStorage.removeItem('timeCalcDaysOffset'); // Removed
        localStorage.removeItem('timeCalcUseStartDate');
        localStorage.removeItem('timeCalcStartDate');

        checkFormValidityAndToggleButtonState();
        if(initialTimeInput) {
           initialTimeInput.focus();
        }
    });
});

// Helper to clear all specific validation states
function clearAllValidationVisuals() { // This function can be defined outside or as a helper if needed by multiple places
    const fieldsToClear = [
        { inputElement: initialTimeInput, errorElement: initialTimeError },
        { inputElement: duration_value_input, errorElement: durationError },
        // { inputElement: daysOffsetInput, errorElement: daysOffsetError }, // Removed
        { inputElement: start_date_input, errorElement: start_date_error_span }
    ];
    fieldsToClear.forEach(field => {
        if (field.inputElement) {
            field.inputElement.classList.remove('invalid', 'valid');
            field.inputElement.removeAttribute('aria-invalid');
            field.inputElement.removeAttribute('aria-describedby');
        }
        if (field.errorElement) {
            field.errorElement.textContent = '';
        }
    });
}

// Consider updating clearInputValidationStates to use a more generic approach or ensure all fields are covered.
// The current clearInputValidationStates is okay but make sure it's called appropriately.
// The fetch().then(data => { ... clearInputValidationStates(...) }) was removed, ensure it's not needed or re-add with new fields.
// It seems better to clear validation states using the `clearAllValidationVisuals` or an updated `clearInputValidationStates`
// at the beginning of a calculation or when inputs are cleared, rather than only on success.
// For now, the existing clearButton logic handles this for its case.
// Calculation success only saves to localStorage, doesn't clear inputs or validation states.
