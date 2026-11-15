import { assetPath } from "@/lib/paths";
/** Editorial astronomy data. Rounded values retain their source's precision.
 * Scene dimensions and positions deliberately live outside this module.
 */
export type BodyId = "saturn" | "titan" | "enceladus" | "rhea" | "moon";

export interface Fact {
  label: string;
  value: string;
  /** An id in this body's sources array. */
  source: string;
}

export interface Source {
  id: string;
  title: string;
  url: string;
}

export interface CelestialBody {
  id: BodyId;
  name: string;
  type: string;
  subtitle: string;
  description: string;
  facts: readonly Fact[];
  sources: readonly Source[];
  texture: string;
  thumbnail?: string;
  accent: string;
}

export const bodyOrder: readonly BodyId[] = [
  "saturn",
  "titan",
  "enceladus",
  "rhea",
  "moon",
];

export const bodies: Record<BodyId, CelestialBody> = {
  saturn: {
    id: "saturn",
    name: "Saturn",
    type: "Gas giant",
    subtitle: "A world beyond the ordinary.",
    description:
      "A giant of hydrogen and helium, encircled by countless fragments of ice and rock. The sixth planet from the Sun holds an entire system of extraordinary worlds.",
    facts: [
      {
        label: "Equatorial diameter",
        value: "120,500 km",
        source: "nasa-saturn",
      },
      { label: "Length of day", value: "10.7 hours", source: "nasa-saturn" },
      {
        label: "Orbital period",
        value: "29.4 Earth years",
        source: "nasa-saturn",
      },
      {
        label: "Distance from Sun · average",
        value: "9.5 AU",
        source: "nasa-saturn",
      },
      { label: "Axial tilt", value: "26.73°", source: "nasa-saturn" },
      {
        label: "Cassini Division · width",
        value: "4,700 km",
        source: "nasa-saturn",
      },
    ],
    sources: [
      {
        id: "nasa-saturn",
        title: "NASA Science · Saturn facts",
        url: "https://science.nasa.gov/saturn/facts/",
      },
    ],
    texture: assetPath("/textures/saturn.jpg"),
    accent: "#d9bc8c",
  },
  titan: {
    id: "titan",
    name: "Titan",
    type: "Saturn’s largest moon",
    subtitle: "An atmosphere of possibility.",
    description:
      "Beneath a golden atmospheric haze, rivers and lakes of methane and ethane shape an icy landscape. Titan is the only moon in our solar system with a thick atmosphere.",
    facts: [
      {
        label: "Mean radius · approximate",
        value: "2,575 km",
        source: "nasa-titan",
      },
      {
        label: "Orbital period",
        value: "15 days, 22 hours",
        source: "nasa-titan",
      },
      {
        label: "Distance from Saturn · approximate",
        value: "1.2 million km",
        source: "nasa-titan",
      },
      {
        label: "Surface temperature · approximate",
        value: "−179 °C",
        source: "nasa-titan",
      },
      {
        label: "Atmosphere · primary gas",
        value: "Nitrogen",
        source: "nasa-titan",
      },
    ],
    sources: [
      {
        id: "nasa-titan",
        title: "NASA Science · Titan facts",
        url: "https://science.nasa.gov/saturn/moons/titan/facts/",
      },
    ],
    texture: assetPath("/textures/titan.jpg"),
    accent: "#d9a45e",
  },
  enceladus: {
    id: "enceladus",
    name: "Enceladus",
    type: "Ocean moon",
    subtitle: "A small world. A hidden ocean.",
    description:
      "An icy shell conceals a global saltwater ocean. Jets of water vapor and ice escape through fractures near the south pole, supplying material to Saturn’s faint E ring.",
    facts: [
      {
        label: "Diameter · approximate",
        value: "500 km",
        source: "nasa-enceladus",
      },
      {
        label: "Orbital period",
        value: "32.9 hours",
        source: "nasa-enceladus",
      },
      {
        label: "Distance from Saturn · approximate",
        value: "238,000 km",
        source: "nasa-enceladus",
      },
      {
        label: "Surface temperature · approximate",
        value: "−201 °C",
        source: "nasa-enceladus",
      },
      {
        label: "Subsurface ocean",
        value: "Global saltwater ocean",
        source: "nasa-enceladus",
      },
    ],
    sources: [
      {
        id: "nasa-enceladus",
        title: "NASA Science · Enceladus",
        url: "https://science.nasa.gov/saturn/moons/enceladus/",
      },
    ],
    texture: assetPath("/textures/enceladus.jpg"),
    accent: "#cbd9dc",
  },
  rhea: {
    id: "rhea",
    name: "Rhea",
    type: "Icy moon",
    subtitle: "A record written in ice.",
    description:
      "Saturn’s second-largest moon preserves a heavily cratered landscape of ice and rock. Bright fracture walls cut across its ancient terrain; one hemisphere always faces Saturn.",
    facts: [
      { label: "Mean radius", value: "764 km", source: "nasa-rhea" },
      {
        label: "Orbital period · approximate",
        value: "4.5 Earth days",
        source: "nasa-rhea",
      },
      {
        label: "Distance from Saturn · approximate",
        value: "527,000 km",
        source: "nasa-rhea",
      },
      {
        label: "Sunlit temperature · approximate",
        value: "−174 °C",
        source: "nasa-rhea",
      },
      { label: "Discovery", value: "23 December 1672", source: "nasa-rhea" },
    ],
    sources: [
      {
        id: "nasa-rhea",
        title: "NASA Science · Rhea",
        url: "https://science.nasa.gov/saturn/moons/rhea/",
      },
    ],
    texture: assetPath("/textures/rhea.jpg"),
    accent: "#c9c6be",
  },
  moon: {
    id: "moon",
    name: "Moon",
    type: "Earth’s natural satellite",
    subtitle: "A real world beneath you.",
    description:
      "Earth’s Moon preserves a landscape of impact craters, volcanic plains and ancient highlands. Explore the measured relief of the Aristarchus region using lunar elevation observations.",
    facts: [
      {
        label: "Mean radius · approximate",
        value: "1,740 km",
        source: "nasa-moon",
      },
      {
        label: "Distance from Earth · average",
        value: "384,400 km",
        source: "nasa-moon",
      },
      {
        label: "Orbital period · approximate",
        value: "27 Earth days",
        source: "nasa-moon",
      },
      {
        label: "Surface gravity",
        value: "About 1/6 of Earth’s",
        source: "nasa-moon",
      },
      {
        label: "Atmosphere",
        value: "Very thin exosphere",
        source: "nasa-moon",
      },
    ],
    sources: [
      {
        id: "nasa-moon",
        title: "NASA Science · Moon facts",
        url: "https://science.nasa.gov/moon/facts/",
      },
      {
        id: "sldem",
        title: "NASA/GSFC · SLDEM2015 elevation",
        url: "https://pgda.gsfc.nasa.gov/products/54",
      },
      {
        id: "lroc-wac",
        title: "LROC · WAC morphology imagery",
        url: "https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_GLOBAL/",
      },
    ],
    texture: assetPath("/lunar/moon.jpg"),
    thumbnail: assetPath("/lunar/moon-thumb.jpg"),
    accent: "#c8ced1",
  },
};
