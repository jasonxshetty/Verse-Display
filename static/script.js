// Check if the browser supports Speech Recognition
if ('webkitSpeechRecognition' in window) {
    let recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let isRecognizing = false;
    let currentReference = '';

    // Setting initial button states
    document.getElementById('start-recognition').disabled = false;
    document.getElementById('stop-recognition').disabled = true;
    disableNavigationButtons();

    // Handling start listening button click
    document.getElementById('start-recognition').onclick = function() {
        if (!isRecognizing) {
            isRecognizing = true;
            recognition.start();
            document.getElementById('start-recognition').disabled = true;
            document.getElementById('stop-recognition').disabled = false;
            updateStatus('Listening...');
        }
    };

    // Handling stop listening button click
    document.getElementById('stop-recognition').onclick = function() {
        if (isRecognizing) {
            isRecognizing = false;
            recognition.stop();
            document.getElementById('start-recognition').disabled = false;
            document.getElementById('stop-recognition').disabled = true;
            updateStatus('Stopped listening.');
        }
    };

    recognition.onstart = function() {
        // Recognition started
    };

    recognition.onerror = function(event) {
        updateStatus('Error in recognition: ' + event.error);
    };

    recognition.onend = function() {
        if (isRecognizing) {
            recognition.start();
        }
    };

    recognition.onresult = function(event) {
        let lastResultIndex = event.results.length - 1;
        let spokenText = event.results[lastResultIndex][0].transcript.trim();
        updateStatus('You said: ' + spokenText);

        let convertedReference = convertSpokenReference(spokenText);
        fetchVerse(convertedReference);
    };
} else {
    alert('Speech recognition not supported in this browser. Please use Google Chrome.');
}

// Handling manual text input
document.getElementById('submit-text').onclick = function() {
    let textInput = document.getElementById('text-input').value;
    if (textInput) {
        updateStatus('You entered: ' + textInput);
        fetchVerse(textInput);
    } else {
        alert('Please enter a reference.');
    }
};

// Handling expand/contract display window button
document.getElementById('expand-button').onclick = function() {
    const displayWindow = document.getElementById('display-window');
    displayWindow.classList.toggle('expanded');

    // Toggling the button text between Expand and Close
    const expandButton = document.getElementById('expand-button');
    if (displayWindow.classList.contains('expanded')) {
        expandButton.textContent = 'Close';
    } else {
        expandButton.textContent = 'Expand';
    }
};

// Handling previous verse button
document.getElementById('prev-button').onclick = function() {
    if (currentReference) {
        getAdjacentVerse(currentReference, -1);
    }
};

// Handling next verse button
document.getElementById('next-button').onclick = function() {
    if (currentReference) {
        getAdjacentVerse(currentReference, 1);
    }
};

// Function to disable navigation buttons
function disableNavigationButtons() {
    document.getElementById('prev-button').disabled = true;
    document.getElementById('next-button').disabled = true;
}

// Function to enable navigation buttons
function enableNavigationButtons() {
    document.getElementById('prev-button').disabled = false;
    document.getElementById('next-button').disabled = false;
}

// Function to update status message
function updateStatus(message) {
    document.getElementById('status-message').textContent = message;
}

// Function to convert spoken reference to proper format
function convertSpokenReference(spokenReference) {
    let text = spokenReference.toLowerCase();

    // Removing filler words
    text = text.replace(/\b(the|and|please|give me|i want)\b/g, '');

    // Handling ordinals in book names
    const ordinalMapping = {
        'first': '1',
        '1st': '1',
        'one': '1',
        'second': '2',
        '2nd': '2',
        'two': '2',
        'third': '3',
        '3rd': '3',
        'three': '3'
    };

    let words = text.split(/\s+/);
    let processedWords = [];
    let i = 0;

    while (i < words.length) {
        let word = words[i];
        // Checking if the word is an ordinal
        if (ordinalMapping[word]) {
            // Combining with the next word to form the book name (e.g., '1 Kings')
            if (i + 1 < words.length) {
                let nextWord = words[i + 1];
                let combined = ordinalMapping[word] + ' ' + nextWord;
                processedWords.push(combined);
                i += 2; // Skipping the next word
                continue;
            } else {
                // If there's no next word, just use the ordinal number
                processedWords.push(ordinalMapping[word]);
                i += 1;
                continue;
            }
        } else {
            processedWords.push(word);
            i += 1;
        }
    }

    // Rebuilding the text after processing ordinals
    text = processedWords.join(' ');

    // Splitting into book, chapter, and verse
    words = text.split(/\s+/);
    let bookName = [];
    let chapterWords = [];
    let verseWords = [];
    let state = 'book'; // Can be 'book', 'chapter', 'verse'

    for (let word of words) {
        if (word === 'chapter') {
            state = 'chapter';
        } else if (word === 'verse') {
            state = 'verse';
        } else if (state === 'book') {
            bookName.push(word);
        } else if (state === 'chapter') {
            chapterWords.push(word);
        } else if (state === 'verse') {
            verseWords.push(word);
        }
    }

    let bookNameStr = bookName.map(capitalize).join(' ');
    let chapterStr = chapterWords.join(' ');
    let verseStr = verseWords.join(' ');

    // Turning chapter and verse words into numbers
    let chapter = '';
    let verse = '';
    if (chapterStr) {
        chapter = wordsToNumber(chapterStr);
    }
    if (verseStr) {
        verse = wordsToNumber(verseStr);
    }

    // If chapter and verse aren't found, try to grab numbers from remaining words
    if (!chapter && !verse) {
        let remainingWords = words.slice(bookName.length);
        let numberWords = [];
        for (let word of remainingWords) {
            let num = wordsToNumber(word);
            if (!isNaN(num)) {
                numberWords.push(num);
            }
        }
        if (numberWords.length >= 2) {
            chapter = numberWords[0];
            verse = numberWords[1];
        } else if (numberWords.length === 1) {
            chapter = numberWords[0];
        }
    }

    // Building the formatted reference
    let formattedReference = '';
    if (verse) {
        formattedReference = `${bookNameStr} ${chapter}:${verse}`;
    } else if (chapter) {
        formattedReference = `${bookNameStr} ${chapter}`;
    } else {
        formattedReference = bookNameStr;
    }
    return formattedReference.trim();
}

// Function to capitalize the first letter of a word
function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

// Function to convert words to numbers
function wordsToNumber(text) {
    const numberWords = {
        'zero': 0,
        'one': 1,
        'two': 2,
        'three': 3,
        'four': 4,
        'for': 4, // Handling homophones
        'five': 5,
        'six': 6,
        'seven': 7,
        'eight': 8,
        'ate': 8, // Handling homophones
        'nine': 9,
        'ten': 10,
        'eleven': 11,
        'twelve': 12,
        'thirteen': 13,
        'fourteen': 14,
        'fifteen': 15,
        'sixteen': 16,
        'seventeen': 17,
        'eighteen': 18,
        'nineteen': 19,
        'twenty': 20,
        'thirty': 30,
        'forty': 40,
        'fifty': 50,
        'sixty': 60,
        'seventy': 70,
        'eighty': 80,
        'ninety': 90,
        'hundred': 100,
        'thousand': 1000
    };

    let words = text.split(/\s+/);
    let total = 0;
    let currentNumber = 0;

    for (let word of words) {
        if (numberWords[word] !== undefined) {
            currentNumber += numberWords[word];
        } else if (!isNaN(parseInt(word))) {
            currentNumber += parseInt(word);
        } else {
            // Not a number word, return the original text
            return text;
        }
    }
    total += currentNumber;

    return total.toString();
}

// Function to fetch verse based on reference
function fetchVerse(reference) {
    updateStatus('Fetching verse...');

    // Clearing previous verse
    document.getElementById('verse').innerHTML = '';

    // Construct the API URL
    const apiUrl = `https://bible-api.com/${encodeURIComponent(reference)}`;

    // Fetch the verse directly from the Bible API
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                document.getElementById('verse').innerHTML = data.error;
                disableNavigationButtons();
                updateStatus(data.error);
            } else {
                document.getElementById('verse').innerHTML =
                    '<p class="verse-text">' + data.text + '</p>' +
                    '<p class="verse-reference">' + data.reference + '</p>';

                currentReference = data.reference;
                enableNavigationButtons();
                updateStatus('Verse displayed.');
            }
        })
        .catch(error => {
            document.getElementById('verse').innerHTML = 'An error occurred: ' + error;
            disableNavigationButtons();
            updateStatus('An error occurred: ' + error);
        });
}

// Function to get adjacent verse (next or previous)
function getAdjacentVerse(reference, direction) {
    updateStatus('Fetching adjacent verse...');

    // Extract book, chapter, and verse
    const match = /^(.+?)\s+(\d+):(\d+)$/.exec(reference);
    if (match) {
        const book = match[1];
        let chapter = parseInt(match[2]);
        let verse = parseInt(match[3]);

        verse += direction;

        // Fetch total verses in the current chapter
        getTotalVersesInChapter(book, chapter)
            .then(totalVerses => {
                if (verse > totalVerses) {
                    // Move to next chapter
                    chapter += 1;
                    verse = 1;
                    getTotalVersesInChapter(book, chapter)
                        .then(totalVersesInNewChapter => {
                            if (totalVersesInNewChapter) {
                                fetchVerse(`${book} ${chapter}:${verse}`);
                            } else {
                                updateStatus('Reached the end of the book.');
                            }
                        });
                } else if (verse < 1) {
                    // Move to previous chapter
                    chapter -= 1;
                    if (chapter < 1) {
                        updateStatus('Reached the beginning of the book.');
                    } else {
                        getTotalVersesInChapter(book, chapter)
                            .then(totalVersesInNewChapter => {
                                if (totalVersesInNewChapter) {
                                    verse = totalVersesInNewChapter;
                                    fetchVerse(`${book} ${chapter}:${verse}`);
                                } else {
                                    updateStatus('Cannot navigate to the previous chapter.');
                                }
                            });
                    }
                } else {
                    // Fetch the adjacent verse
                    fetchVerse(`${book} ${chapter}:${verse}`);
                }
            });
    } else {
        updateStatus('Current reference is not in a navigable format.');
    }
}

// Function to get total number of verses in a chapter
function getTotalVersesInChapter(book, chapter) {
    const apiUrl = `https://bible-api.com/${encodeURIComponent(`${book} ${chapter}`)}`;

    return fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                return null;
            } else {
                return data.verses.length;
            }
        })
        .catch(error => {
            updateStatus('An error occurred: ' + error);
            return null;
        });
}