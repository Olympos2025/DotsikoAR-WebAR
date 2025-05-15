// Parser for KML files to AR entities
const KmlParser = {
    // Parse a KML file (File object), return Promise of list of A-Frame entities
    parseFile: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const text = reader.result;
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(text, 'text/xml');
                    const geojson = toGeoJSON.kml(xmlDoc);
                    const entities = KmlParser._parseGeoJSON(geojson);
                    resolve(entities);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(reader.error);
            // Read file as text (assuming KML is XML text)
            reader.readAsText(file);
        });
    },
    // Internal: parse GeoJSON object into AR entities
    _parseGeoJSON: function(geojson) {
        const entities = [];
        if (!geojson || !geojson.features) return entities;
        geojson.features.forEach(feature => {
            const geom = feature.geometry;
            if (!geom) return;
            const type = geom.type;
            const props = feature.properties || {};
            // Shared info
            const name = props.name || '';
            const desc = props.description || '';
            if (type === 'Point') {
                // Point feature
                let [lon, lat, alt] = geom.coordinates;
                if (alt === undefined || alt === null) alt = 0;
                // Create entity at this geolocation
                const pointEntity = document.createElement('a-entity');
                pointEntity.setAttribute('gps-new-entity-place', `latitude: ${lat}; longitude: ${lon}; altitude: ${alt}`);
                // Use a small sphere to mark the point
                pointEntity.setAttribute('geometry', 'primitive: sphere; radius: 5');
                pointEntity.setAttribute('material', 'color: #f1c40f; opacity: 0.8');
                // Store info for interactivity
                pointEntity.dataset.name = name;
                pointEntity.dataset.desc = desc;
                // Click event to show info
                pointEntity.addEventListener('click', () => {
                    const infoBox = document.getElementById('info-box');
                    if (name || desc) {
                        infoBox.innerHTML = `<strong>${name}</strong><br>${desc}`;
                        infoBox.style.display = 'block';
                        clearTimeout(window.infoHideTimeout);
                        window.infoHideTimeout = setTimeout(() => {
                            infoBox.style.display = 'none';
                        }, 10000);
                    }
                });
                entities.push(pointEntity);
            } else if (type === 'LineString') {
                // Line feature
                let coords = geom.coordinates;
                if (coords.length === 0) return;
                // Simplify line if too many points (LOD)
                if (coords.length > 1000) {
                    const step = (coords.length > 2000 ? 4 : 2);
                    const filtered = [];
                    for (let i = 0; i < coords.length; i += step) {
                        filtered.push(coords[i]);
                    }
                    // ensure last point included
                    if (coords.length % step !== 0) {
                        filtered.push(coords[coords.length - 1]);
                    }
                    coords = filtered;
                }
                // Reference point (anchor) = first coordinate
                let [lon0, lat0, alt0] = coords[0];
                if (alt0 === undefined || alt0 === null) alt0 = 0;
                // Compute relative positions to anchor
                const relPoints = [];
                coords.forEach(([lon, lat, alt]) => {
                    if (alt === undefined || alt === null) alt = 0;
                    const diff = KmlParser._geoToLocal(lat, lon, alt, lat0, lon0, alt0);
                    relPoints.push(new THREE.Vector3(diff.x, diff.y, diff.z));
                });
                // Create Three.js line
                const lineMat = new THREE.LineBasicMaterial({ color: 0xe74c3c });
                const lineGeom = new THREE.BufferGeometry().setFromPoints(relPoints);
                const lineObj = new THREE.Line(lineGeom, lineMat);
                // Create an entity and attach line object
                const lineEntity = document.createElement('a-entity');
                lineEntity.setAttribute('gps-new-entity-place', `latitude: ${lat0}; longitude: ${lon0}; altitude: ${alt0}`);
                lineEntity.object3D.add(lineObj);
                // Interactivity
                lineEntity.dataset.name = name;
                lineEntity.dataset.desc = desc;
                lineEntity.addEventListener('click', () => {
                    const infoBox = document.getElementById('info-box');
                    if (name || desc) {
                        infoBox.innerHTML = `<strong>${name}</strong><br>${desc}`;
                        infoBox.style.display = 'block';
                        clearTimeout(window.infoHideTimeout);
                        window.infoHideTimeout = setTimeout(() => {
                            infoBox.style.display = 'none';
                        }, 10000);
                    }
                });
                entities.push(lineEntity);
            } else if (type === 'Polygon') {
                // Polygon feature (only outer boundary considered)
                const rings = geom.coordinates;
                if (!rings.length) return;
                let outer = rings[0]; // outer ring coordinates array
                if (outer.length === 0) return;
                // Simplify polygon if too many vertices
                if (outer.length > 1000) {
                    const step = (outer.length > 2000 ? 4 : 2);
                    const filtered = [];
                    for (let i = 0; i < outer.length; i += step) {
                        filtered.push(outer[i]);
                    }
                    if (outer.length % step !== 0) {
                        filtered.push(outer[outer.length - 1]);
                    }
                    outer = filtered;
                }
                // Anchor at first coordinate
                let [lon0, lat0, alt0] = outer[0];
                if (alt0 === undefined || alt0 === null) alt0 = 0;
                // Compute relative 2D points (x,z) for shape
                const relCoords = [];
                outer.forEach(([lon, lat, alt], index) => {
                    if (alt === undefined || alt === null) alt = 0;
                    const diff = KmlParser._geoToLocal(lat, lon, alt, lat0, lon0, alt0);
                    // Use diff.x and diff.z (horizontal plane), ignore diff.y for shape
                    relCoords.push({ x: diff.x, z: diff.z });
                });
                // If last point repeats first, remove it for shape closure
                if (relCoords.length > 1) {
                    const last = relCoords[relCoords.length - 1];
                    const first = relCoords[0];
                    if (Math.abs(last.x - first.x) < 1e-6 && Math.abs(last.z - first.z) < 1e-6) {
                        relCoords.pop();
                    }
                }
                // Create shape from projected coordinates
                const shape = new THREE.Shape();
                if (relCoords.length > 0) {
                    shape.moveTo(relCoords[0].x, relCoords[0].z);
                    for (let i = 1; i < relCoords.length; i++) {
                        shape.lineTo(relCoords[i].x, relCoords[i].z);
                    }
                }
                // Generate geometry from shape
                const shapeGeom = new THREE.ShapeGeometry(shape);
                // Material for fill (semi-transparent)
                const fillMat = new THREE.MeshBasicMaterial({ color: 0x2ecc71, opacity: 0.25, transparent: true, side: THREE.DoubleSide });
                const shapeMesh = new THREE.Mesh(shapeGeom, fillMat);
                // Outline (border) using line
                const outlinePoints = relCoords.map(p => new THREE.Vector3(p.x, 0, p.z));
                // Close the loop for outline
                if (outlinePoints.length > 0) {
                    outlinePoints.push(new THREE.Vector3(relCoords[0].x, 0, relCoords[0].z));
                }
                const outlineGeom = new THREE.BufferGeometry().setFromPoints(outlinePoints);
                const outlineMat = new THREE.LineBasicMaterial({ color: 0x27ae60 });
                const outlineLine = new THREE.Line(outlineGeom, outlineMat);
                // Rotate shape to horizontal (XZ plane)
                shapeMesh.rotation.x = -Math.PI / 2;
                outlineLine.rotation.x = -Math.PI / 2;
                // Create entity and add mesh and outline
                const polyEntity = document.createElement('a-entity');
                polyEntity.setAttribute('gps-new-entity-place', `latitude: ${lat0}; longitude: ${lon0}; altitude: ${alt0}`);
                polyEntity.object3D.add(shapeMesh);
                polyEntity.object3D.add(outlineLine);
                // Interactivity
                polyEntity.dataset.name = name;
                polyEntity.dataset.desc = desc;
                polyEntity.addEventListener('click', () => {
                    const infoBox = document.getElementById('info-box');
                    if (name || desc) {
                        infoBox.innerHTML = `<strong>${name}</strong><br>${desc}`;
                        infoBox.style.display = 'block';
                        clearTimeout(window.infoHideTimeout);
                        window.infoHideTimeout = setTimeout(() => {
                            infoBox.style.display = 'none';
                        }, 10000);
                    }
                });
                entities.push(polyEntity);
            }
        });
        return entities;
    },
    // Convert geographic coordinates to local Cartesian offsets (meters)
    _geoToLocal: function(lat, lon, alt, refLat, refLon, refAlt) {
        const R = 6378137; // Earth’s radius in meters
        // Convert degrees to radians
        const latRad = lat * Math.PI / 180;
        const lonRad = lon * Math.PI / 180;
        const refLatRad = refLat * Math.PI / 180;
        const refLonRad = refLon * Math.PI / 180;
        // Calculate differences
        const x = R * (lonRad - refLonRad) * Math.cos(refLatRad);
        const y = alt - refAlt;
        const z = R * (latRad - refLatRad);
        return { x: x, y: y, z: z };
    }
};
