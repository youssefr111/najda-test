import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Platform, View, type StyleProp, type ViewStyle } from "react-native";
import { useColorScheme } from "nativewind";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { MAP_HTML } from "./mapHtml";

export type MapMarker = {
  id: string;
  lng: number;
  lat: number;
  color: string;
  size?: number;
  iconType?: "pin" | "dot";
  label?: string;
  pulse?: boolean;
};

export type MapRoute = {
  coordinates: [number, number][];
  color?: string;
  width?: number;
  dashed?: boolean;
} | null;

export type MapLibreViewHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  flyTo: (lng: number, lat: number, zoom?: number) => void;
};

type Props = {
  /** Only used once, to place the initial camera -- matches the web app's uncontrolled-after-mount map. */
  initialCenter: { lng: number; lat: number };
  initialZoom?: number;
  markers?: MapMarker[];
  route?: MapRoute;
  onMapPress?: (coords: { lng: number; lat: number }) => void;
  onMarkerPress?: (id: string) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * A browser-based host for MapLibre GL JS, loaded from the same free style
 * the web app uses (https://tiles.openfreemap.org/styles/liberty) -- so the
 * map looks and behaves close to identically on both surfaces, no API key.
 *
 * `react-native-webview` has no web support at all (it renders an
 * "unsupported platform" message there), so on Platform.OS === "web" this
 * swaps to a plain <iframe> instead, using the exact same HTML payload and
 * postMessage protocol -- see mapHtml.ts's post()/handleMessage(), which
 * were written to work with either bridge.
 */
export const MapLibreView = forwardRef<MapLibreViewHandle, Props>(function MapLibreView(
  { initialCenter, initialZoom = 12, markers = [], route = null, onMapPress, onMarkerPress, style },
  ref
) {
  const webviewRef = useRef<WebView>(null);
  const iframeRef = useRef<{ contentWindow?: { postMessage: (data: string, target: string) => void } } | null>(null);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const readyRef = useRef(false);
  const pendingContentRef = useRef<object | null>(null);

  function post(message: object) {
    const data = JSON.stringify(message);
    if (Platform.OS === "web") {
      iframeRef.current?.contentWindow?.postMessage(data, "*");
    } else {
      webviewRef.current?.postMessage(data);
    }
  }

  function sendContent() {
    const payload = { markers, route, dark: isDark };
    if (readyRef.current) post({ type: "content", payload });
    else pendingContentRef.current = payload;
  }

  useEffect(sendContent, [JSON.stringify(markers), JSON.stringify(route), isDark]);

  useImperativeHandle(ref, () => ({
    zoomIn: () => post({ type: "command", name: "zoomIn" }),
    zoomOut: () => post({ type: "command", name: "zoomOut" }),
    flyTo: (lng, lat, zoom = 17) => post({ type: "flyTo", lng, lat, zoom }),
  }));

  function handleReadyOrEvent(msg: { type: string; lng?: number; lat?: number; id?: string }) {
    if (msg.type === "ready") {
      readyRef.current = true;
      post({ type: "init", center: initialCenter, zoom: initialZoom });
      if (pendingContentRef.current) {
        post({ type: "content", payload: pendingContentRef.current });
        pendingContentRef.current = null;
      } else {
        sendContent();
      }
    } else if (msg.type === "mapClick" && msg.lng != null && msg.lat != null) {
      onMapPress?.({ lng: msg.lng, lat: msg.lat });
    } else if (msg.type === "markerClick" && msg.id) {
      onMarkerPress?.(msg.id);
    }
  }

  // Web: listen for messages posted back from the iframe. Uses globalThis
  // rather than the bare `window`/`MessageEvent` types so this compiles
  // regardless of whether the project's tsconfig includes DOM lib types --
  // this whole branch only ever runs when Platform.OS === "web".
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const win = globalThis as unknown as {
      addEventListener: (type: string, listener: (event: { source: unknown; data: string }) => void) => void;
      removeEventListener: (type: string, listener: (event: { source: unknown; data: string }) => void) => void;
    };
    function onWindowMessage(event: { source: unknown; data: string }) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      try {
        handleReadyOrEvent(JSON.parse(event.data));
      } catch {
        // ignore malformed bridge messages
      }
    }
    win.addEventListener("message", onWindowMessage);
    return () => win.removeEventListener("message", onWindowMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleWebViewMessage(event: WebViewMessageEvent) {
    try {
      handleReadyOrEvent(JSON.parse(event.nativeEvent.data));
    } catch {
      // ignore malformed bridge messages
    }
  }

  if (Platform.OS === "web") {
    // React Native's JSX types don't know about <iframe> -- this is a
    // deliberate, contained escape hatch for the one web-only code path.
    // At runtime it's just React.createElement("iframe", ...), a normal DOM node.
    const iframeProps: Record<string, unknown> = {
      ref: iframeRef,
      srcDoc: MAP_HTML,
      style: { flex: 1, width: "100%", height: "100%", border: "none" },
    };
    return <View style={style}>{React.createElement("iframe", iframeProps)}</View>;
  }

  return (
    <View style={style}>
      <WebView
        ref={webviewRef}
        source={{ html: MAP_HTML }}
        onMessage={handleWebViewMessage}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        style={{ flex: 1, backgroundColor: "transparent" }}
      />
    </View>
  );
});
