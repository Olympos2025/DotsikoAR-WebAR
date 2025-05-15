function parseKML(text) {
    // Remove namespace to simplify querying
    text = text.replace(/xmlns="[^"]*"/g, '');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');
    const data = { points: [], lines: [], polygons: [] };
    const placemarks = xmlDoc.getElementsByTagName('Placemark');
    for (let i = 0; i < placemarks.length; i++) {
        const pm = placemarks[i];
        const pointEl = pm.getElementsByTagName('Point')[0];
        const lineEl = pm.getElementsByTagName('LineString')[0];
        const polyEl = pm.getElementsByTagName('Polygon')[0];
        if (pointEl) {
            const coordsText = pointEl.getElementsByTagName('coordinates')[0].textContent.trim();
            if (coordsText) {
                // KML coordinates format: lon,lat,alt
                const parts = coordsText.split(/\s+/);
                // Usually only one coordinate for a point
                const coord = parts[0].split(',');
                const lon = parseFloat(coord[0]) || 0;
                const lat = parseFloat(coord[1]) || 0;
                // alt could be coord[2], but we ignore altitude (ground level)
                data.points.push({ latitude: lat, longitude: lon });
            }
        } else if (lineEl) {
            const coordsText = lineEl.getElementsByTagName('coordinates')[0].textContent.trim();
            if (coordsText) {
                const parts = coordsText.split(/\s+/);
                const coordsArr = [];
                for (let j = 0; j < parts.length; j++) {
                    if (!parts[j]) continue;
                    const vals = parts[j].split(',');
                    if (vals.length < 2) continue;
                    const lon = parseFloat(vals[0]) || 0;
                    const lat = parseFloat(vals[1]) || 0;
                    coordsArr.push({ latitude: lat, longitude: lon });
                }
                if (coordsArr.length > 0) {
                    data.lines.push(coordsArr);
                }
            }
        } else if (polyEl) {
            // Only using outer boundary for polygon
            const coordsText = polyEl.getElementsByTagName('coordinates')[0].textContent.trim();
            if (coordsText) {
                const parts = coordsText.split(/\s+/);
                let coordsArr = [];
                for (let j = 0; j < parts.length; j++) {
                    if (!parts[j]) continue;
                    const vals = parts[j].split(',');
                    if (vals.length < 2) continue;
                    const lon = parseFloat(vals[0]) || 0;
                    const lat = parseFloat(vals[1]) || 0;
                    coordsArr.push({ latitude: lat, longitude: lon });
                }
                // Remove duplicate last point if same as first
                if (coordsArr.length > 1) {
                    const first = coordsArr[0];
                    const last = coordsArr[coordsArr.length - 1];
                    if (Math.abs(first.latitude - last.latitude) < 1e-9 &&
                        Math.abs(first.longitude - last.longitude) < 1e-9) {
                        coordsArr.pop();
                    }
                }
                if (coordsArr.length > 0) {
                    data.polygons.push(coordsArr);
                }
            }
        }
    }
    return data;
}
