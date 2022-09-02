export const displayMap = locations => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoiZGRvd2wiLCJhIjoiY2w3NHVub3lpMWx5NzN2bXEzczU1ZnZqMiJ9.8VpUz-_o9VouKedols6n1A';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/ddowl/cl77h3dpk000215k1vakf6xt4',
    // center: [-118.113491, 34.111745],
    // zoom: 6,
    // interactive: false,
    scrollZoom: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach(loc => {
    // Create marker
    const el = document.createElement('div');
    el.className = 'marker';

    // Add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom' /* anchor: 坐标位于图形的底部 */,
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // Add popup
    const popup = new mapboxgl.Popup({ offset: 30 })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
