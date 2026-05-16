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

import {
  LOTS,
  STAGE_INFO,
  type LotStage,
} from "@/data/seafields";
import type { PublicLotRow } from "@/app/api/seafields/allocations/route";
import geojsonData from "@/data/seafields/geojson.json";

interface Props {
  selectedLots: string[];
  counts: Record<string, number>;
  publicLots: Record<number, PublicLotRow>;
  hoveredLot: string | null;
  setHoveredLot: (id: string | null) => void;
  onOpenLot: (id: string) => void;
}

function isReservedStatus(status: string | undefined | null): boolean {
  return status === "reserved" || status === "sold" || status === "withheld";
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
  features: Array<{
    type: "Feature";
    id: string;
    geometry: { type: "Polygon"; coordinates: number[][][] };
    properties: {
      lotId?: string;
      lotNumber?: number;
      lotSuffix?: string;
      areaM2?: number;
      kind: "lot" | "heritage" | "pos" | "subjectArea";
      isAmended?: boolean;
      isHeritage?: boolean;
      isPendingRenumber?: boolean;
      label?: string;
    };
  }>;
};

const GEOJSON = geojsonData as unknown as FeatureCollection;
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Build per-feature display props (stage colour, status). Mapbox GL JS expects
// data-driven styling via expressions; we encode the per-lot stage colour as a
// feature property at runtime so the fill-color expression can read it.
function enrichGeoJSON(
  fc: FeatureCollection,
  selected: Set<string>,
  counts: Record<string, number>,
  publicLots: Record<number, PublicLotRow>,
): FeatureCollection {
  const lotById = new globalThis.Map(LOTS.map((l) => [l.id, l] as const));
  return {
    ...fc,
    features: fc.features.map((f) => {
      const props: Record<string, unknown> = { ...f.properties };
      if (f.properties.kind === "lot" && f.properties.lotId) {
        const lot = lotById.get(f.properties.lotId);
        if (lot && lot.stage) {
          const info = STAGE_INFO[lot.stage as Exclude<LotStage, null>];
          props.stageColor = info.color;
          props.stageBorder = info.border;
          props.stageLabel = info.label;
        }
        const row = lot ? publicLots[lot.lotNumber] : undefined;
        const count = counts[f.properties.lotId] || 0;
        props.isSelected = selected.has(f.properties.lotId);
        props.isReserved = !!row && isReservedStatus(row.status);
        props.isComingSoon =
          !!row && !row.is_open_for_registration && !props.isReserved;
        props.interestCount = count;
      }
      return { ...f, properties: props as typeof f.properties };
    }),
  };
}

export default function SatelliteSitePlan({
  selectedLots,
  counts,
  publicLots,
  hoveredLot,
  setHoveredLot,
  onOpenLot,
}: Props) {
  const mapRef = useRef<MapRef>(null);
  const [styleLoaded, setStyleLoaded] = useState(false);

  const data = useMemo(
    () => enrichGeoJSON(GEOJSON, new Set(selectedLots), counts, publicLots),
    [selectedLots, counts, publicLots],
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
    if (!map || !styleLoaded || !map.getLayer("lots-fill")) return;
    const features = map.queryRenderedFeatures(e.point, {
      layers: ["lots-fill"],
    });
    const top = features[0]?.properties?.lotId as string | undefined;
    if (top !== hoveredLot) setHoveredLot(top || null);
    map.getCanvas().style.cursor = top ? "pointer" : "";
  };

  const onMapClick = (e: MapMouseEvent) => {
    const map = mapRef.current?.getMap();
    if (!map || !styleLoaded || !map.getLayer("lots-fill")) return;
    const features = map.queryRenderedFeatures(e.point, {
      layers: ["lots-fill"],
    });
    const top = features[0]?.properties as
      | {
          lotId?: string;
          isHeritage?: boolean;
        }
      | undefined;
    if (top?.lotId && !top.isHeritage) {
      onOpenLot(top.lotId);
    }
  };

  return (
    <div className="relative w-full bg-[#0F1419] border border-black/10 overflow-hidden">
      <div style={{ width: "100%", height: 600 }}>
        <MapboxMap
          ref={mapRef}
          mapboxAccessToken={TOKEN}
          initialViewState={{
            longitude: GEOJSON.bounds?.centre?.[0] ?? 114.647,
            latitude: GEOJSON.bounds?.centre?.[1] ?? -28.71,
            zoom: 16,
          }}
          mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
          onLoad={() => setStyleLoaded(true)}
          onMouseMove={onMapMouseMove}
          onClick={onMapClick}
          interactiveLayerIds={["lots-fill"]}
        >
          <Source id="seafields" type="geojson" data={data}>
            {/* Subject area outline (background) */}
            <Layer
              id="subject-area"
              type="line"
              filter={["==", ["get", "kind"], "subjectArea"]}
              paint={{
                "line-color": "#FFFFFF",
                "line-width": 2,
                "line-opacity": 0.7,
              }}
            />

            {/* POS green fill */}
            <Layer
              id="pos-fill"
              type="fill"
              filter={["==", ["get", "kind"], "pos"]}
              paint={{
                "fill-color": "#6FAD3F",
                "fill-opacity": 0.4,
              }}
            />
            <Layer
              id="pos-outline"
              type="line"
              filter={["==", ["get", "kind"], "pos"]}
              paint={{
                "line-color": "#3D7A1A",
                "line-width": 1,
              }}
            />

            {/* Lot fills — coloured by stage */}
            <Layer
              id="lots-fill"
              type="fill"
              filter={["==", ["get", "kind"], "lot"]}
              paint={{
                "fill-color": [
                  "case",
                  ["==", ["get", "isSelected"], true],
                  "#1A2744",
                  ["==", ["get", "isReserved"], true],
                  "#64748B",
                  ["==", ["get", "isComingSoon"], true],
                  "#B4B4B4",
                  [">=", ["coalesce", ["get", "interestCount"], 0], 3],
                  "#E85D4A",
                  ["==", ["coalesce", ["get", "interestCount"], 0], 2],
                  "#C8A951",
                  ["==", ["coalesce", ["get", "interestCount"], 0], 1],
                  "#E8A537",
                  ["coalesce", ["get", "stageColor"], "#FFFFFF"],
                ],
                "fill-opacity": [
                  "case",
                  ["==", ["get", "isSelected"], true],
                  0.85,
                  ["==", ["get", "isComingSoon"], true],
                  0.35,
                  0.55,
                ],
              }}
            />
            <Layer
              id="lots-outline"
              type="line"
              filter={["==", ["get", "kind"], "lot"]}
              paint={{
                "line-color": [
                  "case",
                  ["==", ["get", "isSelected"], true],
                  "#FFFFFF",
                  ["coalesce", ["get", "stageBorder"], "#FFFFFF"],
                ],
                "line-width": [
                  "case",
                  ["==", ["get", "isSelected"], true],
                  2.5,
                  ["==", ["get", "lotId"], hoveredLot ?? ""],
                  2,
                  0.8,
                ],
              }}
            />

            {/* Heritage retention */}
            <Layer
              id="heritage-fill"
              type="fill"
              filter={["==", ["get", "kind"], "heritage"]}
              paint={{
                "fill-color": "#C7A877",
                "fill-opacity": 0.5,
              }}
            />
            <Layer
              id="heritage-outline"
              type="line"
              filter={["==", ["get", "kind"], "heritage"]}
              paint={{
                "line-color": "#8B6F1E",
                "line-width": 1.5,
                "line-dasharray": [2, 1.5],
              }}
            />

            {/* Lot number labels */}
            <Layer
              id="lots-label"
              type="symbol"
              filter={[
                "any",
                ["==", ["get", "kind"], "lot"],
                ["==", ["get", "kind"], "heritage"],
              ]}
              layout={{
                "text-field": [
                  "case",
                  ["has", "lotSuffix"],
                  ["concat", ["to-string", ["get", "lotNumber"]], ["get", "lotSuffix"]],
                  ["to-string", ["get", "lotNumber"]],
                ],
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
              minzoom={14}
            />
          </Source>
        </MapboxMap>
      </div>

      {/* Caption */}
      <div className="absolute bottom-2 right-3 text-[10px] font-archivo text-white/80 bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
        CLE 3027-08B · Satellite imagery © Mapbox
      </div>
    </div>
  );
}
