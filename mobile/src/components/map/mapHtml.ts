/**
 * Static HTML/JS payload for the MapLibre WebView bridge (see MapLibreView.tsx).
 * Uses the exact same free style and tile source as the web app --
 * https://tiles.openfreemap.org/styles/liberty -- so the map looks the same
 * on both surfaces without needing any API key.
 *
 * Talks to React Native purely over postMessage:
 *  RN -> WebView: { type: "state", payload: MapState }
 *                 { type: "command", name: "zoomIn" | "zoomOut" }
 *  WebView -> RN: { type: "ready" }
 *                 { type: "mapClick", lng, lat }
 *                 { type: "markerClick", id }
 */
export const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link href="https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.min.css" rel="stylesheet" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.min.js"></script>
  <style>
    html, body { margin: 0; padding: 0; height: 100%; background: #f1f5f9; overflow: hidden; }
    #map-wrap { position: absolute; inset: 0; }
    #map { position: absolute; inset: 0; }
    body.dark #map { filter: invert(1) hue-rotate(180deg); }
    .najda-marker { display: flex; align-items: center; justify-content: center; cursor: pointer; }
    body.dark .najda-marker { filter: invert(1) hue-rotate(180deg); }
    .najda-marker-circle {
      display: flex; align-items: center; justify-content: center;
      border-radius: 999px; border: 2px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    }
    .najda-marker-pulse {
      position: absolute; border-radius: 999px; opacity: 0.35;
      animation: najda-pulse 1.6s ease-out infinite;
    }
    @keyframes najda-pulse {
      0% { transform: scale(0.6); opacity: 0.45; }
      100% { transform: scale(1.8); opacity: 0; }
    }
  </style>
</head>
<body>
  <div id="map-wrap"><div id="map"></div></div>
  <script>
    function post(msg) {
      var data = JSON.stringify(msg);
      if (window.ReactNativeWebView) {
        // Running inside react-native-webview (iOS/Android).
        window.ReactNativeWebView.postMessage(data);
      } else if (window.parent && window.parent !== window) {
        // Running inside an <iframe> (web platform -- react-native-webview
        // has no web support at all, so MapLibreView swaps to an iframe there).
        window.parent.postMessage(data, "*");
      }
    }

    var map = new maplibregl.Map({
      container: "map",
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [31.2357, 30.0444],
      zoom: 12,
      attributionControl: false,
    });

    var markerInstances = {};
    var ready = false;
    var pendingState = null;

    map.on("load", function () {
      ready = true;
      post({ type: "ready" });
      if (pendingState) { applyContent(pendingState); pendingState = null; }
    });

    map.on("click", function (e) {
      post({ type: "mapClick", lng: e.lngLat.lng, lat: e.lngLat.lat });
    });

    function pinSvg(color) {
      return '<svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 7 12 8 12s8-6.75 8-12c0-4.42-3.58-8-8-8z" fill="white"/>' +
        '<circle cx="12" cy="10" r="3" fill="' + color + '"/></svg>';
    }

    function buildMarkerEl(m) {
      var wrap = document.createElement("div");
      wrap.className = "najda-marker";
      wrap.style.position = "relative";
      var size = m.size || 32;

      if (m.pulse) {
        var pulse = document.createElement("div");
        pulse.className = "najda-marker-pulse";
        pulse.style.width = size + "px";
        pulse.style.height = size + "px";
        pulse.style.background = m.color;
        wrap.appendChild(pulse);
      }

      var circle = document.createElement("div");
      circle.className = "najda-marker-circle";
      circle.style.width = size + "px";
      circle.style.height = size + "px";
      circle.style.background = m.color;
      if (m.iconType === "pin") {
        circle.innerHTML = pinSvg(m.color);
      } else if (m.label) {
        circle.innerHTML = '<span style="color:white;font-weight:700;font-size:' + Math.round(size * 0.4) + 'px;">' + m.label + "</span>";
      }
      wrap.appendChild(circle);

      wrap.addEventListener("click", function (ev) {
        ev.stopPropagation();
        post({ type: "markerClick", id: m.id });
      });
      return wrap;
    }

    function syncMarkers(markers) {
      var next = {};
      (markers || []).forEach(function (m) { next[m.id] = m; });

      Object.keys(markerInstances).forEach(function (id) {
        if (!next[id]) { markerInstances[id].remove(); delete markerInstances[id]; }
      });

      Object.keys(next).forEach(function (id) {
        var m = next[id];
        var existing = markerInstances[id];
        if (existing && existing.__signature === JSON.stringify(m)) {
          existing.setLngLat([m.lng, m.lat]);
          return;
        }
        if (existing) { existing.remove(); }
        var el = buildMarkerEl(m);
        var marker = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([m.lng, m.lat]).addTo(map);
        marker.__signature = JSON.stringify(m);
        markerInstances[id] = marker;
      });
    }

    function syncRoute(route) {
      var source = map.getSource("najda-route");
      if (!route) {
        if (source) { map.removeLayer("najda-route-line"); map.removeSource("najda-route"); }
        return;
      }
      var data = { type: "Feature", geometry: { type: "LineString", coordinates: route.coordinates }, properties: {} };
      if (source) {
        source.setData(data);
        map.setPaintProperty("najda-route-line", "line-color", route.color || "#2563eb");
        map.setPaintProperty("najda-route-line", "line-dasharray", route.dashed ? [2, 2] : [1, 0]);
      } else {
        map.addSource("najda-route", { type: "geojson", data: data });
        map.addLayer({
          id: "najda-route-line",
          type: "line",
          source: "najda-route",
          paint: {
            "line-color": route.color || "#2563eb",
            "line-width": route.width || 4,
            "line-opacity": 0.85,
            "line-dasharray": route.dashed ? [2, 2] : [1, 0],
          },
        });
      }
    }

    function applyContent(payload) {
      if (!ready) { pendingState = payload; return; }
      document.body.classList.toggle("dark", !!payload.dark);
      syncMarkers(payload.markers);
      syncRoute(payload.route);
    }

    function handleMessage(e) {
      try {
        var msg = JSON.parse(e.data);
        if (msg.type === "init") {
          map.jumpTo({ center: [msg.center.lng, msg.center.lat], zoom: msg.zoom });
        } else if (msg.type === "content") {
          applyContent(msg.payload);
        } else if (msg.type === "flyTo") {
          map.flyTo({ center: [msg.lng, msg.lat], zoom: msg.zoom, duration: msg.duration || 1500 });
        } else if (msg.type === "command") {
          if (msg.name === "zoomIn") map.zoomIn();
          else if (msg.name === "zoomOut") map.zoomOut();
        }
      } catch (err) {}
    }

    document.addEventListener("message", handleMessage);
    window.addEventListener("message", handleMessage);
  </script>
</body>
</html>`;
