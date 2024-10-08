const nasa_eonet_endpoint = "https://eonet.gsfc.nasa.gov/api/v3";
const geoCodingUrl  = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
let markers = [];
let markerList = [];
let geoData = [];
let event_title;
const sourcesList = ["AVO", "CALFIRE", "USGS_EHP", "NASA_DISP", "NATICE"];
let mapbox_accesstoken = 'pk.eyJ1IjoicGFyaXNyaSIsImEiOiJja2ppNXpmaHUxNmIwMnpsbzd5YzczM2Q1In0.8VJaqwqZ_zh8qyeAuqWQgw';
mapboxgl.accessToken = mapbox_accesstoken;

let map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    zoom: 1,
    projection: 'equirectangular'
});

let event_link = '';

let geojson = {
    'type': 'FeatureCollection',
};

document.addEventListener("DOMContentLoaded", function() {
    fetchEvents();
    fetch(nasa_eonet_endpoint + "/categories")
    .then(response => response.json())
    .then(data => {
        document.getElementById("eventTitle").innerHTML = null;
        let eventList = '';
        data.categories.forEach(event => {
            if (["Volcanoes", "Wildfires", "Sea and Lake Ice"].includes(event.title)) {
                eventList += `
                    <li class="event">
                        <div class='event-desc'>
                        <h3><a href='#' onclick='showLayers("${event.title}", "${event.link}");'>${event.title}</a></h3>
                        <p>${event.description}</p>
                        <img src="assets/img/${event.title.toLowerCase().replace(/ /g, '_')}.png" alt="${event.title}">
                        </div>
                    </li>
                `;
            }
        });
        document.getElementById("eventList").innerHTML = eventList;
    });
});

function fetchEvents() {
    document.getElementById("eventTitle").innerHTML = null;
    document.getElementById("eventSelect").style.display = 'block';
    document.getElementById("layerSelect").style.display = 'none';
    document.getElementById("map").style.display = 'none';
    document.getElementById("startDate").value = null;
    document.getElementById("endDate").value = null;
}

function searchByDate() {
    let startDate = document.getElementById('startDate').value;
    let endDate = document.getElementById('endDate').value;
    let limit = document.getElementById('limit').value;
    showLayers(event_title, event_link, startDate, endDate, limit);
}

function showLayers(title, link, startDate, endDate, limit = 10) {
    if(link) {
        event_link = link;
    }
    if(title) {
        event_title = title;
    }
    document.getElementById("eventTitle").innerHTML = ' > ' + event_title;
    let queryParams = { source: sourcesList.join(','), limit: limit };
    geoData = [];
    markers = [];
    if(startDate && endDate) {
        queryParams['start'] = startDate;
    }
    if(endDate) {
        queryParams['end'] = endDate;
    }
    document.getElementById("eventSelect").style.display = 'none';
    document.getElementById("layerSelect").style.display = 'block';
    document.getElementById("map").style.display = 'block';
    
    fetch(event_link + '?' + new URLSearchParams(queryParams))
    .then(response => response.json())
    .then(linkData => {
        let categoryData = '';
        linkData.events.forEach(layerItem => {
            var location = layerItem.geometry[0].coordinates;
            geoData.push({ coordinates: location, title: layerItem.title, url: layerItem.sources[0].url });
            categoryData += `<dd><a href='#' onclick='showMap(${location});'>${layerItem.title}</a></dd>`;
        });
        document.getElementById("layerList").innerHTML = categoryData;
        displayMap();
    });
}

function showMap(lat, lng) {
    let marker = markers.find(e => JSON.stringify(e.geometry.coordinates) === JSON.stringify([lat, lng]));
    if (marker) {
        const popup = new mapboxgl.Popup({ offset: 25 })
            .setLngLat(marker.geometry.coordinates)
            .setHTML(`<h5>${marker.properties.message}</h5><a href='${marker.properties.url}' target='_blank'>${marker.properties.url}</a>`)
            .addTo(map);
    }
}

async function displayMap() {
    markerList.forEach(marker => marker.remove());
    geoData.forEach(geoPt => {
        let markerData = {
            type: 'Feature',
            properties: {
                message: geoPt.title,
                url: geoPt.url
            },
            geometry: {
                type: 'Point',
                coordinates: geoPt.coordinates
            }
        };
        markers.push(markerData);
        geojson.features = markers;
        let markerElement = new mapboxgl.Marker().setLngLat(geoPt.coordinates);
        markerElement.getElement().addEventListener('click', () => {
            fetch(`${geoCodingUrl}/${geoPt.coordinates[0]},${geoPt.coordinates[1]}.json?access_token=${mapbox_accesstoken}`)
            .then(response => response.json())
            .then(data => {
                let placeName = data.features[0]?.place_name || '';
                const popupContent = `
                    <div>
                        <h5>${geoPt.title}</h5>
                        <h6>${placeName}</h6>
                        <a href='${geoPt.url}' target='_blank'>${geoPt.url}</a>
                    </div>`;
                new mapboxgl.Popup({ offset: 25 })
                    .setLngLat(geoPt.coordinates)
                    .setHTML(popupContent)
                    .addTo(map);
            });
        });
        markerElement.addTo(map);
        markerList.push(markerElement);
    });
}
