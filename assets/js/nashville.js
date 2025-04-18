/*
 * Nashville Number System (NNS) to Chord Converter
 */

// --- Data Definitions ---

// Note names (Sharps and Flats)
const notesSharp = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const notesFlat = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const flatKeySignatures = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']; // Keys typically using flats

// Major Scale Intervals (Semitones from root)
const majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11]; // 1, 2, 3, 4, 5, 6, 7

// Chord definitions for each Major Key's diatonic chords
// Format: [1, 2m, 3m, 4, 5, 6m, 7dim]
const scales = {
    'C': ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'],
    'Db': ['Db', 'Ebm', 'Fm', 'Gb', 'Ab', 'Bbm', 'Cdim'],
    'D': ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim'],
    'Eb': ['Eb', 'Fm', 'Gm', 'Ab', 'Bb', 'Cm', 'Ddim'],
    'E': ['E', 'F#m', 'G#m', 'A', 'B', 'C#m', 'D#dim'],
    'F': ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'Edim'],
    'Gb': ['Gb', 'Abm', 'Bbm', 'Cb', 'Db', 'Ebm', 'Fdim'],
    'G': ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim'],
    'Ab': ['Ab', 'Bbm', 'Cm', 'Db', 'Eb', 'Fm', 'Gdim'],
    'A': ['A', 'Bm', 'C#m', 'D', 'E', 'F#m', 'G#dim'],
    'Bb': ['Bb', 'Cm', 'Dm', 'Eb', 'F', 'Gm', 'Adim'],
    'B': ['B', 'C#m', 'D#m', 'E', 'F#', 'G#m', 'A#dim'],
    // Aliases for sharp keys (use sharp versions for consistency if preferred)
    'C#': ['C#', 'D#m', 'E#m', 'F#', 'G#', 'A#m', 'B#dim'], // E#m = Fm, B#dim = Cdim
    'F#': ['F#', 'G#m', 'A#m', 'B', 'C#', 'D#m', 'E#dim'], // E#dim = Fdim
};

// Keys to display on buttons
const displayKeys = ['Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B', 'C'];

// Store the original NNS content globally within this script's scope
let originalNnsContent = '';
let songContentElementId = '';
let keysContainerElementId = '';

// --- Helper Functions ---

/**
 * Get the appropriate scale array, handling aliases like C#/Db.
 * @param {string} keyName - e.g., "C", "Db", "G"
 * @returns {string[]|null} Array of chord names or null if key not found.
 */
function getScale(keyName)
{
    // Prioritize exact match first
    if (scales[keyName]) return scales[keyName];
    // Handle common aliases
    if (keyName === 'C#') return scales['C#'] || scales['Db'];
    if (keyName === 'Db') return scales['Db'] || scales['C#'];
    if (keyName === 'F#') return scales['F#'] || scales['Gb'];
    if (keyName === 'Gb') return scales['Gb'] || scales['F#'];
    // Add more aliases (G#/Ab, A#/Bb, D#/Eb) if needed
    return null;
}

/**
 * Determines if a key typically uses flats or sharps.
 * @param {string} keyName - The key name.
 * @returns {boolean} True if the key typically uses flats.
 */
function useFlatsForKey(keyName)
{
    if (keyName.includes('b')) return true;
    if (keyName.includes('#')) return false;
    return flatKeySignatures.includes(keyName);
}

/**
 * Calculates the note name for a given scale degree in a specific key.
 * @param {string} key - The target key (e.g., "G", "Eb").
 * @param {number} degree - The scale degree (1-7).
 * @param {boolean} isFlat - Is the degree flatted (e.g., b7)?
 * @param {boolean} isSharp - Is the degree sharped (e.g., #4)?
 * @returns {string|null} The note name (e.g., "Bb", "C#") or null.
 */
function getNoteForDegree(key, degree, isFlat = false, isSharp = false)
{
    if (degree < 1 || degree > 7) return null; // Basic diatonic degrees only for now

    const useFlats = useFlatsForKey(key);
    const noteArray = useFlats ? notesFlat : notesSharp;

    // Find the root note's index
    let rootIndex = noteArray.indexOf(key);
    if (rootIndex === -1)
    { // Try the other array if not found (e.g., key "Db" in notesSharp)
        const otherNoteArray = useFlats ? notesSharp : notesFlat;
        rootIndex = otherNoteArray.indexOf(key);
        if (rootIndex === -1) return null; // Key not found in either
    }

    // Get the interval in semitones for the diatonic degree
    let interval = majorScaleIntervals[degree - 1];

    // Apply flat/sharp modifier to the interval
    if (isFlat) interval--;
    if (isSharp) interval++;

    // Calculate the target note index
    const targetIndex = (rootIndex + interval + 12) % 12; // Add 12 for modulo of negative results

    return noteArray[targetIndex];
}


// --- Core Conversion Function ---

/**
 * Converts a string containing NNS notation into standard chords for a given key.
 * @param {string} nnsString - The input string with NNS numbers.
 * @param {string} targetKey - The desired key (e.g., "G", "Bb").
 * @returns {string} The string with NNS numbers replaced by chords.
 */
function convertNNSToChords(nnsString, targetKey)
{
    const scale = getScale(targetKey);
    if (!scale)
    {
        console.error("Scale not found for key:", targetKey);
        return nnsString; // Return original if key is unknown
    }

    // Regex to find NNS numbers (improved):
    // - (b?#?) : Optional flat or sharp before the number (e.g., b7, #4)
    // - ([1-7]) : The core scale degree number
    // - (maj|min|m|dim|sus|aug|add|[-+Δ°ø]?\d+)* : Modifiers (m, 7, maj7, sus4, dim, etc.) - non-capturing group * makes it optional
    // - (?:\/(b?#?[1-7]))? : Optional slash chord part (e.g., /5, /b3) - non-capturing group ? makes it optional
    // - \b : Word boundaries to avoid matching numbers within words
    const nnsRegex = /(?<!Verse\s|Chorus\s|Bridge\s|Instrumental\s|Intro\s|Outro\s|Tag\s)\b(b?#?)([1-7])(maj|min|m|dim|sus|aug|add|[-+Δ°ø]?\d+)*?(?:\/(b?#?)(\d))?\b/gi;


    return nnsString.replace(nnsRegex, (match, accidental, numStr, modifiers, slashAccidental, slashNumStr) =>
    {
        try
        {
            const degreeNum = parseInt(numStr, 10);
            const isFlat = accidental === 'b';
            const isSharp = accidental === '#';

            // --- 1. Determine the Base Diatonic Chord ---
            let baseChord = scale[degreeNum - 1]; // Chord from the scale array (0-indexed)

            // --- 2. Adjust Root Note for Accidentals (b or # before number) ---
            // If the NNS number has an accidental (b7, #4), we need the *note* name, not the diatonic chord name.
            let rootNote = getNoteForDegree(targetKey, degreeNum, isFlat, isSharp);
            if (!rootNote) return match; // If we can't find the note, skip conversion

            // --- 3. Determine Chord Quality (Major/Minor/Dim) ---
            let quality = '';
            const isScaleChordMinor = baseChord.includes('m') && !baseChord.includes('dim');
            const isScaleChordDim = baseChord.includes('dim');

            modifiers = modifiers || '';
            const nnsIndicatesMinor = modifiers.includes('m') && !modifiers.includes('maj'); // m or min
            const nnsIndicatesDim = modifiers.includes('dim') || modifiers.includes('°') || modifiers.includes('ø');
            const nnsIndicatesMajor = modifiers.includes('maj') || modifiers.includes('Δ'); // Check explicit major

            if (nnsIndicatesDim)
            {
                quality = 'dim'; // Explicit dim overrides others
            } else if (nnsIndicatesMinor)
            {
                quality = 'm'; // Explicit minor
            } else if (nnsIndicatesMajor)
            {
                quality = ''; // Explicit major
            } else if (accidental)
            {
                // If there's an accidental (b7, #4), assume MAJOR unless 'm' or 'dim' is specified
                // (e.g., b7 in C is Bb major by default)
                quality = '';
            } else
            {
                // No accidental, no explicit quality -> use diatonic quality
                if (isScaleChordDim) quality = 'dim';
                else if (isScaleChordMinor) quality = 'm';
                else quality = ''; // Diatonic major
            }

            // Remove quality indicators from modifiers string for appending later
            let remainingModifiers = modifiers
                .replace(/m(?!aj)|min/, '') // Remove 'm' or 'min' unless part of 'maj'
                .replace(/dim|°|ø/, '')
                .replace(/maj|Δ/, ''); // Remove 'maj' or triangle


            // --- 4. Assemble the Chord (Root + Quality + Modifiers) ---
            let finalChord = rootNote + quality + remainingModifiers;


            // --- 5. Handle Slash Chord ---
            if (slashNumStr)
            {
                const slashDegreeNum = parseInt(slashNumStr, 10);
                const isSlashFlat = slashAccidental === 'b';
                const isSlashSharp = slashAccidental === '#';
                let slashNote = getNoteForDegree(targetKey, slashDegreeNum, isSlashFlat, isSlashSharp);
                if (slashNote)
                {
                    finalChord += "/" + slashNote;
                }
            }

            return `<span class="chord">${finalChord}</span>`;

        } catch (error)
        {
            console.warn(`Could not convert NNS chord: ${match} in key ${targetKey}`, error);
            return match; // Return the original number if conversion fails
        }
    });
}


// --- UI Interaction ---

/**
 * Updates the song display area with converted chords.
 * @param {string} targetKey - The key to convert to.
 */
function displayConvertedSong(targetKey)
{
    const displayElement = document.getElementById(songContentElementId);
    const keysContainer = document.getElementById(keysContainerElementId);

    if (!displayElement || !originalNnsContent) return;

    const chordedString = convertNNSToChords(originalNnsContent, targetKey);
    displayElement.innerHTML = chordedString; // Update the <pre> tag content

    // Update selected key button style
    if (keysContainer)
    {
        const buttons = keysContainer.querySelectorAll('a');
        buttons.forEach(button =>
        {
            button.classList.remove('selected');
            if (button.textContent === targetKey)
            {
                button.classList.add('selected');
            }
        });
    }
}

/**
 * Sets up the Nashville transposition UI and initial state.
 * @param {string} nnsContent - The raw NNS content of the song.
 * @param {string} contentElementId - The ID of the HTML element to display the song in (e.g., 'song-content').
 * @param {string} keysContainerId - The ID of the HTML element containing the key buttons.
 */
function setupNashvilleTranspose(nnsContent, contentElementId, keysId, initialKey = null)
{
    console.log(`setupNashvilleTranspose: Called. Received initialKey parameter = ${initialKey}`); // Log entry point and received key

    // Store globally needed variables for this song instance
    originalNnsContent = nnsContent;
    songContentElementId = contentElementId;
    keysContainerElementId = keysId;

    const keysContainer = document.getElementById(keysContainerElementId);
    const displayElement = document.getElementById(songContentElementId);

    if (!keysContainer)
    {
        console.error("setupNashvilleTranspose: Keys container element not found:", keysContainerElementId);
        if (displayElement) displayElement.textContent = originalNnsContent;
        return;
    }
    if (!displayElement)
    {
        console.error("setupNashvilleTranspose: Song content display element not found:", contentElementId);
        return;
    }

    keysContainer.innerHTML = ''; // Clear existing buttons

    let keyToSelect = null; // Start with null, determine the key to use

    // --- Determine the Key to Select ---
    // 1. Prioritize the passed initialKey if it's valid
    if (initialKey && typeof initialKey === 'string' && initialKey.trim() !== '')
    {
        console.log(`setupNashvilleTranspose: Checking validity of provided initialKey "${initialKey}"...`);
        if (displayKeys.includes(initialKey))
        {
            keyToSelect = initialKey;
            console.log(`setupNashvilleTranspose: Using valid initialKey "${keyToSelect}" passed from template.`);
        } else
        {
            console.warn(`setupNashvilleTranspose: Provided initialKey "${initialKey}" is NOT in displayKeys array. Ignoring it.`);
        }
    } else
    {
        console.log("setupNashvilleTranspose: No valid initialKey provided.");
    }

    // 2. If no valid initialKey was found, try detecting from content
    if (!keyToSelect)
    {
        console.log("setupNashvilleTranspose: Attempting to detect key from NNS content...");
        const keyMatch = nnsContent.match(/^Original Key:\s*([A-G][b#]?)/im);
        if (keyMatch && keyMatch[1])
        {
            const detectedKey = keyMatch[1];
            console.log(`setupNashvilleTranspose: Detected "Original Key: ${detectedKey}" in content.`);
            // Validate the detected key too
            if (displayKeys.includes(detectedKey))
            {
                keyToSelect = detectedKey;
                console.log(`setupNashvilleTranspose: Using valid detected key "${keyToSelect}".`);
            } else
            {
                console.warn(`setupNashvilleTranspose: Detected key "${detectedKey}" is NOT in displayKeys array. Will use default.`);
            }
        } else
        {
            console.log("setupNashvilleTranspose: No 'Original Key:' line found in content.");
        }
    }

    // 3. If still no key, use the default (e.g., C or last in list)
    if (!keyToSelect)
    {
        const defaultKey = displayKeys.includes('C') ? 'C' : (displayKeys[displayKeys.length - 1] || 'C');
        keyToSelect = defaultKey;
        console.log(`setupNashvilleTranspose: No specific key determined, defaulting to "${keyToSelect}".`);
    }

    // --- Generate Key Buttons ---
    displayKeys.forEach(key =>
    {
        const keyButton = document.createElement('a');
        keyButton.href = '#';
        keyButton.textContent = key;
        keyButton.addEventListener('click', (event) =>
        {
            event.preventDefault();
            // Pass false for isInitialLoad on subsequent clicks
            displayConvertedSong(key, false);
        });
        keysContainer.appendChild(keyButton);
    });

    // --- Initial Display ---
    console.log(`setupNashvilleTranspose: Performing initial displayConvertedSong with final key: "${keyToSelect}"`);
    // Ensure displayConvertedSong exists before calling
    if (typeof displayConvertedSong === 'function')
    {
        displayConvertedSong(keyToSelect, true); // Pass true for isInitialLoad
    } else
    {
        console.error("setupNashvilleTranspose: displayConvertedSong function is not defined!");
        if (displayElement) displayElement.textContent = "Error: Display function missing.";
    }
}

// (Make sure the displayConvertedSong function is also present in nashville.js as previously provided)
/**
 * Updates the song display area with converted chords.
 * @param {string} targetKey - The key to convert to.
 * @param {boolean} isInitialLoad - Flag to indicate if this is the first load with a pre-selected key.
 */
function displayConvertedSong(targetKey, isInitialLoad = false)
{
    const displayElement = document.getElementById(songContentElementId);
    const keysContainer = document.getElementById(keysContainerElementId);

    // Ensure elements exist and we have content
    if (!displayElement || !keysContainer || typeof originalNnsContent !== 'string')
    {
        console.error("displayConvertedSong: Cannot display - missing element or original content.");
        return;
    }
    // Ensure targetKey is valid
    if (!displayKeys.includes(targetKey))
    {
        console.error(`displayConvertedSong: Invalid targetKey "${targetKey}" requested.`);
        return; // Don't try to convert to an invalid key
    }

    console.log(`displayConvertedSong: Converting to key "${targetKey}". Initial load: ${isInitialLoad}`);

    // Perform the conversion using the core function
    const chordedString = convertNNSToChords(originalNnsContent, targetKey);
    displayElement.innerHTML = chordedString; // Update the <pre> tag content
    // Optional: store current key if needed elsewhere, e.g., displayElement.dataset.currentKey = targetKey;

    // Update selected key button style
    const buttons = keysContainer.querySelectorAll('a');
    buttons.forEach(button =>
    {
        // Use textContent which should match the key directly
        if (button.textContent === targetKey)
        {
            button.classList.add('selected');
        } else
        {
            button.classList.remove('selected');
        }
    });
}

// Make setup function globally accessible (if needed, or call directly from template.html)
// window.setupNashvilleTranspose = setupNashvilleTranspose;