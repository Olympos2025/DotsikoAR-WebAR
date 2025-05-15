const arManager = {
    init: function() {
        const fileInput = document.getElementById('file-input');
        const selectBtn = document.getElementById('select-button');
        const clearBtn = document.getElementById('clear-button');
        const arContainer = document.getElementById('ar-container');
        const infoBox = document.getElementById('info-box');

        // Handle KML file selection
        selectBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files) {
                for (let file of fileInput.files) {
                    KmlParser.parseFile(file)
                        .then(entities => {
                            // Clear previous entities before adding new ones
                            while (arContainer.firstChild) {
                                arContainer.removeChild(arContainer.firstChild);
                            }
                            entities.forEach(ent => arContainer.appendChild(ent));
                        })
                        .catch(err => {
                            console.error('Error loading KML:', err);
                            alert("Σφάλμα φόρτωσης αρχείου KML");
                        });
                }
            }
        });

        // Clear all AR entities
        clearBtn.addEventListener('click', () => {
            while (arContainer.firstChild) {
                arContainer.removeChild(arContainer.firstChild);
            }
        });

        // Initialize UI elements and event listeners
        // Additional AR setup can go here...
    }
};
