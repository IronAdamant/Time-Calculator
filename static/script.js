document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selections ---
    const initialTimeInput = document.getElementById('initial_time');
    const duration_value_input = document.getElementById('duration_value');
    const duration_unit_input = document.getElementById('duration_unit');
    const use_start_date_checkbox = document.getElementById('use_start_date');
    const start_date_section_div = document.getElementById('start_date_section');
    const start_date_input = document.getElementById('start_date'); // Now hidden, value set by datepicker
    const calculateButton = document.getElementById('calculate_button');
    const resultArea = document.getElementById('result_area');
    const initialTimeError = document.getElementById('initial_time_error');
    const durationError = document.getElementById('duration_error');
    const start_date_error_span = document.getElementById('start_date_error');
    const clearButton = document.getElementById('clear_button');
    const setNowButton = document.getElementById('set_now_button');
    const copyResultButton = document.getElementById('copy_result_button'); // Added
    const themeToggleButton = document.getElementById('theme_toggle_button');
    const bodyElement = document.body;

    let startDatePickerInstance = null;

    // Preset DOM Elements
    const presetNameInput = document.getElementById('preset_name');
    const savePresetButton = document.getElementById('save_preset_button');
    const savedPresetsDropdown = document.getElementById('saved_presets_dropdown');
    const loadPresetButton = document.getElementById('load_preset_button');
    const deletePresetButton = document.getElementById('delete_preset_button');

    const PRESETS_STORAGE_KEY = 'timeCalcPresets';

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

    const storedInitialTime = localStorage.getItem('timeCalcInitialTime');
    const storedDurationValue = localStorage.getItem('timeCalcDurationValue');
    const storedDurationUnit = localStorage.getItem('timeCalcDurationUnit');
    const storedUseStartDate = localStorage.getItem('timeCalcUseStartDate');
    const storedStartDate = localStorage.getItem('timeCalcStartDate');

    if (storedInitialTime) initialTimeInput.value = storedInitialTime;
    if (storedDurationValue) duration_value_input.value = storedDurationValue;
    if (storedDurationUnit) duration_unit_input.value = storedDurationUnit;
    if (storedUseStartDate) use_start_date_checkbox.checked = storedUseStartDate === 'true';
    if (storedStartDate) start_date_input.value = storedStartDate;

    // RESOLVED CONFLICT 1: Initial Setup
    // Update visibility of start date section based on stored preference
    if (use_start_date_checkbox.checked) {
        start_date_section_div.style.display = 'block';
    } else {
        start_date_section_div.style.display = 'none';
    }

    if(initialTimeInput) {
        initialTimeInput.focus();
    }

    const initialTimeRegex = /^(\d{1,2}:\d{2}\s*(AM|PM)?|\d{1,2}:\d{2})$/i;
    const durationValueRegex = /^\d+$/;

    function checkFormValidityAndToggleButtonState() {
        const isInitialTimeCurrentlyValid = !initialTimeError.textContent && initialTimeInput.value.trim() !== '';
        const isDurationValueCurrentlyValid = !durationError.textContent && duration_value_input.value.trim() !== '';
        const isStartDateCurrentlyValid = !use_start_date_checkbox.checked || (!start_date_error_span.textContent && start_date_input.value.trim() !== '');
        calculateButton.disabled = !(isInitialTimeCurrentlyValid && isDurationValueCurrentlyValid && isStartDateCurrentlyValid);
    }

    function validateField(inputElement, errorElement, regex, errorMessage, isRequired = true) {
        const value = inputElement.value.trim();
        let isValid = true;
        // Attempt to get label text more safely if previousElementSibling is not a label or doesn't exist
        let labelText = "Field"; // Default text
        if (inputElement.id && document.querySelector(`label[for='${inputElement.id}']`)) {
             labelText = document.querySelector(`label[for='${inputElement.id}']`).textContent.replace(':','');
        } else if (inputElement.previousElementSibling && inputElement.previousElementSibling.tagName === 'LABEL') {
            labelText = inputElement.previousElementSibling.textContent.replace(':','');
        }


        if (isRequired && value === '') {
            errorElement.textContent = `${labelText} cannot be empty.`;
            inputElement.classList.add('invalid');
            inputElement.classList.remove('valid');
            inputElement.setAttribute('aria-invalid', 'true');
            inputElement.setAttribute('aria-describedby', errorElement.id);
            isValid = false;
        } else if (value !== '' && regex && !regex.test(value)) {
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
        const durationValue = duration_value_input.value.trim();
        const durationUnit = duration_unit_input.value;
        const useStartDate = use_start_date_checkbox.checked;
        const startDateValue = start_date_input.value.trim();

        if (!presetName) {
            alert("Preset name cannot be empty.");
            return;
        }
        if (!initialTime || !durationValue) {
            alert("Initial time and duration value must be filled to save a preset.");
            return;
        }
        if (useStartDate && !startDateValue) {
            alert("Start date must be filled if 'Use Start Date' is checked for the preset.");
            return;
        }

        const newPreset = {
            name: presetName, initial_time: initialTime,
            duration_value: durationValue, duration_unit: durationUnit,
            use_start_date: useStartDate, start_date: startDateValue
        };
        let presets = loadPresetsFromStorage();
        const existingPresetIndex = presets.findIndex(p => p.name === presetName);
        if (existingPresetIndex > -1) {
            // Confirm before overwriting
            if (!confirm("A preset with this name already exists. Overwrite it?")) {
                return; // User clicked Cancel
            }
            presets[existingPresetIndex] = newPreset;
        } else {
            presets.push(newPreset);
        }
        savePresetsToStorage(presets);
        populatePresetDropdown();
        presetNameInput.value = '';
        alert("Preset saved!");
    }

    // RESOLVED CONFLICT 2: handleLoadPreset function
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
            duration_value_input.value = presetToLoad.duration_value || '';
            duration_unit_input.value = presetToLoad.duration_unit || 'seconds';

            // Set checkbox state and hidden input value first
            use_start_date_checkbox.checked = presetToLoad.use_start_date || false;
            start_date_input.value = presetToLoad.start_date || '';

            // Trigger the checkbox's change event to handle UI updates & datepicker state
            // This will call the datepicker logic including setDate if needed.
            use_start_date_checkbox.dispatchEvent(new Event('change'));

            // Validate other fields
            validateField(initialTimeInput, initialTimeError, initialTimeRegex, 'Invalid format. Use H:MM AM/PM or HH:MM.', true);
            validateField(duration_value_input, durationError, durationValueRegex, 'Must be a non-negative number.', true);

            // Note: start_date_input validation is now handled by the checkbox's change listener

            checkFormValidityAndToggleButtonState(); // Ensure button state is updated after all changes
            resultArea.textContent = 'Preset loaded. Adjust as needed and click Calculate.';
            resultArea.classList.remove('error-message', 'success-message');
        } else {
            alert("Error: Could not find selected preset.");
        }
    }

    function handleDeletePreset() {
        const selectedPresetName = savedPresetsDropdown.value;
        if (!selectedPresetName) { alert("Please select a preset to delete."); return; }
        if (!confirm(`Are you sure you want to delete the preset "${selectedPresetName}"?`)) { return; }
        let presets = loadPresetsFromStorage();
        presets = presets.filter(p => p.name !== selectedPresetName);
        savePresetsToStorage(presets);
        populatePresetDropdown();
        alert("Preset deleted.");
    }

    if (setNowButton) {
        setNowButton.addEventListener('click', () => {
            const now = new Date();
            let hours = now.getHours();
            const minutes = now.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12; hours = hours ? hours : 12;
            const minutesStr = minutes < 10 ? '0' + minutes : String(minutes);
            initialTimeInput.value = `${hours}:${minutesStr} ${ampm}`;
            validateField(initialTimeInput, initialTimeError, initialTimeRegex, 'Invalid format. Use H:MM AM/PM or HH:MM.', true);
            initialTimeInput.focus();
        });
    }

    initialTimeInput.addEventListener('input', () => validateField(initialTimeInput, initialTimeError, initialTimeRegex, 'Invalid format. Use H:MM AM/PM or HH:MM.', true));
    duration_value_input.addEventListener('input', () => validateField(duration_value_input, durationError, durationValueRegex, 'Must be a non-negative number.', true));
    duration_unit_input.addEventListener('change', () => validateField(duration_value_input, durationError, durationValueRegex, 'Must be a non-negative number.', true));

    // RESOLVED CONFLICT 3: Removed event listeners for hidden start_date_input
    // start_date_input.addEventListener('input', () => { ... }); // Removed
    // start_date_input.addEventListener('change', () => { ... }); // Removed

    // RESOLVED CONFLICT 4: use_start_date_checkbox event listener
    use_start_date_checkbox.addEventListener('change', () => {
        if (use_start_date_checkbox.checked) {
            start_date_section_div.style.display = 'block';
            if (!startDatePickerInstance) {
                const calendarContainer = document.getElementById('inline_calendar_container');
                const datepickerInput = start_date_input;

                startDatePickerInstance = new Datepicker(calendarContainer, {
                    format: 'yyyy-mm-dd',
                    todayHighlight: true,
                });

                calendarContainer.addEventListener('changeDate', (event) => {
                    if (event.detail && event.detail.date) {
                        datepickerInput.value = Datepicker.formatDate(event.detail.date, 'yyyy-mm-dd');
                        validateField(datepickerInput, start_date_error_span, null, 'Start date cannot be empty.', true);
                    } else if (event.detail && event.detail.date === undefined) {
                        datepickerInput.value = '';
                        validateField(datepickerInput, start_date_error_span, null, 'Start date cannot be empty.', true);
                    }
                    checkFormValidityAndToggleButtonState(); // Call this after value change and validation
                });
            }

            if (start_date_input.value && startDatePickerInstance) {
                 try {
                    startDatePickerInstance.setDate(start_date_input.value);
                } catch(e) {
                    console.error("Error setting date on datepicker from existing input value:", e);
                    start_date_input.value = '';
                    if (startDatePickerInstance) {
                        startDatePickerInstance.setDate({clear: true});
                    }
                }
            } else if (startDatePickerInstance && !start_date_input.value) {
                startDatePickerInstance.setDate({clear: true}); // Clear if input is empty but picker was visible
            }
            validateField(start_date_input, start_date_error_span, null, 'Start date cannot be empty.', true);
        } else {
            start_date_section_div.style.display = 'none';
            start_date_error_span.textContent = '';
            start_date_input.classList.remove('invalid', 'valid');
            start_date_input.removeAttribute('aria-invalid');
            start_date_input.removeAttribute('aria-describedby');
        }
        checkFormValidityAndToggleButtonState();
    });

    // Initial dispatch if checkbox is checked on load (e.g. from localStorage)
    if (use_start_date_checkbox.checked) {
        use_start_date_checkbox.dispatchEvent(new Event('change'));
    }

    if (savePresetButton) savePresetButton.addEventListener('click', handleSavePreset);
    if (loadPresetButton) loadPresetButton.addEventListener('click', handleLoadPreset);
    if (deletePresetButton) deletePresetButton.addEventListener('click', handleDeletePreset);

    populatePresetDropdown();
    checkFormValidityAndToggleButtonState();

    calculateButton.addEventListener('click', () => {
        resultArea.textContent = 'Calculating...';
        resultArea.classList.remove('error-message', 'success-message');
        resultArea.classList.add('calculating-message'); // ADD THIS
        if (copyResultButton) copyResultButton.style.display = 'none'; // Hide copy button during calculation

        const isInitialTimeValid = validateField(initialTimeInput, initialTimeError, initialTimeRegex, 'Invalid format. Use H:MM AM/PM or HH:MM.', true);
        const isDurationValueValid = validateField(duration_value_input, durationError, durationValueRegex, 'Must be a non-negative number.', true);
        let isStartDateValid = true;
        if (use_start_date_checkbox.checked) {
            isStartDateValid = validateField(start_date_input, start_date_error_span, null, 'Start date cannot be empty.', true);
        }

        if (!isInitialTimeValid || !isDurationValueValid || !isStartDateValid) {
            resultArea.textContent = 'Please correct the errors in the fields above.';
            resultArea.classList.add('error-message');
            return;
        }

        let duration_str = "";
        const durationValue = duration_value_input.value.trim() || "0";
        const durationUnit = duration_unit_input.value;
        switch (durationUnit) {
            case "seconds":
                let sec = parseInt(durationValue, 10) || 0;
                let min_s = 0; // minutes from seconds
                let hr_s = 0;  // hours from seconds
                if (sec >= 60) {
                    min_s = Math.floor(sec / 60);
                    sec = sec % 60;
                }
                if (min_s >= 60) {
                    hr_s = Math.floor(min_s / 60);
                    min_s = min_s % 60;
                }
                duration_str = `${hr_s}:${String(min_s).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
                break;
            case "minutes":
                let totalMin = parseInt(durationValue, 10) || 0;
                let hr_m = 0; // hours from minutes
                if (totalMin >= 60) {
                    hr_m = Math.floor(totalMin / 60);
                    totalMin = totalMin % 60;
                }
                duration_str = `${hr_m}:${String(totalMin).padStart(2, '0')}:00`;
                break;
            case "hours":
                duration_str = `${durationValue}:00:00`;
                break;
            case "days":
                duration_str = `${durationValue} days, 0:00:00`;
                break;
            default:
                duration_str = "0:00:00";
        }

        const requestData = {
            initial_time: initialTimeInput.value.trim(),
            duration: duration_str
        };
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
            if (!response.ok) { return response.json().then(err => { throw new Error(err.error || `Server error: ${response.status}`); }); }
            return response.json();
        })
        .then(data => {
            resultArea.classList.remove('calculating-message'); // ADD THIS
            if (data.error) {
                resultArea.textContent = `Error: ${data.error}`;
                resultArea.classList.add('error-message');
                if (copyResultButton) copyResultButton.style.display = 'none';
            } else if (data.end_datetime_str) {
                resultArea.innerHTML = `<p><strong>Start:</strong> ${data.start_datetime_str}</p><p><strong>End:</strong> ${data.end_datetime_str}</p><p><strong>Duration:</strong> ${data.duration_details_str}</p>`;
                resultArea.classList.add('success-message');
                if (copyResultButton) copyResultButton.style.display = 'inline-block';
            } else if (data.result_string) {
                resultArea.textContent = data.result_string;
                resultArea.classList.add('success-message');
                if (copyResultButton) copyResultButton.style.display = 'inline-block';
            }
            if (!data.error) {
                localStorage.setItem('timeCalcInitialTime', initialTimeInput.value.trim());
                localStorage.setItem('timeCalcDurationValue', duration_value_input.value.trim());
                localStorage.setItem('timeCalcDurationUnit', duration_unit_input.value);
                localStorage.setItem('timeCalcUseStartDate', use_start_date_checkbox.checked);
                localStorage.setItem('timeCalcStartDate', start_date_input.value.trim());
            }
        })
        .catch(error => {
            resultArea.classList.remove('calculating-message'); // ADD THIS
            resultArea.textContent = `Error: ${error.message || 'Failed to fetch. Check network or server.'}`;
            resultArea.classList.add('error-message');
            if (copyResultButton) copyResultButton.style.display = 'none';
        })
        .finally(() => {
            calculateButton.textContent = 'Calculate';
            checkFormValidityAndToggleButtonState();
        });
    });

    // RESOLVED CONFLICT 5: clearButton listener
    clearButton.addEventListener('click', () => {
        initialTimeInput.value = '';
        duration_value_input.value = '';
        duration_unit_input.value = 'seconds';
        use_start_date_checkbox.checked = false;
        start_date_input.value = '';
        start_date_section_div.style.display = 'none';

        if (startDatePickerInstance) {
            startDatePickerInstance.setDate({ clear: true });
        }
        if (copyResultButton) copyResultButton.style.display = 'none'; // Hide on clear

        resultArea.textContent = '';
        resultArea.classList.remove('success-message', 'error-message');
        clearInputValidationStates([
            {inputElement: initialTimeInput, errorElement: initialTimeError},
            {inputElement: duration_value_input, errorElement: durationError},
            {inputElement: start_date_input, errorElement: start_date_error_span}
        ]);
        localStorage.removeItem('timeCalcInitialTime');
        localStorage.removeItem('timeCalcDurationValue');
        localStorage.removeItem('timeCalcDurationUnit');
        localStorage.removeItem('timeCalcUseStartDate');
        localStorage.removeItem('timeCalcStartDate');
        checkFormValidityAndToggleButtonState();
        if(initialTimeInput) { initialTimeInput.focus(); }
    });
});

// Note: clearAllValidationVisuals function was removed as it was unused and clearInputValidationStates handles specific cases.
// If a global clear is needed later, it can be re-evaluated.

    if (copyResultButton) {
        copyResultButton.addEventListener('click', () => {
            let textToCopy = '';
            // If resultArea contains the structured HTML for date results
            if (resultArea.querySelector('p strong')) {
                const lines = [];
                resultArea.querySelectorAll('p').forEach(p => {
                    lines.push(p.textContent || p.innerText);
                });
                textToCopy = lines.join('\n'); // Newline separated
            } else {
                textToCopy = resultArea.textContent || resultArea.innerText;
            }

            if (textToCopy.trim() &&
                textToCopy.trim() !== 'Calculating...' &&
                !resultArea.classList.contains('error-message')) {
                navigator.clipboard.writeText(textToCopy.trim())
                    .then(() => {
                        const originalText = copyResultButton.textContent;
                        copyResultButton.textContent = 'Copied!';
                        copyResultButton.disabled = true;
                        setTimeout(() => {
                            copyResultButton.textContent = originalText;
                            copyResultButton.disabled = false;
                        }, 2000); // Revert after 2 seconds
                    })
                    .catch(err => {
                        console.error('Failed to copy text: ', err);
                        alert('Failed to copy result. Please try again or copy manually.');
                    });
            }
        });
    }
});
