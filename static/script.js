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
    const storedDuration = localStorage.getItem('timeCalcDuration');
    const storedDaysOffset = localStorage.getItem('timeCalcDaysOffset');

    if (storedInitialTime) initialTimeInput.value = storedInitialTime;
    if (storedDuration) durationInput.value = storedDuration;
    if (storedDaysOffset) daysOffsetInput.value = storedDaysOffset;

    // --- Initial Setup ---
    if(initialTimeInput) {
        initialTimeInput.focus();
    }

    // --- Validation ---
    const initialTimeRegex = /^(\d{1,2}:\d{2}\s*(AM|PM)?|\d{1,2}:\d{2})$/i;
    const durationRegex = /^((\d+\s*days?,\s*)?\d{1,3}:\d{2}(:\d{2})?|:\d{2})$/i;
    const daysOffsetRegex = /^-?\d*$/;

    function checkFormValidityAndToggleButtonState() {
        const isInitialTimeCurrentlyValid = !initialTimeError.textContent && initialTimeInput.value.trim() !== '';
        const isDurationCurrentlyValid = !durationError.textContent && durationInput.value.trim() !== '';
        const isDaysOffsetCurrentlyValid = !daysOffsetError.textContent;
        calculateButton.disabled = !(isInitialTimeCurrentlyValid && isDurationCurrentlyValid && isDaysOffsetCurrentlyValid);
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
        const duration = durationInput.value.trim();
        const daysOffset = daysOffsetInput.value.trim();

        if (!presetName) {
            alert("Preset name cannot be empty.");
            return;
        }
        if (!initialTime || !duration) { // Require main fields for a preset
            alert("Initial time and duration must be filled to save a preset.");
            return;
        }

        const newPreset = { name: presetName, initial_time: initialTime, duration: duration, days_offset: daysOffset };
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
            initialTimeInput.value = presetToLoad.initial_time;
            durationInput.value = presetToLoad.duration;
            daysOffsetInput.value = presetToLoad.days_offset;
            validateField(initialTimeInput, initialTimeError, initialTimeRegex, 'Invalid format. Use H:MM AM/PM or HH:MM.', true);
            validateField(durationInput, durationError, durationRegex, 'Invalid format. Use H:MM:SS, D days, H:MM, etc.', true);
            validateField(daysOffsetInput, daysOffsetError, daysOffsetRegex, 'Must be an integer (e.g., 1, -2).', false);
            // checkFormValidityAndToggleButtonState(); // Called by validateField
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
    initialTimeInput.addEventListener('input', () => validateField(initialTimeInput, initialTimeError, initialTimeRegex, 'Invalid format. Use H:MM AM/PM or HH:MM.', true));
    durationInput.addEventListener('input', () => validateField(durationInput, durationError, durationRegex, 'Invalid format. Use H:MM:SS, D days, H:MM, etc.', true));
    daysOffsetInput.addEventListener('input', () => validateField(daysOffsetInput, daysOffsetError, daysOffsetRegex, 'Must be an integer (e.g., 1, -2).', false));

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
                clearInputValidationStates([
                    {inputElement: initialTimeInput, errorElement: initialTimeError},
                    {inputElement: durationInput, errorElement: durationError},
                    {inputElement: daysOffsetInput, errorElement: daysOffsetError}
                ]);
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
