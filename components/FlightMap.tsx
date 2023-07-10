"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import axios, { AxiosResponse } from "axios";
import debounce from "lodash.debounce";

type Flight = [
  string,
  string,
  string,
  number,
  number,
  number,
  number,
  number,
  boolean,
  number,
  number,
  number,
  number[],
  number,
  string,
  boolean,
  number,
  number
];

type FlightResponse = {
  time: number;
  states: Flight[];
};

type Props = {
  setQuotaExceeded: React.Dispatch<React.SetStateAction<boolean>>;
};

const FlightMap = (props: Props) => {
  const [map, setMap] = useState<L.Map>();
  const [markerClusterGroup, setMarkerClusterGroup] =
    useState<L.MarkerClusterGroup>();
  const [previousZoom, setPreviousZoom] = useState(0);

  const debouncedHandleMapMove = debounce(handleMapMove, 1000);

  async function initMap() {
    if (map) return;

    let myMap = L.map("map").setView([51.505, -0.09], 5);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 10,
      minZoom: 5,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(myMap as L.Map);

    const markers = L.markerClusterGroup().addTo(myMap);

    setMap(myMap);
    setMarkerClusterGroup(markers);

    const initialBounds = myMap.getBounds();
    await fetchAllFlights(initialBounds, markers);
  }

  async function fetchAllFlights(
    bounds: L.LatLngBounds,
    markerGroup: L.MarkerClusterGroup
  ) {
    try {
      let response: AxiosResponse<FlightResponse> = await axios.get(
        `https://opensky-network.org/api/states/all`,
        {
          params: {
            lamin: bounds.getSouth(),
            lomin: bounds.getWest(),
            lamax: bounds.getNorth(),
            lomax: bounds.getEast(),
          },
          auth: {
            username: process.env.NEXT_PUBLIC_OPENSKY_USERNAME || "",
            password: process.env.NEXT_PUBLIC_OPENSKY_PASSWORD || "",
          },
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
      const { states } = response.data;
      props.setQuotaExceeded(false);

      if (markerGroup) {
        markerGroup.clearLayers();

        const newMarkers: L.Marker[] = [];

        states.forEach((flight) => {
          if (!flight[5] || !flight[6]) return;

          const planeSvg = `
            <svg height="16px" width="16px" style="transform: rotate(${flight[10]}deg)" version="1.1" id="_x32_" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xml:space="preserve">
              <style type="text/css">
                .st0{fill:#000000;}
              </style>
              <g>
                <path class="st0" d="M511.06,286.261c-0.387-10.849-7.42-20.615-18.226-25.356l-193.947-74.094   C298.658,78.15,285.367,3.228,256.001,3.228c-29.366,0-42.657,74.922-42.885,183.583L19.167,260.904   C8.345,265.646,1.33,275.412,0.941,286.261L0.008,311.97c-0.142,3.886,1.657,7.623,4.917,10.188   c3.261,2.564,7.597,3.684,11.845,3.049c0,0,151.678-22.359,198.037-29.559c1.85,82.016,4.019,127.626,4.019,127.626l-51.312,24.166   c-6.046,2.38-10.012,8.206-10.012,14.701v9.465c0,4.346,1.781,8.505,4.954,11.493c3.155,2.987,7.403,4.539,11.74,4.292l64.83-3.667   c2.08,14.436,8.884,25.048,16.975,25.048c8.091,0,14.877-10.612,16.975-25.048l64.832,3.667c4.336,0.246,8.584-1.305,11.738-4.292   c3.174-2.988,4.954-7.148,4.954-11.493v-9.465c0-6.495-3.966-12.321-10.012-14.701l-51.329-24.166c0,0,2.186-45.61,4.037-127.626   c46.358,7.2,198.036,29.559,198.036,29.559c4.248,0.635,8.602-0.485,11.845-3.049c3.261-2.565,5.041-6.302,4.918-10.188   L511.06,286.261z"/>
              </g>
            </svg>
          `;

          const markerIcon = L.divIcon({
            html: planeSvg,
            className: "marker-icon",
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });

          const marker = L.marker([flight[6], flight[5]], {
            icon: markerIcon,
          });

          const popupContent = `
          <strong>Flight:</strong> ${flight[0]}<br>
          <strong>Origin:</strong> ${flight[2]}<br>
          <strong>Destination:</strong> ${flight[1]}<br>
          <strong>Altitude:</strong> ${flight[7]} ft<br>
          <strong>Speed:</strong> ${flight[9]} m/s
        `;

          marker.bindPopup(popupContent);

          newMarkers.push(marker);
        });

        markerGroup.addLayers(newMarkers);
      }
    } catch (e: any) {
      if (e.response?.status === 429) {
        props.setQuotaExceeded(true);
      } else {
        throw e;
      }
    }
  }

  async function handleMapMove() {
    if (!map) throw Error("Map not initialized");

    const bounds = map.getBounds();
    const currentZoom = map.getZoom();

    // Check if the zoom level has changed
    if (currentZoom !== previousZoom) {
      setPreviousZoom(currentZoom);

      await fetchAllFlights(bounds, markerClusterGroup as L.MarkerClusterGroup);
    }
  }

  useEffect(() => {
    initMap();
  });

  useEffect(() => {
    if (!map) return;
    map.on("moveend", debouncedHandleMapMove);
  }, [map, debouncedHandleMapMove]);

  return <div className="min-h-screen" id="map"></div>;
};

export default FlightMap;
