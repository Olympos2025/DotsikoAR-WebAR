const arManager = {
    init: function() {
        // Get references to elements
        const fileInput = document.getElementById('file-input');
        const selectBtn = document.getElementById('select-button');
        const clearBtn = document.getElementById('clear-button');
        const arContainer = document.getElementById('ar-container');
        const infoBox = document.getElementById('info-box');
        const camIcon = document.getElementById('cam-icon');
        const gpsIcon = document.getElementById('gps-icon');
        
        // Handle KML file selection
        selectBtn.addEventListener('click', () => {
            fileInput.click();
        });
        fileInput.addEventListener('change', () => {
            if (fileInput.files) {
                for (let file of fileInput.files) {
                    KmlParser.parseFile(file)
                        .then(entities => {
                            for (let ent of entities) {
                                arContainer.appendChild(ent);
                            }
                        })
                        .catch(err => console.error('Σφάλμα φόρτωσης KML:', err));
                }
            }
        });
        // Clear all AR entities
        clearBtn.addEventListener('click', () => {
            while (arContainer.firstChild) {
                arContainer.removeChild(arContainer.firstChild);
            }
        });
        // Hide info box on tap
        infoBox.addEventListener('click', () => {
            infoBox.style.display = 'none';
        });
        // Initialize status icons
        gpsIcon.classList.add('searching');
        camIcon.classList.add('searching');
        // Watch GPS status
        if ('geolocation' in navigator) {
            navigator.geolocation.watchPosition(
                (position) => {
                    // GPS fix acquired
                    gpsIcon.classList.remove('searching', 'error');
                    gpsIcon.classList.add('active');
                },
                (error) => {
                    // GPS error or denied
                    gpsIcon.classList.remove('searching', 'active');
                    gpsIcon.classList.add('error');
                    console.warn('Σφάλμα GPS:', error);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
            );
        }
        // Watch camera permission status (if supported)
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'camera' }).then(permissionStatus => {
                const updateCamStatus = () => {
                    camIcon.classList.remove('active', 'error', 'searching');
                    if (permissionStatus.state === 'granted') {
                        camIcon.classList.add('active');
                    } else if (permissionStatus.state === 'denied') {
                        camIcon.classList.add('error');
                    } else {
                        camIcon.classList.add('searching');
                    }
                };
                updateCamStatus();
                permissionStatus.onchange = updateCamStatus;
            }).catch(err => {
                console.warn('Camera permissions API not supported.', err);
                // Fallback: assume camera active after a delay if no error thrown
                setTimeout(() => {
                    camIcon.classList.remove('searching');
                    camIcon.classList.add('active');
                }, 3000);
            });
        } else {
            // No permissions API, set camera icon to active after initialization delay
            setTimeout(() => {
                camIcon.classList.remove('searching');
                camIcon.classList.add('active');
            }, 3000);
        }
        // Handle iOS device orientation permission (Safari iOS 13+)
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            // Create a prompt button for enabling motion/orientation
            const orientBtn = document.createElement('button');
            orientBtn.textContent = 'Ενεργοποίηση Προσανατολισμού';
            orientBtn.style.position = 'fixed';
            orientBtn.style.top = '50%';
            orientBtn.style.left = '50%';
            orientBtn.style.transform = 'translate(-50%, -50%)';
            orientBtn.style.padding = '15px 20px';
            orientBtn.style.fontSize = '1.1em';
            orientBtn.style.zIndex = '2000';
            orientBtn.style.backdropFilter = 'blur(5px)';
            orientBtn.style.webkitBackdropFilter = 'blur(5px)';
            orientBtn.style.background = 'rgba(255, 255, 255, 0.7)';
            orientBtn.style.border = 'none';
            orientBtn.style.borderRadius = '8px';
            orientBtn.style.fontWeight = 'bold';
            orientBtn.style.cursor = 'pointer';
            orientBtn.addEventListener('click', () => {
                DeviceOrientationEvent.requestPermission().then(response => {
                    if (response === 'granted') {
                        console.log('Προσανατολισμός συσκευής ενεργοποιήθηκε.');
                    } else {
                        console.warn('Άρνηση άδειας προσανατολισμού.');
                    }
                }).catch(err => {
                    console.error('Σφάλμα αιτήματος προσανατολισμού:', err);
                }).finally(() => {
                    orientBtn.remove();
                });
            });
            document.body.appendChild(orientBtn);
        }
    }
};
