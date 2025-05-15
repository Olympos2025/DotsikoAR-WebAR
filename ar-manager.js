const arManager = {
    // Στοιχεία DOM
    container: null,
    scene: null,
    camera: null,
    fileInput: null,
    clearButton: null,
    refreshButton: null,
    overlayButton: null,
    overlaySlider: null,
    overlayImage: null,

    // Κατάσταση
    isInitialized: false,
    loadedFeatures: [],
    userPosition: null,
    userHeading: 0,
    overlayVisible: false,

    /**
     * Αρχικοποίηση του AR Manager
     */
    init: function() {
        console.log('Initializing AR Manager');
        // Ανάκτηση αναφορών σε στοιχεία DOM
        this.container = document.getElementById('ar-container');
        this.scene = document.querySelector('a-scene');
        this.camera = document.querySelector('a-camera');
        this.fileInput = document.getElementById('file-input');
        this.clearButton = document.getElementById('clear-button');
        this.refreshButton = document.getElementById('refresh-button');
        this.overlayButton = document.getElementById('streetview-button');
        this.overlaySlider = document.getElementById('overlay-slider');
        this.overlayImage = document.getElementById('streetview-image');

        // Έλεγχος κρίσιμων στοιχείων
        if (!this.scene || !this.camera || !this.container) {
            alert('Η εφαρμογή δεν μπορεί να ξεκινήσει (λείπουν στοιχεία σκηνής AR).');
            console.error('Missing A-Frame elements');
            return;
        }

        // Εγγραφή event listeners
        this.initEventListeners();
        // Εγγραφή παρακολούθησης αισθητήρων (GPS/πυξίδας)
        this.initGeoLocation();

        this.isInitialized = true;
        console.log('AR Manager initialized');
    },

    /**
     * Εγγραφή event listeners για στοιχεία UI
     */
    initEventListeners: function() {
        const self = this;
        // Φόρτωση αρχείων KML
        this.fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                self.loadKMLFiles(files);
            }
        });
        // Καθαρισμός σκηνής AR
        this.clearButton.addEventListener('click', () => {
            self.clearARScene();
        });
        // Ανανέωση σελίδας
        this.refreshButton.addEventListener('click', () => {
            location.reload();
        });
        // Εναλλαγή overlay Street View
        this.overlayButton.addEventListener('click', () => {
            if (!self.overlayVisible) {
                // Εμφάνιση overlay
                if (self.userPosition) {
                    const lat = self.userPosition.latitude;
                    const lon = self.userPosition.longitude;
                    const heading = self.userHeading || 0;
                    // Διαμόρφωση URL για Google Street View Static API
                    const apiKey = 'YOUR_API_KEY';
                    const url = `https://maps.googleapis.com/maps/api/streetview?size=640x640&location=${lat},${lon}&heading=${heading.toFixed(0)}&pitch=0&fov=90&key=${apiKey}`;
                    self.overlayImage.src = url;
                }
                document.getElementById('streetview-overlay').style.display = 'block';
                self.overlaySlider.style.display = 'block';
                self.overlayVisible = true;
            } else {
                // Απόκρυψη overlay
                document.getElementById('streetview-overlay').style.display = 'none';
                self.overlaySlider.style.display = 'none';
                self.overlayVisible = false;
            }
        });
        // Ρύθμιση διαφάνειας overlay
        this.overlaySlider.addEventListener('input', (e) => {
            const value = e.target.value;
            self.overlayImage.style.opacity = value / 100;
        });
        // Απόκρυψη loading μετά τη φόρτωση της σκηνής AR
        this.scene.addEventListener('loaded', () => {
            console.log('A-Frame scene loaded');
            document.getElementById('loading').style.display = 'none';
        });
        // Ενημέρωση θέσης κάμερας (GPS)
        this.camera.addEventListener('gps-camera-update-position', (e) => {
            self.userPosition = {
                latitude: e.detail.position.latitude,
                longitude: e.detail.position.longitude,
                altitude: e.detail.position.altitude || 0
            };
            console.log('Camera position updated:', self.userPosition);
        });
    },

    /**
     * Αρχικοποίηση παρακολούθησης αισθητήρων (π.χ. πυξίδα)
     */
    initGeoLocation: function() {
        // Παρακολούθηση προσανατολισμού συσκευής (για ενημέρωση userHeading)
        window.addEventListener('deviceorientation', (e) => {
            if (e.alpha != null) {
                this.userHeading = e.alpha;
            }
        }, true);
    },

    /**
     * Φόρτωση και απόδοση πολλαπλών αρχείων KML
     */
    loadKMLFiles: function(files) {
        for (const file of files) {
            KMLParser.parse(file)
                .then(geoJson => {
                    // Προσθήκη χαρακτηριστικών στη σκηνή
                    this.addFeaturesToScene(geoJson.features);
                    // Αποθήκευση χαρακτηριστικών που φορτώθηκαν
                    this.loadedFeatures.push(...geoJson.features);
                })
                .catch(error => {
                    console.error('Error loading KML:', error);
                    alert('Σφάλμα φόρτωσης: ' + error.message);
                });
        }
    },

    /**
     * Προσθήκη λίστας γεωμετρικών χαρακτηριστικών στη σκηνή AR
     */
    addFeaturesToScene: function(features) {
        features.forEach(feature => {
            const geom = feature.geometry;
            if (!geom) return;
            const type = geom.type;
            // Δημιουργία οντότητας A-Frame για κάθε χαρακτηριστικό
            const entity = document.createElement('a-entity');
            entity.classList.add('ar-entity');
            // Αποθήκευση ID χαρακτηριστικού για πιθανή χρήση
            entity.setAttribute('data-feature-id', feature.properties.id || '');

            if (type === 'Polygon') {
                // Υπολογισμός κέντρου πολυγώνου
                const coords = geom.coordinates[0]; // εξωτερικό περίγραμμα
                const center = this.calculateCenter(coords);
                // Τοποθέτηση οντότητας στο κέντρο (επίπεδο έδαφος)
                entity.setAttribute('gps-new-entity-place', {
                    latitude: center.lat,
                    longitude: center.lon,
                    altitude: 0
                });
                // Δημιουργία επίπεδου εμβαδού για το πολύγωνο
                entity.setAttribute('geometry', {
                    primitive: 'plane',
                    width: 10,
                    height: 10,
                    color: '#FF4081',
                    opacity: 0.5
                });
                // Ενεργοποίηση διαφάνειας υλικού
                entity.setAttribute('material', 'transparent', true);
            }
            else if (type === 'LineString') {
                const coords = geom.coordinates;
                if (coords.length < 2) {
                    return; // αν δεν υπάρχουν αρκετά σημεία, παράβλεψη
                }
                // Ορισμός πρώτου σημείου ως άγκυρας (με gps)
                const [lon0, lat0, alt0] = coords[0];
                entity.setAttribute('gps-new-entity-place', {
                    latitude: lat0,
                    longitude: lon0,
                    altitude: 0
                });
                // Υπολογισμός τοπικών συντεταγμένων
