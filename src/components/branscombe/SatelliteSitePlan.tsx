"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Map as MapboxMap,
  Source,
  Layer,
  type MapRef,
  type MapMouseEvent,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

import { HOUSE_TYPE_INFO, type HouseType } from "@/data/branscombe";
import geojsonData from "@/data/branscombe/geojson.json";
import voronoiGeo from "@/data/branscombe/voronoi-wgs84.json";

interface AllocationLite {
  unit_number: number;
  allocated_to: string | null;
}

interface Props {
  selectedUnits: string[];
  counts: Record<string, number>;
  /** Indexed by unit_number — only units with allocated_to set are reserved. */
  allocations?: Record<number, AllocationLite>;
  hoveredUnit: string | null;
  setHoveredUnit: (id: string | null) => void;
  onToggleUnit: (id: string) => void;
  /** Show indicative Voronoi-derived lot boundaries. Off by default. */
  showInferredLots?: boolean;
}

type FeatureCollection = {
  type: "FeatureCollection";
  bounds: {
    south: number;
    west: number;
    north: number;
    east: number;
    centre: [number, number];
  };
  transform: {
    rmsResidualM: number;
    scale: number;
    rotationDeg: number;
    mirror: boolean;
  };
  features: Array<{
    type: "Feature";
    id: string;
    geometry:
      | { type: "Polygon"; coordinates: number[][][] }
      | { type: "LineString"; coordinates: number[][] };
    properties: {
      kind: "lot" | "subjectArea" | "pos" | "deck" | "road" | "kerb";
      unitId?: string;
      unitNumber?: number;
      homeType?: HouseType;
      areaM2?: number;
      label?: string;
    };
  }>;
};

const GEOJSON = geojsonData as unknown as FeatureCollection;
const VORONOI_GEO = voronoiGeo as unknown as {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id: string;
    geometry: { type: "Polygon"; coordinates: number[][][] };
    properties: { unitId: string; unitNumber: number; inferredLotAreaM2: number };
  }>;
};
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

function enrichGeoJSON(
  fc: FeatureCollection,
  selected: Set<string>,
  counts: Record<string, number>,
  reserved: Set<string>,
): FeatureCollection {
  return {
    ...fc,
    features: fc.features.map((f) => {
      const props: Record<string, unknown> = { ...f.properties };
      if (f.properties.kind === "lot" && f.properties.unitId) {
        const id = f.properties.unitId;
        const type = f.properties.homeType;
        const info = type ? HOUSE_TYPE_INFO[type] : null;
        props.typeColor = info?.color || "#00B5AD";
        props.typeBorder = info?.border || "#1A2744";
        props.isSelected = selected.has(id);
        props.isReserved = reserved.has(id);
        props.interestCount = counts[id] || 0;
      }
      return { ...f, properties: props as typeof f.properties };
    }),
  };
}

export default function SatelliteSitePlan({
  selectedUnits,
  counts,
  allocations = {},
  hoveredUnit,
  setHoveredUnit,
  onToggleUnit,
  showInferredLots = false,
}: Props) {
  const mapRef = useRef<MapRef>(null);
  const [styleLoaded, setStyleLoaded] = useState(false);

  const reservedSet = useMemo(() => {
    const s = new Set<string>();
    for (const [, a] of Object.entries(allocations)) {
      if (a.allocated_to) s.add(`U${a.unit_number}`);
    }
    return s;
  }, [allocations]);

  const data = useMemo(
    () => enrichGeoJSON(GEOJSON, new Set(selectedUnits), counts, reservedSet),
    [selectedUnits, counts, reservedSet],
  );

  // Fit bounds on first style load
  useEffect(() => {
    if (!styleLoaded || !mapRef.current) return;
    const b = GEOJSON.bounds;
    if (!b) return;
    mapRef.current.fitBounds(
      [
        [b.west, b.south],
        [b.east, b.north],
      ],
      { padding: 32, duration: 0 },
    );
  }, [styleLoaded]);

  if (!TOKEN) {
    return (
      <div className="bg-amber-50 border border-amber-300 px-4 py-6 text-amber-900 font-archivo text-sm">
        <strong>Satellite view unavailable.</strong> NEXT_PUBLIC_MAPBOX_TOKEN
        is not set. Add a Mapbox public token to the environment to enable this
        view.
      </div>
    );
  }

  const onMapMouseMove = (e: MapMouseEvent) => {
    const map = mapRef.current?.getMap();
    if (!map || !styleLoaded || !map.getLayer("homes-fill")) return;
    const features = map.queryRenderedFeatures(e.point, {
      layers: ["homes-fill"],
    });
    const top = features[0]?.properties?.unitId as string | undefined;
    if (top !== hoveredUnit) setHoveredUnit(top || null);
    map.getCanvas().style.cursor = top ? "pointer" : "";
  };

  const onMapClick = (e: MapMouseEvent) => {
    const map = mapRef.current?.getMap();
    if (!map || !styleLoaded || !map.getLayer("homes-fill")) return;
    const features = map.queryRenderedFeatures(e.point, {
      layers: ["homes-fill"],
    });
    const top = features[0]?.properties as
      | { unitId?: string; isReserved?: boolean }
      | undefined;
    if (top?.unitId && !top.isReserved) {
      onToggleUnit(top.unitId);
    }
  };

  return (
    <div className="relative w-full bg-[#0F1419] border border-black/10 overflow-hidden">
      <div style={{ width: "100%", height: 600 }}>
        <MapboxMap
          ref={mapRef}
          mapboxAccessToken={TOKEN}
          initialViewState={{
            longitude: GEOJSON.bounds?.centre?.[0] ?? 147.2393,
            latitude: GEOJSON.bounds?.centre?.[1] ?? -42.7953,
            zoom: 18,
          }}
          mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
          onLoad={() => setStyleLoaded(true)}
          onMouseMove={onMapMouseMove}
          onClick={onMapClick}
          interactiveLayerIds={["homes-fill"]}
        >
          {/* Indicative Voronoi-inferred lot boundaries (toggleable) —
              white halo + bright orange dashed for high contrast */}
          {showInferredLots && (
            <Source id="branscombe-voronoi" type="geojson" data={VORONOI_GEO}>
              <Layer
                id="voronoi-halo"
                type="line"
                paint={{
                  "line-color": "#FFFFFF",
                  "line-width": 3.5,
                  "line-opacity": 0.7,
                }}
              />
              <Layer
                id="voronoi-outline"
                type="line"
                paint={{
                  "line-color": "#F97316",
                  "line-width": 1.8,
                  "line-dasharray": [3, 2],
                  "line-opacity": 1,
                }}
              />
            </Source>
          )}

          <Source id="branscombe" type="geojson" data={data}>
            {/* POS green fill (bottom) */}
            <Layer
              id="pos-fill"
              type="fill"
              filter={["==", ["get", "kind"], "pos"]}
              paint={{
                "fill-color": "#6FAD3F",
                "fill-opacity": 0.45,
              }}
            />
            <Layer
              id="pos-outline"
              type="line"
              filter={["==", ["get", "kind"], "pos"]}
              paint={{
                "line-color": "#FFFFFF",
                "line-width": 1.5,
                "line-opacity": 0.7,
              }}
            />

            {/* Deck fill — sits under home outlines */}
            <Layer
              id="decks-fill"
              type="fill"
              filter={["==", ["get", "kind"], "deck"]}
              paint={{
                "fill-color": "#D6BD96",
                "fill-opacity": 0.6,
              }}
            />

            {/* Roads — wide white halo under bright teal centerline */}
            <Layer
              id="roads-halo"
              type="line"
              filter={["==", ["get", "kind"], "road"]}
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{
                "line-color": "#FFFFFF",
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  16,
                  3,
                  18,
                  7,
                  20,
                  10,
                ],
                "line-opacity": 0.9,
              }}
            />
            <Layer
              id="roads-fill"
              type="line"
              filter={["==", ["get", "kind"], "road"]}
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{
                "line-color": "#00E5DC",
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  16,
                  1.5,
                  18,
                  4,
                  20,
                  7,
                ],
                "line-opacity": 0.95,
              }}
            />

            {/* Kerbs — thin bright white edges marking the carriageway */}
            <Layer
              id="kerbs"
              type="line"
              filter={["==", ["get", "kind"], "kerb"]}
              paint={{
                "line-color": "#FFFFFF",
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  16,
                  0.4,
                  18,
                  0.8,
                  20,
                  1.2,
                ],
                "line-opacity": 0.7,
              }}
            />

            {/* Site boundary — heavy navy line, drawn on top of roads so it
                always reads as the primary parcel outline */}
            <Layer
              id="site-boundary-halo"
              type="line"
              filter={["==", ["get", "kind"], "subjectArea"]}
              paint={{
                "line-color": "#FFFFFF",
                "line-width": 5,
                "line-opacity": 0.85,
              }}
            />
            <Layer
              id="site-boundary"
              type="line"
              filter={["==", ["get", "kind"], "subjectArea"]}
              paint={{
                "line-color": "#1A2744",
                "line-width": 2.5,
                "line-opacity": 1,
              }}
            />

            {/* Home footprints — fill coloured by status, fallback to type colour */}
            <Layer
              id="homes-fill"
              type="fill"
              filter={["==", ["get", "kind"], "lot"]}
              paint={{
                "fill-color": [
                  "case",
                  ["==", ["get", "isSelected"], true],
                  "#1A2744",
                  ["==", ["get", "isReserved"], true],
                  "#64748B",
                  [">=", ["coalesce", ["get", "interestCount"], 0], 3],
                  "#E85D4A",
                  ["==", ["coalesce", ["get", "interestCount"], 0], 2],
                  "#C8A951",
                  ["==", ["coalesce", ["get", "interestCount"], 0], 1],
                  "#E8A537",
                  ["coalesce", ["get", "typeColor"], "#00B5AD"],
                ],
                "fill-opacity": [
                  "case",
                  ["==", ["get", "isSelected"], true],
                  0.92,
                  ["==", ["get", "isReserved"], true],
                  0.88,
                  0.85,
                ],
              }}
            />
            {/* Home outline — wide white halo + bright contrasting line */}
            <Layer
              id="homes-outline-halo"
              type="line"
              filter={["==", ["get", "kind"], "lot"]}
              paint={{
                "line-color": "#FFFFFF",
                "line-width": [
                  "case",
                  ["==", ["get", "isSelected"], true],
                  4,
                  ["==", ["get", "unitId"], hoveredUnit ?? ""],
                  3.5,
                  2,
                ],
                "line-opacity": 0.9,
              }}
            />
            <Layer
              id="homes-outline"
              type="line"
              filter={["==", ["get", "kind"], "lot"]}
              paint={{
                "line-color": [
                  "case",
                  ["==", ["get", "isSelected"], true],
                  "#00E5DC",
                  ["==", ["get", "isReserved"], true],
                  "#1E293B",
                  ["coalesce", ["get", "typeBorder"], "#1A2744"],
                ],
                "line-width": [
                  "case",
                  ["==", ["get", "isSelected"], true],
                  2.5,
                  ["==", ["get", "unitId"], hoveredUnit ?? ""],
                  2,
                  1.4,
                ],
              }}
            />

            {/* Unit number labels */}
            <Layer
              id="homes-label"
              type="symbol"
              filter={["==", ["get", "kind"], "lot"]}
              layout={{
                "text-field": ["to-string", ["get", "unitNumber"]],
                "text-size": 11,
                "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
                "text-allow-overlap": false,
              }}
              paint={{
                "text-color": [
                  "case",
                  ["==", ["get", "isSelected"], true],
                  "#FFFFFF",
                  "#1A2744",
                ],
                "text-halo-color": "#FFFFFF",
                "text-halo-width": 1.2,
                "text-halo-blur": 0.4,
              }}
              minzoom={16}
            />
          </Source>
        </MapboxMap>
      </div>

      {/* Caption */}
      <div className="absolute bottom-2 right-3 text-[10px] font-archivo text-white/80 bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
        Unison 20E92-03 · Cadastral fit ±{GEOJSON.transform?.rmsResidualM ?? "?"}m · © Mapbox
      </div>
    </div>
  );
}
