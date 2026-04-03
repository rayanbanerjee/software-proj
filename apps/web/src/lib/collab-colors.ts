const COLLABORATOR_PALETTE = [
  {
    key: "rose",
    ring: "#d85d66",
    fill: "rgba(216, 93, 102, 0.18)",
    text: "#8b2f35",
    soft: "rgba(216, 93, 102, 0.1)"
  },
  {
    key: "amber",
    ring: "#d5b231",
    fill: "rgba(213, 178, 49, 0.2)",
    text: "#8c7018",
    soft: "rgba(213, 178, 49, 0.1)"
  },
  {
    key: "green",
    ring: "#4ab36c",
    fill: "rgba(74, 179, 108, 0.18)",
    text: "#246d3d",
    soft: "rgba(74, 179, 108, 0.1)"
  },
  {
    key: "blue",
    ring: "#4f88d8",
    fill: "rgba(79, 136, 216, 0.18)",
    text: "#24518b",
    soft: "rgba(79, 136, 216, 0.1)"
  },
  {
    key: "violet",
    ring: "#8d75da",
    fill: "rgba(141, 117, 218, 0.18)",
    text: "#563d99",
    soft: "rgba(141, 117, 218, 0.1)"
  }
] as const;

export type CollaboratorColor = (typeof COLLABORATOR_PALETTE)[number];

function hashSeed(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 33 + seed.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function getCollaboratorColor(seed: string): CollaboratorColor {
  return COLLABORATOR_PALETTE[hashSeed(seed) % COLLABORATOR_PALETTE.length];
}

export function getCollaboratorColors(seeds: readonly string[]): CollaboratorColor[] {
  const normalizedSeeds = seeds.length > 0 ? seeds : ["local-user"];
  return normalizedSeeds.map((seed) => getCollaboratorColor(seed));
}
